
let _ = require('lodash');
let assert = require('assert');

let { Team } = require('../models');
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

let isWomenTeam = exports.isWomenTeam = async function(team) {
    return _.every(team.members, x => x.sex == '女');
}

let calcTeamMemberPoints = exports.calcTeamMemberPoints = async function(member) {
    let score = _.max([member.award_oi_points, member.award_acm_points, member.experiences_points]);
    if (member.sex == '女') score += config.WOMAN_POINTS;
    return score;
}

let calcTeamPoints = exports.calcTeamPoints = async function(team, members_points) {
    let score = 0;
    members_points = _.clone(members_points);
    members_points.sort((a, b) => b - a);
    console.log(members_points);
    for(let i = 0; i < members_points.length; i ++) {
        score += members_points[i]*config.TEAMMEMBER_COEFFS[members_points.length][i];
    }
    return _.round(score);
}

exports.calcStatusStatistics = async function() {
    let statistics = {};
    for(let status of ['all', 'none', 'accepted', 'rejected']) {
        let opt = {info_filled: true, points_filled: true};
        if (status != 'all') opt.team_status = status;
        let teams = await Team.find(opt);
        
        let info = {};
        info.teams_count = teams.length;
        info.members_count = _.sum(teams.map(x => x.members.length));
        info.each_teams_count = [0, 0, 0, 0];
        teams.forEach(x => info.each_teams_count[x.members.length] ++);

        statistics[status] = info;
    }
    return statistics;
}

exports.calcStatusTeams = async function(status) {
    let teams = await Team.find({info_filled: true, points_filled: true, team_status: status}).sort('-_id');
    for(let t of teams) {
        for(let m of t.members) {
            m.score = await calcTeamMemberPoints(m);
        }
        t.score = await calcTeamPoints(t, t.members.map(x => x.score));
    }
    teams.sort((a, b) => b.score - a.score);
    return teams;
}
