
let _ = require('lodash');
let request = require('superagent');

let { SMS } = require('../models');
let { MYSUBMAIL } = require('../config');

exports.SendSMS = async function(to, project, vars) {
    vars = vars || {};
    let res = await request
        .post('https://api.mysubmail.com/message/xsend.json')
        .type('form')
        .send({
            appid: MYSUBMAIL.APPID,
            to: to,
            project: project,
            vars: JSON.stringify(vars),
            signature: MYSUBMAIL.APPKEY
        })
        .retry(5)
        .timeout(10000);
    return res.body;
}

exports.sendVerifyCode = async function(target, code) {
    await SMS.create({
        to: target,
        project: MYSUBMAIL.VERIFY_CODE_PROJECT,
        vars: {
            code: code
        },
        priority: 10
    });
}
