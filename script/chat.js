const { ipcRenderer } = require('electron');
const remote = require('electron').remote || require('@electron/remote');
const { machineId, machineIdSync } = require('node-machine-id')
const { SDKAppID, PriKey, GROUP_ID } = require('../script/tim-config.js')
// const { multiavatar }  = require('@multiavatar/multiavatar')
var TLSSigAPIv2 = require('tls-sig-api-v2');
let macId = machineIdSync().substring(0, 6);
console.log("machine id = ", macId);
let svgCode = multiavatar(macId)
// console.log("svg code = ", svgCode);
var api = new TLSSigAPIv2.Api(SDKAppID, PriKey);
var sig = api.genSig(macId, 86400*180);
console.log(sig);
let lastShowTime = 0;


// SDK 进入 ready 状态时触发，接入侧监听此事件，然后可调用 SDK 发送消息等 API，使用 SDK 的各项功能
let onSdkReady = function(event) {
    console.log('chatting is ready...')
};

// SDK 收到推送的单聊、群聊、群提示、群系统通知的新消息，接入侧可通过遍历 event.data 获取消息列表数据并渲染到页面
let onMessageReceived = function(event) {
    // event.data - 存储 Message 对象的数组 - [Message]
    const messageList = event.data;
    messageList.forEach((message) => {
        console.log('收到消息⬅️：', message)
        if (message.type === TIM.TYPES.MSG_TEXT) {
            receive(message);
        // 文本消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.TextPayload
        } else if (message.type === TIM.TYPES.MSG_IMAGE) {
        // 图片消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.ImagePayload
        } else if (message.type === TIM.TYPES.MSG_SOUND) {
        // 音频消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.AudioPayload
        } else if (message.type === TIM.TYPES.MSG_VIDEO) {
        // 视频消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.VideoPayload
        } else if (message.type === TIM.TYPES.MSG_FILE) {
        // 文件消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.FilePayload
        } else if (message.type === TIM.TYPES.MSG_CUSTOM) {
        // 自定义消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.CustomPayload
        } else if (message.type === TIM.TYPES.MSG_MERGER) {
        // 合并消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.MergerPayload
        } else if (message.type === TIM.TYPES.MSG_LOCATION) {
        // 地理位置消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.LocationPayload
        } else if (message.type === TIM.TYPES.MSG_GRP_TIP) {
            groupTip(message)
        // 群提示消息 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.GroupTipPayload
        } else if (message.type === TIM.TYPES.MSG_GRP_SYS_NOTICE) {
        // 群系统通知 - https://web.sdk.qcloud.com/im/doc/zh-cn/Message.html#.GroupSystemNoticePayload
        }
});
    
};

// 网络状态发生改变
let onNetStateChange = function(event) {
    // v2.5.0 起支持
    // event.data.state 当前网络状态，枚举值及说明如下：
    // TIM.TYPES.NET_STATE_CONNECTED - 已接入网络
    // TIM.TYPES.NET_STATE_CONNECTING - 连接中。很可能遇到网络抖动，SDK 在重试。接入侧可根据此状态提示“当前网络不稳定”或“连接中”
    // TIM.TYPES.NET_STATE_DISCONNECTED - 未接入网络。接入侧可根据此状态提示“当前网络不可用”。SDK 仍会继续重试，若用户网络恢复，SDK 会自动同步消息
};

function groupTip(tip) {
    showTimeTag();
    if (tip.payload.groupJoinType === 1 && tip.payload.operationType === TIM.TYPES.GRP_TIP_MBR_JOIN) {
        console.log("有成员加入", tip.payload.operatorID)
    }
    let avatarCode = makeAvatar(tip.payload.operatorID);
    let item = document.createElement('div');
    item.className = 'item item-center';
    item.innerHTML = `<span><span>${avatarCode}</span> 加入群聊`;
    document.querySelector('.content').appendChild(item);
}

function sysNotice(notice) {
    showTimeTag();
}

function receive(msg) {
    // let senderAvatarUrl = `https://api.multiavatar.com/${msg.macId}.png`
    showTimeTag();
    let payload = msg.payload;
    let avatarCode = makeAvatar(msg.from || 'administrator')
    let item = document.createElement('div');
    item.className = 'item item-left';
    item.innerHTML = `<div class="avatar">${avatarCode}</div><div class="bubble bubble-left">${payload.text}</div>`;
    document.querySelector('.content').appendChild(item);
    document.querySelector('#textarea').value = '';
    document.querySelector('#textarea').focus();
    //滚动条置底
    let height = document.querySelector('.content').scrollHeight;
    document.querySelector(".content").scrollTop = height;
}

