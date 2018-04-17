
let mongoose = require('mongoose');
let _ = require('lodash');

// 短信
let smsSchema = new mongoose.Schema({

	to: {
		type: String,
		required: true
	},
	project: {
		type: String,
		required: true
	},
	vars: Object,

	priority: { // 优先级,数值越大优先级越高,即时类消息为10,推送消息为0
		type: Number,
		required: true,
		default: 0
	},
	has_sent: { // 是否已发送
		type: Boolean,
		required: true,
		default: false
	},
	send_api: String,
	sent_at: Date,
	sent_msg: String,

	created_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SMS", smsSchema);
