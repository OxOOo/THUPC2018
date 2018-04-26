
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let mzfs = require('mz/fs');
require('should');

let auth = require('../services/auth');
let tools = require('../services/tools');
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
