
// 网站

let _ = require('lodash');
let Koa = require('koa');
let Router = require('koa-router');
let render = require('./services/ejs_render');
let bodyParser = require('koa-bodyparser');
let path = require('path');
let session = require('koa-session');
let moment = require('moment');
let MarkdownIt = require('markdown-it');

let config = require('./config');
let { SERVER } = require('./config');
let auth = require('./services/auth');
let flash = require('./services/flash');

let app = new Koa();

app.use(bodyParser({
    formLimit: '10MB'
}));
render(app, {
    root: path.join(__dirname, '..', 'views'),
    layout: 'layout',
    viewExt: 'html',
    cache: false,
    debug: false
});
app.keys = [config.SERVER.SECRET_KEYS];
const CONFIG = {
    key: 'thupc2018:sess', /** (string) cookie key (default is koa:sess) */
    /** (number || 'session') maxAge in ms (default is 1 days) */
    /** 'session' will result in a cookie that expires when session/browser is closed */
    /** Warning: If a session cookie is stolen, this cookie will never expire */
    maxAge: 86400000,
    overwrite: true, /** (boolean) can overwrite or not (default true) */
    httpOnly: false, /** (boolean) httpOnly or not (default true) */
    signed: true, /** (boolean) signed or not (default true) */
    rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
    renew: false, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
};
app.use(session(CONFIG, app));

app.use(async (ctx, next) => {
    ctx.state.ip = ctx.headers['x-real-ip'] || ctx.ip;
    ctx.state._ = require('lodash');
    ctx.state.title = '报名网站';
    ctx.state.tab = 'none';
    ctx.state.md = new MarkdownIt({
        html: true,
    });
    ctx.state.hidden_phone_number = function(phone_number) {
        return phone_number.substr(0, 3) + "****" + phone_number.substr(7, 11);
    }
    ctx.state.format_date = function(date) {
        return moment(date).format('YYYY-MM-DD');
    }
    ctx.state.format_time = function(date) {
        return moment(date).format('HH:mm');
    }
    ctx.state.format_datetime = function(date) {
        return moment(date).format('YYYY-MM-DD HH:mm');
    }

    await next();
});

let router = new Router();

router.use(require('koa-logger')());
router.use(flash);
router.use(auth.userM);
router.use(auth.visit);

router.use('', require('./controllers/index').routes());
router.use('', require('./controllers/user').routes());
router.use('', require('./controllers/team').routes());
router.use('', require('./controllers/admin').routes());

app.use(router.routes());
app.use(require('koa-static')('public', {
    maxage: SERVER.MAXAGE
}));
app.use(async (ctx, next) => {
    await ctx.render('404', {layout: false});
});

app.listen(SERVER.PORT, SERVER.ADDRESS);

console.log(`listen on http://${SERVER.ADDRESS}:${SERVER.PORT}`);
