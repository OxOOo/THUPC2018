
let mongoose = require('mongoose');
let _ = require('lodash');

// 队伍
let teamSchema = new mongoose.Schema({

	info_filled: {
		type: Boolean,
		default: false
	},

	teamname: { // 队名
		type: String,
		maxlength: 20,
		match: /^\S(.*\S)?$/
	},
	enteamname: { // 英文队名
		type: String,
		maxlength: 30,
		match: /^[A-Za-z0-9]([A-Za-z0-9_ ]*[A-Za-z0-9])?$/
	},

	members: {
		default: [],
		type: [{
			name: {
				type: String,
				required: true,
				maxlength: 20
			},
			phone_number: {
				type: String,
				required: true,
				match: /^[1-9][0-9]{10}$/,
			},
			school: {
				type: String,
				required: true,
				maxlength: 100
			},
			grade: {
				type: String,
				required: true,
			},
			tshirt_size: {
				type: String,
				required: true
			},
			sex: {
				type: String,
				required: true
			},
			award_oi: {
				type: String,
				required: true
			},
			award_acm: {
				type: String,
				required: true
			},
			experiences: { // 竞赛经历
				type: String,
				maxlength: 4096
			},
		}]
	},

	created_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Team", teamSchema);
