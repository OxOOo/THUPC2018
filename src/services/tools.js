
let _ = require('lodash');
let assert = require('assert');

let config = require('../config');

exports.checkPhoneNumber = async function(phone_number) {
    assert(_.isString(phone_number), '电话号码必须是字符串');
    assert(/^[1-9][0-9]{10}$/.test(phone_number), '电话号码格式不正确');
}

exports.checkCtrlChar = async function(value) {
    assert(value == value.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/ug, ""), '不能含有控制字符');
}

exports.cleanTeamPoints = async function(team) {
    team.points_filled = false;
    team.team_status = 'none';
    for(let m of team.members) {
        m.award_oi_points = null;
        m.award_acm_points = null;
        m.experiences_points = null;
    }
    await team.save();
}

exports.calcTeamMemberPoints = async function(member) {
    let score = _.max([member.award_oi_points, member.award_acm_points, member.experiences_points]);
    if (member.sex == '女') score += config.WOMAN_POINTS;
    return score;
}

exports.calcTeamPoints = async function(team, members_points) {
    let score = 0;
    members_points = _.clone(members_points);
    members_points.sort((a, b) => b - a);
    console.log(members_points);
    for(let i = 0; i < members_points.length; i ++) {
        score += members_points[i]*config.TEAMMEMBER_COEFFS[members_points.length][i];
    }
    return _.round(score);
}
