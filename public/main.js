
// 发送验证码
function registerSendVerifyCodeBtn(ebtn, ephone) {
    ebtn = $(ebtn);
    ephone = $(ephone);

    var old_str = ebtn.text();
    var is_running = false;
    ebtn.click(function(e) {
        e.preventDefault();

        if (is_running) return;
        var phone_number = ephone.val();
        if (!/^[1-9][0-9]{10}$/.test(phone_number)) {
            layui.layer.alert(`[${phone_number}]不是一个合法的电话号码`, {title: '错误'});
            return;
        }
        $.post('/send_verify_code', {
            phone_number: phone_number
        }, function(data) {
            if (is_running) return;
            if (data.success) {
                is_running = true;

                var startTime = Date.now();
                var endTime = Date.now() + 30*1000;
                layui.util.countdown(endTime, startTime, function(date, serverTime, timer){
                    var str = date[3] + '秒';
                    ebtn.text(str);
                    if (date[3] == 0) {
                        ebtn.text(old_str);
                        is_running = false;
                    }
                });
            } else {
                layui.layer.alert(data.msg, {title: '错误'});
            }
        });
    });
}

// 检测验证码
function registerCheckVerifyCode(ecode, ephone) {
    ecode = $(ecode);
    ephone = $(ephone);

    ecode.keydown(function() {
        ecode.removeClass('success');
        ecode.removeClass('failed');
    });

    var request_id = 0;
    ecode.keyup(_.debounce(function() {
        var this_id = ++ request_id;
        let code = ecode.val();
        let phone_number = ephone.val();
        $.post('/check_verify_code', {
            phone_number: phone_number,
            verify_code: code
        }, function(data) {
            if (request_id != this_id) return;
            if (data.success) {
                ecode.addClass('success');
                ecode.removeClass('failed');
            } else {
                ecode.addClass('failed');
                ecode.removeClass('success');
            }
        });
    }, 300));
}

// 添加自定义验证
layui.form.verify({
    repassword: function(value, item) { // 重新输入密码
        var match = $($(item).attr('data-match'));
        if (value != match.val()) {
            return '两次输入的密码不相同';
        }
    },
    nosidespace: function(value) { // 两边不能头空格
        if (_.trim(value) != value) {
            return '不能以空白字符开始或结尾';
        }
    },
    noctrlchar: function(value) {
        if (!_.isString(value) || value.length == 0) return;
        var ovalue = _.cloneDeep(value);
        value = value.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/ug, "");
        if (value != ovalue) {
            return '不能有控制字符';
        }
    },
    teamname: function(value) { // 中文队名
        if (value.length > 20) {
            return '中文队名长度不能超过20';
        }
        if (!/^\S(.*\S)?$/.test(value)) {
            return '中文队名非法';
        }
    },
    enteamname: function(value) { // 英文队名
        if (value.length > 30) {
            return '英文队名长度不能超过30';
        }
        if (!/^[a-zA-Z0-9_ ]+$/.test(value)) {
            return '只能包含字母/数字/下划线和空格';
        }
        if (!/^[A-Za-z0-9]([A-Za-z0-9_ ]*[A-Za-z0-9])?$/.test(value)) {
            return '不能以下划线开始或结束';
        }
    }
});

// 必须在ms时间之后才调用func
function mustAfter(func, ms) {
    var end_time = Date.now() + ms;
    return function() {
        var args = _.toArray(arguments);
        setTimeout(function() {
            func.apply(window, args);
        }, Math.max(10, end_time - Date.now()));
    }
}
