
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let mzfs = require('mz/fs');
require('should');

const router = module.exports = new Router();

router.get('/ping', async ctx => {
    await ctx.render("pong");
});
