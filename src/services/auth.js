
let _ = require('lodash');
let utils = require('utility');
let { User, Team, Visit } = require('../models');
let { log } = require('../config');
require('should');

const ERR_CODE = 978;

exports.visit = async function (ctx, next) {
    try {
        await Visit.create({url: ctx.url, ip: ctx.state.ip, method: ctx.method});
    } catch(e) {
        console.error('Error on visit');
        console.error(e);
    }
    await next();
}

/// 用户中间件
/// 检查用户是否已经登录，查询数据库并放在ctx.state.user变量上
let userM = exports.userM = async function (ctx, next) {
	let user_id = ctx.session.user_id;
    ctx.state.user = null;
    ctx.state.team = null;
    
	if (user_id) {
        ctx.state.user = await User.findById(user_id);
        if (ctx.state.user) ctx.state.team = await Team.findById(ctx.state.user.team_id);
        console.log(ctx.state.team);
	}

	try {
		await next();
	} catch(e) {
        ctx.state.flash.error = e.message;
        await ctx.redirect(e._redirect_url || 'back');
        if (e.status != ERR_CODE) {
            console.error(e);
        }
	}
}

let assert = exports.assert = function (condition, msg, redirect_url) {
    msg.should.be.a.String();

	if (!condition) {
		let err = new Error(msg);
        err.status = ERR_CODE;
        err._redirect_url = redirect_url;
		throw err;
	}
}

exports.login = async function(ctx, user_id) {
    ctx.session.user_id = user_id;
}

// 登出
exports.logout = async function (ctx) {
	ctx.session.user_id = null;
}

exports.register = async function (ctx, phone_number, password) {
    assert(!await User.findOne({phone_number}), '用户已存在');

    let user = new User();
    let team = new Team();
    user.phone_number = phone_number;
    user.password = password;
    user.team_id = team._id;

    await team.save();
    await user.save();

    ctx.session.user_id = user._id;
	ctx.state.user = user;
}

exports.modify = async function (ctx, phone_number, password) {
    let user = await User.findOne({phone_number});
    assert(user, '用户不存在');

    user.password = password;

    await user.save();

    ctx.session.user_id = user._id;
	ctx.state.user = user;
}

/// 需用户登录
exports.loginRequired = async function (ctx, next) {
    ctx.session.login_redirect_url = ctx.url;
    assert(ctx.state.user, '尚未登录', '/login');
	await next();
}

/// 需管理员权限
exports.adminRequired = async function (ctx, next) {
    ctx.session.login_redirect_url = ctx.url;
    assert(ctx.state.user, '尚未登录', '/login');
    assert(ctx.state.user.is_admin, '没有管理员权限');
    ctx.session.login_redirect_url = null;
	await next();
}
