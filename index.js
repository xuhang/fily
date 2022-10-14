const { app, BrowserWindow, Menu, Tray, Notification, 
    shell, ipcMain, globalShortcut, dialog, screen,
    desktopCapturer, nativeImage } = require('electron');
const path = require('path');
const child_process = require('child_process')
const fs = require('fs');
const os = require('os');
const remoteMain = require('@electron/remote/main')


let win
let exec = child_process.exec;
const systemType = os.type();

// 菜单模版
const appMenuTemplate = [
    {
        label: 'Projects',
        submenu: [ // 子菜单
            {
                label: 'New Project', // 显示名称
                accelerator: 'Cmd+N', // 快捷键
                click: () => {
                    win.webContents.send('new-project-dialog', {  }) // 事件
                }
            }, {
                label: 'Rename Project'
            }, {
                label: 'Delete Project'
            }, {
                type: 'separator'
            }, {
                label: 'Archive'
            }
        ]
    }, {
        label: 'Files',
        submenu: [
            {
                label: 'Import File'
            }, {
                label: 'Import Folder'
            }
        ]
    }
]

// macOS上Dock菜单
const dockMenuTempalte = [
    {
        label: 'New Window',
        click () {
            console.log('New Window');
        }
    }, {
        label: 'New Window with Settings',
        submenu: [
            { label: 'Basic' },
            { label: 'Pro' }
        ]
    },
    {
        label: 'New Command...'
    }
];
// 


if (systemType === 'Darwin') {
    appMenuTemplate.unshift({
        label: app.getName(),
        submenu: [
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    });
}


// 禁用HTTP缓存，需在ready事件之前
app.commandLine.appendSwitch('--disable-http-cache')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// 绑定自定义协议。 注：MacOS和Linux下，自定义协议只有在打包之后才会生效，在开发模式下通过命令行启动不会生效。
app.removeAsDefaultProtocolClient('fily')
if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('fily', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('fily')
}

// 单实例运行
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
            // 当运行第二个实例时,将会聚焦到myWindow这个窗口
            if (win) {
                if (win.isMinimized()) win.restore()
                win.focus()
                // windows上自定义协议是通过第二个实例启动的
                if (systemType === 'Windows_NT') {
                    let lastCommand = commandLine[commandLine.length - 1];
                    if (lastCommand.indexOf('fily://') == 0) {
                        openUrl(lastCommand)
                    }
                }
            }
        })
        // app 启动创建窗口
    app.on('ready', createWindow);
}

// 自定义协议事件处理回调
app.on('open-url', (event, url) => {
    console.log('url=', url);
    openUrl(url)
})

// 当全部窗口关闭事件触发时退出
app.on('window-all-closed', () => {
    console.log('所有窗口关闭')
    app.quit();
})

// 使用系统默认应用打开文件
ipcMain.on('open-file-with-os-program', (event, data) => {
    if (data['_type'] && data['_type'] === 'explorer') { // 文件夹
        if (systemType === 'Windows_NT') {
            exec('explorer.exe /select,' + data['_path'])
        } else if (systemType === 'Darwin') {
            shell.showItemInFolder(data['_path'])
        }
        
    } else { // 文件
        shell.openPath(data['_path'])
    }
    // exec('open "' + data['_path'] + '"')
})

// 打开指定页面
ipcMain.on('change-view', (event, data) => {
    let view = data['_page'];
    if (!!view) {
        win.loadURL(view);
    } else {
        win.loadFile('./page/projectRelatedFiles.html')
    }
})

// ipcMain.on('set-ignore-mouse-events', (event, ...args) => {
//     BrowserWindow.fromWebContents(event.sender).setIgnoreMouseEvents(...args)
// })

// 聊天窗口
let chatWindow
ipcMain.on('load-chat-room', () => {
    let scrWid = screen.getPrimaryDisplay().workAreaSize.width;
    let scrHit = screen.getPrimaryDisplay().workAreaSize.height;
    if (!!chatWindow) {
        return
    }
    chatWindow = new BrowserWindow({
        x: scrWid - 400,
        y: 0,
        width: 400,
        height: screen.getPrimaryDisplay().workAreaSize.height, 
        titleBarStyle: 'customButtonsOnHover',
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        frame: false, // 是否有边框
        resizable: false,        // 是否可调整大小
        transparent: true, //是否透明
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    })
    chatWindow.loadFile('./page/chat.html')
    // win.maximize()
    // chatWindow.webContents.toggleDevTools()
    chatWindow.setAlwaysOnTop(true, 'screen-saver')
    // chatWindow.setIgnoreMouseEvents(true)
    remoteMain.enable(chatWindow.webContents);

    chatWindow.on('close', () => {
        chatWindow.destroy();
        chatWindow = null;
    });
});

// 窗口控制事件
ipcMain.on('window-ctrl', (event, data) => {
    let opt = data['_op'];
    switch (opt) {
        case 'minimize':
            win.minimize();
            break;
        case 'restore':
            if (win.isMaximized()) {
                win.restore();
            } else {
                win.maximize();
            }
            break;
    }
})

// 消息通知事件
ipcMain.on('show-notification', (event, data) => {
    const notification = {
        appId: "com.xuhang.electron.demo",
        icon: path.join(__dirname, './img/icon_512x512.png'),
        title: data.title || 'Fily 通知',
        body: data.message || data
    }
    new Notification(notification).show()
})

