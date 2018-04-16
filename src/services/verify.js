// 验证码相关

let _ = require('lodash');
let auth = require('./auth');
let utils = require('utility');
let moment = require('moment');
let { VerifyCode } = require('../models');

exports.sendCode = async function(target) {
    auth.assert(_.isString(target) && target.length > 0, '无法发送验证码');
    let last_code = await VerifyCode.findOne({target}).sort('-_id');
    auth.assert(!last_code || moment(last_code.created_date).add(moment.duration(30, 's')).isBefore(moment()), '30秒中内只能发送一次验证码');

    let code = '000000'; // FIXME
    await VerifyCode.create({target, code});
}

exports.verify = async function(target, code) {
    let last_code = await VerifyCode.findOne({target}).sort('-_id');
    auth.assert(last_code, '验证码不正确');
    auth.assert(moment(last_code.created_date).add(moment.duration(3, 'm')).isAfter(moment()), '验证码已过期');
    auth.assert(last_code.code == code, '验证码不正确');
}