function makeAvatar(macId) {
    let svgCode = multiavatar(macId)
    return svgCode;
}

function showTimeTag() {
    let now = new Date();
    if (now.getTime() - lastShowTime >= 10 * 60 * 1000) {
        let item = document.createElement('div');
        item.className = 'item item-center';
        item.innerHTML = `<span>${now.getHours()}:${now.getMinutes()}</span>`;
        document.querySelector('.content').appendChild(item);
        lastShowTime = now.getTime();
    }
}

(function() {
    const TransparencyMouseFix = require('electron-transparency-mouse-fix')
    const fix = new TransparencyMouseFix({
        electronWindow: remote.getCurrentWindow(),
        log: false,
        fixPointerEvents: 'auto'
    });
    document.body.onmousemove = function (e) {
        document.body.className = "click-through";
        document.body.onmousemove = undefined;
    };
    setTimeout(function(){
        document.body.className = "click-through";
        document.body.onmousemove = undefined;
    }, 1000)
    function pauseEvent(e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
        e.cancelBubble = true;
        e.returnValue = false;
        return false;
    }
    window.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'I') {
            remote.getCurrentWindow().toggleDevTools();
        }
    })

    console.log('TIM = ', TIM)
    let options = { 
        SDKAppID: 1400741410
    }
    // 创建 SDK 实例，`TIM.create()`方法对于同一个 `SDKAppID` 只会返回同一份实例
    let tim = TIM.create(options); // SDK 实例通常用 tim 表示

    // 设置 SDK 日志输出级别，详细分级请参见 <a href="https://web.sdk.qcloud.com/im/doc/zh-cn/SDK.html#setLogLevel">setLogLevel 接口的说明</a>
    tim.setLogLevel(1); // 普通级别，日志量较多，接入时建议使用

    let userOptions = { 
        userID: macId,
        userSig: sig
    }
    let joinGroupOptions = {
        groupID: GROUP_ID,
        applyMessage: 'applier ' + macId
    }

    tim.on(TIM.EVENT.SDK_READY, onSdkReady);

    tim.on(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceived);

    tim.on(TIM.EVENT.NET_STATE_CHANGE, onNetStateChange);

    tim.login(userOptions)
        .then(function(imResponse) {
            console.log('登录成功', imResponse.data); // 登录成功
            tim.joinGroup(joinGroupOptions); // 加群
            // tim.getMessageList({
            //     conversationID: 'GROUP$'+GROUP_ID
            // }).then(function(imResponse){
            //     const messageList = imResponse.data.messageList; // 消息列表。
            //     messageList.forEach((message) => {
            //         receive(message);
            //     })
            // })
            if (imResponse.data.repeatLogin === true) {
            // 标识帐号已登录，本次登录操作为重复登录。v2.5.1 起支持
            console.log(imResponse.data.errorInfo);
            }
        }).catch(function(imError) {
            console.warn('login error:', imError); // 登录失败的相关信息
        });

    window.send = function(){
        let content = document.querySelector('#textarea').value;
        if(!content){
            alert('请输入内容');
            return ;
        }
        let item = document.createElement('div');
        item.className = 'item item-right';
        item.innerHTML = `<div class="bubble bubble-right">${content}</div><div class="avatar">${svgCode}</div>`;
        document.querySelector('.content').appendChild(item);
        document.querySelector('#textarea').value = '';
        document.querySelector('#textarea').focus();
        //滚动条置底
        let height = document.querySelector('.content').scrollHeight;
        document.querySelector(".content").scrollTop = height;
    
        let msgOption = { 
            to: GROUP_ID,
            conversationType: TIM.TYPES.CONV_GROUP,
            payload: {
                text: content,
                macId: macId
            }
        }
        let timMessage = tim.createTextMessage(msgOption)
        console.log('发送消息➡️：', timMessage)
        tim.sendMessage(timMessage).then(function(imResponse) {
            // 发送成功
            console.log(imResponse);
            }).catch(function(imError) {
            // 发送失败
            console.warn('sendMessage error:', imError);
            });
    
    }
})(TIM)