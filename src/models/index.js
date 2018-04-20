
let mongoose = require('mongoose');
let config = require('../config');

mongoose.Promise = global.Promise;

let User = exports.User = require('./user');
let Team = exports.Team = require('./team');
let Visit = exports.Visit = require('./visit');
let VerifyCode = exports.VerifyCode = require('./verify_code');
let SMS = exports.SMS = require('./sms');

mongoose.connect(config.MONGODB_URL, {
}, function (err) {
	if (err) {
		console.error('connect to %s error: ', config.MONGODB_URL, err.message);
		process.exit(1);
	}
});
