
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let mzfs = require('mz/fs');
require('should');

let auth = require('../services/auth');
let tools = require('../services/tools');
let config = require('../config');
let { User, Team, SMS } = require('../models');

const router = module.exports = new Router();

// 后台
router.get('/admin', auth.adminRequired, async ctx => {
    await ctx.render("admin/index", {layout: 'admin/layout'});
});

// 用户相关
router.get('/admin/su', auth.adminRequired, async ctx => {
    await ctx.render("admin/su", {layout: 'admin/layout'});
});

router.post('/admin/su', auth.adminRequired, async ctx => {
    let phone_number = ctx.request.body.phone_number;
    let user = await User.findOne({phone_number: phone_number});
    await auth.assert(user, '用户不存在');
    await auth.login(ctx, user._id);
    await ctx.redirect('/');
});

router.get('/admin/users', auth.adminRequired, async ctx => {
    let users = await User.find().sort('-_id');
    await ctx.render("admin/users", {layout: 'admin/layout', users: users});
});

// 队伍相关
router.get('/admin/teams', auth.adminRequired, async ctx => {
    let teams = await Team.find({info_filled: true}).sort('-_id');
    let teams_count = teams.length;
    let members_count = _.sum(teams.map(x => x.members.length));
    let each_teams_count = [0, 0, 0, 0];
    teams.forEach(x => each_teams_count[x.members.length] ++);
    await ctx.render("admin/teams", {
        layout: 'admin/layout',
        teams: teams,
        teams_count: teams_count, members_count: members_count, each_teams_count: each_teams_count
    });
});
router.get('/admin/teams_points', auth.adminRequired, async ctx => {
    let teams = await Team.find({info_filled: true}).sort('-_id');
    await ctx.render("admin/teams_points", {
        layout: 'admin/layout',
        teams: teams
    });
});
router.get('/admin/teams_status_all', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('all');
    if (ctx.query.reverse) teams = _.reverse(teams);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'all'
    });
});
router.get('/admin/teams_status_none', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('none');
    if (ctx.query.reverse) teams = _.reverse(teams);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'none'
    });
});
router.get('/admin/teams_status_accepted', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('accepted');
    if (ctx.query.reverse) teams = _.reverse(teams);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'accepted'
    });
});
router.get('/admin/teams_status_rejected', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('rejected');
    if (ctx.query.reverse) teams = _.reverse(teams);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'rejected'
    });
});
router.get('/admin/teams/:team_id/status/:status', auth.adminRequired, async ctx => {
    let team = await Team.findById(ctx.params.team_id);
    auth.assert(team, '队伍不存在');
    team.team_status = ctx.params.status;
    await team.save();
    ctx.state.flash.success = '操作成功';
    await ctx.redirect('back');
});
router.get('/admin/teammember_points', auth.adminRequired, async ctx => {
    let m = null;
    if (ctx.query.team_id && ctx.query.member_id) {
        let team = await Team.findById(ctx.query.team_id);
        auth.assert(team, '队伍不存在');
        m = team.members.id(ctx.query.member_id);
        auth.assert(m, '成员不存在');
        m.team = team;
    } else {
        let teams = await Team.find({info_filled: true, points_filled: false}).sort('_id').limit(10);
        auth.assert(teams.length, '没有待评分的队伍');
        let members = [];
        for(let t of teams) {
            for(let m of t.members) {
                if (m.experiences_points) continue;
                let obj = {};
                obj = m;
                obj.team = t;
                members.push(obj);
            }
        }
        auth.assert(members.length, '成员列表为空');
        m = _.sample(members);
    }

    await ctx.render("admin/teammember_points", {
        layout: 'admin/layout',
        m: m
    });
});
router.post('/admin/teammember_points', auth.adminRequired, async ctx => {
    let experiences_points = ctx.request.body.experiences_points;
    let team_id = ctx.request.body.team_id;
    let member_id = ctx.request.body.member_id;
    auth.assert(experiences_points, '错误1');
    auth.assert(team_id, '错误2');
    auth.assert(member_id, '错误3');

    let team = await Team.findById(team_id);
    auth.assert(team, "队伍不正确");
    let member = team.members.id(member_id);
    auth.assert(member, "成员不正确");

    const OI_POINTS = config.OI_POINTS;
    const ACM_POINTS = config.ACM_POINTS;
    for(let m of team.members) {
        m.experiences_points = m.experiences_points || null;
        m.award_oi_points = m.award_oi_points || null;
        m.award_acm_points = m.award_acm_points || null;
    }

    member.experiences_points = experiences_points;
    auth.assert(_.includes(_.keys(OI_POINTS), member.award_oi), '错误4');
    member.award_oi_points = OI_POINTS[member.award_oi];
    auth.assert(_.includes(_.keys(ACM_POINTS), member.award_acm), '错误5');
    member.award_acm_points = ACM_POINTS[member.award_acm];

    team.points_filled = _.every(team.members, x => x.experiences_points);

    await team.save();

    await ctx.redirect('/admin/teammember_points');
});

// 短信相关
router.get('/admin/sms', auth.adminRequired, async ctx => {
    await ctx.render("admin/sms", {layout: 'admin/layout'});
});
router.get('/admin/sms_data', auth.adminRequired, async ctx => {
    try {
        let limit = ctx.query.limit || 10;
        let page = ctx.query.page || 1;
        let count = await SMS.count();
        let data = await SMS.find({}).limit(limit).skip(limit*page-limit).sort('-_id');
        ctx.body = {
            code: 0,
            count: count,
            data: data.map(x => {
                let o = _.pick(x, ['to', 'project', 'priority', 'has_sent', 'send_api', 'sent_msg']);
                o.vars = JSON.stringify(x.vars);
                o.sent_at = ctx.state.format_datetime(x.sent_at);
                o.created_date = ctx.state.format_datetime(x.created_date);
                return o;
            })
        }
    } catch(e) {
        ctx.body = {
            code: 1,
            msg: e.message,
        }
    }
});
router.get('/admin/create_sms', auth.adminRequired, async ctx => {
    await ctx.render("admin/create_sms", {layout: 'admin/layout'});
});
router.post('/admin/create_sms', auth.adminRequired, async ctx => {
    let tasks = JSON.parse(ctx.request.body.sms_json);
    auth.assert(_.isArray(tasks), "参数错误1");
    for(let t of tasks) {
        auth.assert(t.to, "参数错误2");
        await tools.checkPhoneNumber(t.to);
        auth.assert(t.project && _.isString(t.project), "参数错误3");
        auth.assert(t.vars && _.isObject(t.vars), "参数错误4");
        auth.assert(_.isNumber(t.priority), "参数错误5");
    }
    for(let t of tasks) {
        let sms = new SMS();
        _.assign(sms, _.pick(t, ['to', 'project', 'vars', 'priority']));
        await sms.save();
    }
    ctx.state.flash.success = '创建成功';
    await ctx.redirect('back');
});
