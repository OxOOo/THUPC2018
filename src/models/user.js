
let mongoose = require('mongoose');
let _ = require('lodash');

// 用户
let userSchema = new mongoose.Schema({

	phone_number: {
		type: String,
		required: true,
		unique: true,
		index: true,
		match: /^[1-9][0-9]{10}$/,
	},
	password: {
		type: String,
		required: true
	},

	is_admin: { // 是否管理员
		type: Boolean,
		required: true,
		default: false
	},

	olcontest_register: {
		type: Boolean,
		default: false
	},
	olcontest_username: String,
	olcontest_password: String,

	team_id: {
		type: mongoose.Schema.ObjectId,
		ref: 'Team',
		required: true
	},

	created_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
