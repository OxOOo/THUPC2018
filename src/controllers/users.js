
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let utils = require('utility');
let qs = require('querystring');
require('should');

let config = require('../config');
let { User } = require('../models');
let auth = require('../services/auth');
let verify = require('../services/verify');
let tools = require('../services/tools');

const router = module.exports = new Router();

// 发送验证码
router.post('/send_verify_code', async (ctx, next) => {
    try {
        ctx.request.body.should.have.property('phone_number').a.String().and.not.eql('', '没有电话号码');
        let phone_number = ctx.request.body.phone_number;
        
        await tools.checkPhoneNumber(phone_number);
        await verify.sendCode(phone_number);
        ctx.body = {
            success: 1,
            msg: '发送成功'
        }
    } catch(e) {
        ctx.body = {
            success: 0,
            msg: e.message
        }
    }
});

// 检查验证码
router.post('/check_verify_code', async (ctx, next) => {
    try {
        ctx.request.body.should.have.property('phone_number').a.String().and.not.eql('', '没有电话号码');
        ctx.request.body.should.have.property('verify_code').a.String().and.not.eql('', '没有验证码');
        let phone_number = ctx.request.body.phone_number;
        let verify_code = ctx.request.body.verify_code;
        
        await tools.checkPhoneNumber(phone_number);
        await verify.verify(phone_number, verify_code);
        ctx.body = {
            success: 1,
            msg: '验证成功'
        }
    } catch(e) {
        ctx.body = {
            success: 0,
            msg: e.message
        }
    }
});

// 注册
router.get('/register', async (ctx, next) => {
    await ctx.render("register", {title: "注册"});
});
router.post('/register', async (ctx, next) => {
    ctx.request.body.should.have.property('phone_number').a.String().and.not.eql("","请填写电话号码");
    ctx.request.body.should.have.property('verify_code').a.String().and.not.eql("","请填写验证码");
    ctx.request.body.should.have.property('password').a.String().and.not.eql('', '请填写密码');
    let phone_number = ctx.request.body.phone_number;
    let verify_code = ctx.request.body.verify_code;
    let password = ctx.request.body.password;

    await tools.checkPhoneNumber(phone_number);
    await verify.verify(phone_number, verify_code);
    await auth.register(ctx, phone_number, password);
    ctx.state.flash.success = '注册成功';
    await ctx.redirect('/');
});
// 忘记密码
router.get('/forgot', async (ctx, next) => {
    await ctx.render("forgot", {title: '忘记密码'});
});
router.post('/forgot', async (ctx, next) => {
    ctx.request.body.should.have.property('phone_number').a.String().and.not.eql("","请填写电话号码");
    ctx.request.body.should.have.property('verify_code').a.String().and.not.eql("","请填写验证码");
    ctx.request.body.should.have.property('password').a.String().and.not.eql('', '请填写密码');
    let phone_number = ctx.request.body.phone_number;
    let verify_code = ctx.request.body.verify_code;
    let password = ctx.request.body.password;

    await tools.checkPhoneNumber(phone_number);
    await verify.verify(phone_number, verify_code);
    await auth.modify(ctx, phone_number, password);
    ctx.state.flash.success = '修改成功';
    await ctx.redirect('/');
});
// 修改密码
router.get('/modify', auth.loginRequired, async (ctx, next) => {
    await ctx.render("modify", {title: '修改密码'});
});
router.post('/modify', auth.loginRequired, async (ctx, next) => {
    ctx.request.body.should.have.property('verify_code').a.String().and.not.eql("","请填写电话号码");
    ctx.request.body.should.have.property('password').a.String().and.not.eql('', '请填写密码');
    let phone_number = ctx.state.user.phone_number;
    let verify_code = ctx.request.body.verify_code;
    let password = ctx.request.body.password;

    await tools.checkPhoneNumber(phone_number);
    await verify.verify(phone_number, verify_code);
    await auth.modify(ctx, phone_number, password);
    ctx.state.flash.success = '修改成功';
    await ctx.redirect('/');
});

// 登录
router.get('/login', async (ctx, next) => {
    await ctx.render("login", {title: '登录'});
});
router.post('/login', async (ctx, next) => {
    ctx.request.body.phone_number.should.be.a.String().and.not.eql("","请填写电话号码");
    ctx.request.body.password.should.be.a.String().and.not.eql("","请填写密码");
    let phone_number = ctx.request.body.phone_number;
    let password = ctx.request.body.password;
    
    let user = await User.findOne({phone_number});
    auth.assert(user, '用户不存在');
    auth.assert(user.password == password, '密码不正确');
    await auth.login(ctx, user._id);
    ctx.state.flash.success = '登录成功';
    await ctx.redirect('/');
});

router.get('/logout', async (ctx, next) => {
    await auth.logout(ctx);
    ctx.state.flash.success = '登出成功';
    await ctx.redirect('/');
});
