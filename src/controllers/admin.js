
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let mzfs = require('mz/fs');
let qs = require('querystring');
let iconv = require('iconv-lite');
require('should');

let auth = require('../services/auth');
let tools = require('../services/tools');
let config = require('../config');
let { User, Team, SMS } = require('../models');

const router = module.exports = new Router();

// 后台
router.get('/admin', auth.adminRequired, async ctx => {
    let user_count = await User.count();
    let olcontest_count = await User.find({olcontest_register: true}).count();
    await ctx.render("admin/index", {
        layout: 'admin/layout',
        user_count: user_count,
        olcontest_count: olcontest_count
    });
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
    let accepted_teams = await tools.calcStatusTeams('accepted');
    let accepted_schools = accepted_teams.filter(t => _.every(t.members, m => m.school == t.members[0].school)).map(t => t.members[0].school);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'all',
        accepted_schools: accepted_schools
    });
});
router.get('/admin/teams_status_none', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('none');
    if (ctx.query.reverse) teams = _.reverse(teams);
    let accepted_teams = await tools.calcStatusTeams('accepted');
    let accepted_schools = accepted_teams.filter(t => _.every(t.members, m => m.school == t.members[0].school)).map(t => t.members[0].school);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'none',
        accepted_schools: accepted_schools
    });
});
router.get('/admin/teams_status_accepted', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('accepted');
    if (ctx.query.reverse) teams = _.reverse(teams);
    let accepted_teams = await tools.calcStatusTeams('accepted');
    let accepted_schools = accepted_teams.filter(t => _.every(t.members, m => m.school == t.members[0].school)).map(t => t.members[0].school);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'accepted',
        accepted_schools: accepted_schools
    });
});
router.get('/admin/teams_status_rejected', auth.adminRequired, async ctx => {
    let statistics = await tools.calcStatusStatistics();

    let teams = await tools.calcStatusTeams('rejected');
    if (ctx.query.reverse) teams = _.reverse(teams);
    let accepted_teams = await tools.calcStatusTeams('accepted');
    let accepted_schools = accepted_teams.filter(t => _.every(t.members, m => m.school == t.members[0].school)).map(t => t.members[0].school);

    await ctx.render("admin/teams_status", {
        layout: 'admin/layout',
        teams: teams, statistics: statistics,
        status: 'rejected',
        accepted_schools: accepted_schools
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

// 下载
router.get('/admin/download_accepted_teams', auth.adminRequired, async ctx => {
    let teams = await Team.find({team_status: 'accepted'});

    let lines = [];
    lines.push(['队名', '英文队名', '姓名', '电话号码', '学校', '年级', '衣服尺寸', '性别']);
    for(let t of teams) {
        for(let m of t.members) {
            lines.push([t.teamname, t.enteamname, m.name, m.phone_number, m.school, m.grade, m.tshirt_size, m.sex]);
        }
    }

    ctx.set("Content-Disposition", `attachment; filename=${qs.escape('已通过的队伍名单')}.csv`);
    lines = lines.map(line => {
        line.map(x => {
            if (x.indexOf(',') != -1) x = x.replace(',', ' 、');
            return x;
        });
        return line;
    });
    let content = lines.map(x => {return x.join(',')}).join('\n');
    if (ctx.request.query.encoding) {
        content = iconv.encode(content, ctx.request.query.encoding);
    }
    ctx.body = content;
});
router.get('/admin/download_accepted_teams_award', auth.adminRequired, async ctx => {
    let teams = await Team.find({team_status: 'accepted'});

    let lines = [];
    lines.push(['队名', '英文队名', '姓名', '电话号码', '学校', '年级', '衣服尺寸', '性别', 'OI奖项', 'ACM奖项', '竞赛经历']);
    for(let t of teams) {
        for(let m of t.members) {
            lines.push([t.teamname, t.enteamname, m.name, m.phone_number, m.school, m.grade, m.tshirt_size, m.sex, m.award_oi, m.award_acm, m.experiences]);
        }
    }

    ctx.set("Content-Disposition", `attachment; filename=${qs.escape('已通过的队伍名单带获奖信息')}.csv`);
    lines = lines.map(line => {
        line.map(x => {
            if (x.indexOf(',') != -1) x = x.replace(',', ' 、');
            return x;
        });
        return line;
    });
    let content = lines.map(x => {return x.join(',')}).join('\n');
    if (ctx.request.query.encoding) {
        content = iconv.encode(content, ctx.request.query.encoding);
    }
    ctx.body = content;
});

// 网络赛
router.get('/admin/download_olcontest_accounts', auth.adminRequired, async ctx => {
    let users = await User.find({olcontest_register: true});

    let lines = [];
    for(let u of users) {
        lines.push(u.phone_number);
    }

    ctx.set("Content-Disposition", `attachment; filename=${qs.escape('网络赛报名名单')}.txt`);
    let content = lines.join('\n');
    ctx.body = content;
});
router.get('/admin/update_olcontest_accounts', auth.adminRequired, async ctx => {
    await ctx.render('admin/update_olcontest_accounts', {
        layout: 'admin/layout',
    });
});
router.post('/admin/update_olcontest_accounts', auth.adminRequired, async ctx => {
    let accounts = JSON.parse(ctx.request.body.accounts_json);
    await User.update({}, {$set: {olcontest_username: null, olcontest_password: null}}, {upsert: false, multi: true});

    let warning = null;
    for(let a of accounts) {
        let u = await User.findOne({phone_number: a.phone_number});
        if (!u) {
            warning = `${a.phone_number}用户不存在`;
            continue;
        }
        u.olcontest_username = a.olcontest_username;
        u.olcontest_password = a.olcontest_password;
        await u.save();
        if (!u.olcontest_register) {
            warning = `${a.phone_number}并没有报名网络赛`;
        }
    }
    if (warning) {
        ctx.state.flash.warning = warning;
    } else {
        ctx.state.flash.success = '修改成功';
    }
    await ctx.redirect('back');
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