// 关闭窗口事件
ipcMain.on('close-window', (event, data) => {
    console.log('closing window ' + data['_src']);

    if (!Notification.isSupported()) {
        console.log('当前系统不支持通知');
    }
    app.setAppUserModelId("我的Electorn示例")
    const notification = {
        appId: "com.xuhang.electron.demo",
        icon: path.join(__dirname, './img/icon_512x512.png'),
        title: '正在关闭……',
        body: 'Bye ヾ(•ω•`)o'
    }
    new Notification(notification).show()

    setTimeout(() => {
        console.log('fily is exiting ...')
        app.quit();
    }, 1000);

});


// 根据缩略图按钮切换项目
let thumbImageIndex = 1;
const thumbImagePath = path.join(__dirname, './resource/pics')

function switchThumbImage(delta) {
    let imgs = fs.readdirSync(thumbImagePath);
    let newIndex = thumbImageIndex + delta
    if (newIndex < 1) {
        newIndex = newIndex + imgs.length;
    }
    if (newIndex > imgs.length) {
        newIndex = newIndex - imgs.length
    }
    thumbImageIndex = newIndex;
    let imgSrc = path.join(thumbImagePath, thumbImageIndex + ".jpeg");
    // 主进程主动向渲染进程发送消息
    // win.webContents.send('update-gallery-image', { 'src': imgSrc })
    win.webContents.send('show-next-project', { 'src': imgSrc })
}

function createWindow() {
    // 读取package.json文件中的属性
    var package = require('./package.json')
    console.log('starting ' + package.name + ' ' + package.version)

    const filter = {
            // urls: ['file://*.qq.com/*']
        }
        /* session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
            console.log(details);
            callback({url: url.replace('file:', 'https:')})
        }) */

    // 隐藏菜单 Menu.setApplicationMenu(null)
    const appMenu = Menu.buildFromTemplate(appMenuTemplate);
    Menu.setApplicationMenu(appMenu)

    // 创建浏览器窗口并设置宽高
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'customButtonsOnHover',
        icon: __dirname + './img/fily.png',
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        frame: false, // 是否有边框
        // resizable: true,        // 是否可调整大小
        transparent: true, //是否透明
        webPreferences: {
            nodeIntegration: true, // 允许html页面上的javascipt代码访问nodejs 环境api代码的能力（与node集成的意思）
            enableRemoteModule: true, // 在渲染进程中使用remote模块，在高版本Electorn中还需要安装@electron/remote模块，然后调用initialize()和enable()方法。
            contextIsolation: false, // 阻止网站访问 Electron 的内部组件 和 预加载脚本可访问的高等级权限的API。禁用：网页js可以访问preload脚步的window全局对象；启用：无法访问全局window对象，通过contextBridge暴露的才能访问。
            preload: path.join(__dirname, '/script/preload.js')
        }
    })
    remoteMain.initialize()
    remoteMain.enable(win.webContents);

    if (systemType === "Darwin") {
        // macOS 上Dock图标
        app.dock.setIcon(path.join(__dirname, './img/icon_512x512.png'));
        // 设置Dock菜单
        const dockMenu = Menu.buildFromTemplate(dockMenuTempalte);
        app.dock.setMenu(dockMenu);
        // macOS 上Dock图标上显示数字小红点
        win.on('blur', function() {
            const badgeString = app.dock.getBadge();
            if (badgeString === '') {
                app.dock.setBadge('1');
            } else {
                app.dock.setBadge((parseInt(badgeString)+1).toString());
            }
            // Dock 图标跳动一次
            app.dock.bounce('informational');
        });
    }
    // 加载要现实点页面
    win.loadFile('./page/projectRelatedFiles.html')

    // 任务栏图标菜单 windows在右下角，macOS在右上角
    // tray = new Tray(path.join(__dirname, "./img/fily.png"));
    const trayImage = nativeImage.createFromPath(path.join(__dirname, "./img/icons.iconset/file20Template.png"));
    trayImage.resize({ width: 16, height: 16 })
    trayImage.setTemplateImage(true);
    tray = new Tray(trayImage);
    // 任务栏图标的右键菜单
    const contextMenu = Menu.buildFromTemplate([
        { label: '退出', click: function() { app.quit() } }
    ])
    // 任务栏图标的鼠标hover提示
    tray.setToolTip('Fily - File manager for you!')
    tray.setContextMenu(contextMenu)

    // 预览窗口功能，only windows
    win.setThumbarButtons([{
        tooltip: '上一张',
        icon: path.join(__dirname, './resource/icos/pre.ico'),
        click() { switchThumbImage(-1) }
    }, {
        tooltip: '下一张',
        icon: path.join(__dirname, './resource/icos/next.ico'),
        click() { switchThumbImage(1) }
    }])

    // win.setAlwaysOnTop(true, 'screen-saver');
    // 全局快捷键
    globalShortcut.register('Ctrl+W', () => {
        win = null;
        app.quit();
    });
    // globalShortcut.register('Ctrl+Shift+I', () => {
        // 打开开发者工具
        // win.webContents.toggleDevTools()
    // })
    
    // 添加window关闭触发事件
    win.on('close', () => {
        win = null;
        app.quit();
    });

    // 图标上显示进度条
    win.setProgressBar(0.7);
}

function openUrl(url) {
    projectName = url.substring(url.indexOf('//') + 2);
    if (projectName.indexOf('/') === projectName.length - 1) {
        projectName = projectName.substring(0, projectName.length - 1);
    }
    console.log('projectName =', projectName);
    win.webContents.send('focus-on-project', {'projectName': projectName});
}