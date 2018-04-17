
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let mzfs = require('mz/fs');
require('should');

const router = module.exports = new Router();

let { Team } = require('../models');
let auth = require('../services/auth');
let tools = require('../services/tools');

router.get('/myteam', auth.loginRequired, async ctx => {
    await ctx.render("myteam", {title: '我的队伍'});
});

router.get('/myteam_modify', auth.loginRequired, async ctx => {
    await ctx.render("myteam_modify", {title: '修改队伍'});
});

router.get('/myteam_info', auth.loginRequired, async ctx => {
    let team = await Team.findById(ctx.state.user.team_id);
    auth.assert(team, '未知错误');
    ctx.body = _.pick(team, ['teamname', 'enteamname', 'members', 'experiences']);
});

router.post('/myteam_update', auth.loginRequired, async ctx => {
    let team = await Team.findById(ctx.state.user.team_id);
    auth.assert(team, '未知错误');

    try {
        ctx.request.body.should.have.property('teamname').a.String().and.not.eql('', '没有中文队名');
        ctx.request.body.should.have.property('enteamname').a.String().and.not.eql('', '没有英文队名');
        ctx.request.body.should.have.property('experiences').a.String();
        let teamname = ctx.request.body.teamname;
        let enteamname = ctx.request.body.enteamname;
        let experiences = ctx.request.body.experiences || '';
        auth.assert(teamname.length <= 20, '中文队名长度不能超过20');
        auth.assert(_.trim(teamname) == teamname, '中文队名不能以空白字符开始或结尾');
        auth.assert(enteamname.length <= 30, '英文队名长度不能超过30');
        auth.assert(_.trim(enteamname) == enteamname, '英文队名不能以空白字符开始或结尾');
        auth.assert(/^[a-zA-Z0-9_ ]+$/.test(enteamname), '英文队名只能包含字母/数字/下划线和空格');
        auth.assert(_.isString(experiences), '没有竞赛经历');
        auth.assert(experiences.length <= 4096, '竞赛经历太长');

        let members = ctx.request.body.members || [];
        auth.assert(_.isArray(members), '格式不正确');
        auth.assert(members.length >= 1, '至少一个队员');
        auth.assert(members.length <= 3, '最多三个队员');
        for(let m of members) {
            auth.assert(1 <= m.name.length, '姓名太短');
            auth.assert(m.name.length <= 50, '姓名太长');
            await tools.checkPhoneNumber(m.phone_number);
            auth.assert(1 <= m.school.length, '缺少学校');
            auth.assert(m.school.length <= 100, '学校名称太长');
            auth.assert(_.includes(['初中', '高中', '大一', '大二', '大三', '大四', '研究生', '其他'], m.grade), '年级不正确');
            auth.assert(_.includes(['S', 'M', 'L', 'XL', 'XXL', 'XXXL'], m.tshirt_size), '衣服尺寸不正确');
            auth.assert(_.includes(['男', '女', '保密'], m.sex), '性别不正确');
        };

        team.teamname = teamname;
        team.enteamname = enteamname;
        team.experiences = experiences;
        team.members = members;
        team.info_filled = true;
        await team.save();

        ctx.body = {
            success: 1
        }
    } catch(e) {
        ctx.body = {
            success: 0,
            msg: e.message
        }
    }
});
