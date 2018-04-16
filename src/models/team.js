
let mongoose = require('mongoose');
let _ = require('lodash');

// 队伍
let teamSchema = new mongoose.Schema({

	teamname: String,

	created_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Team", teamSchema);
