
let Router = require('koa-router');
let _ = require('lodash');
let path = require('path');
let mzfs = require('mz/fs');
require('should');

const router = module.exports = new Router();

router.get('/', async ctx => {
    let content = await mzfs.readFile(path.join(__dirname, '..', '..', 'docs', 'logs.md'), 'utf-8');
    await ctx.render("index", {tab: 'index', logs_content: content});
});

router.get('/info', async ctx => {
    let content = await mzfs.readFile(path.join(__dirname, '..', '..', 'docs', 'info.md'), 'utf-8');
    await ctx.render('markdown', {tab: 'info', content: content});
});

router.get('/ranklist', async ctx => {
    let content = await mzfs.readFile(path.join(__dirname, '..', '..', 'docs', 'ranklist.md'), 'utf-8');
    await ctx.render('markdown', {tab: 'info', content: content});
});

router.get('/logs', async ctx => {
    let content = await mzfs.readFile(path.join(__dirname, '..', '..', 'docs', 'logs.md'), 'utf-8');
    await ctx.render('markdown', {tab: 'info', content: content});
});

router.get('/faq', async ctx => {
    let content = await mzfs.readFile(path.join(__dirname, '..', '..', 'docs', 'faq.md'), 'utf-8');
    await ctx.render('markdown', {tab: 'info', content: content});
});

router.get('/ping', async ctx => {
    await ctx.render("pong", {title: 'pong'});
});
