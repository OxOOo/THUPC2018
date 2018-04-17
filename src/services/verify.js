// 验证码相关

let _ = require('lodash');
let assert = require('assert');
let utils = require('utility');
let moment = require('moment');
let { VerifyCode } = require('../models');

let sms_srv = require('./sms');

exports.sendCode = async function(target) {
    assert(_.isString(target) && target.length > 0, '无法发送验证码');
    let last_code = await VerifyCode.findOne({target}).sort('-_id');
    assert(!last_code || moment(last_code.created_date).add(moment.duration(30, 's')).isBefore(moment()), '30秒中内只能发送一次验证码');

    let code = utils.randomString(6, '1234567890');
    await VerifyCode.create({target, code});
    await sms_srv.sendVerifyCode(target, code);
}

exports.verify = async function(target, code) {
    let last_code = await VerifyCode.findOne({target}).sort('-_id');
    assert(last_code, '验证码不正确');
    assert(moment(last_code.created_date).add(moment.duration(3, 'm')).isAfter(moment()), '验证码已过期');
    assert(last_code.code == code, '验证码不正确');
}
