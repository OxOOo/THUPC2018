
let _ = require('lodash');
let assert = require('assert');

exports.checkPhoneNumber = async function(phone_number) {
    assert(_.isString(phone_number), '电话号码必须是字符串');
    assert(/^[1-9][0-9]{10}$/.test(phone_number), '电话号码格式不正确');
}

exports.checkCtrlChar = async function(value) {
    assert(value == value.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/ug, ""), '不能含有控制字符');
}
