// 守护

let { SMS } = require('./models');

let sms_srv = require('./services/sms');
let config = require('./config');

function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

// 发送短信
let sending = false;
async function SendSMS() {
    if (sending) return;

    sending = true;
    try {
        console.log('running SendSMS()');

        while(true)
        {
            let task = await SMS.findOne({has_sent: false}).sort('-priority');
            if (!task) break;

            task.has_sent = true;
            task.send_api = 'MYSUBMAILv1';
            task.sent_at = new Date();
            task.sent_msg = JSON.stringify(await sms_srv.SendSMS(task.to, task.project, task.vars));

            await task.save();
        }
    } catch(e) {
        sending = false;
        throw e;
    }
    sending = false;
}

async function run(func) {
    try {
        await func();
    } catch(e) {
        console.error(e);
    }
}

setInterval(run, 1000, SendSMS); // 每1s检查一次
