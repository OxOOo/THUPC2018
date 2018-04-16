
let mongoose = require('mongoose');
let _ = require('lodash');

// 验证码
let verifyCodeSchema = new mongoose.Schema({
	
	target: {
		type: String,
		required: true,
		index: true
	},
	code: {
		type: String,
		required: true
	},

	created_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("VerifyCode", verifyCodeSchema);
