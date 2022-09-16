const { app, BrowserWindow, Menu, Tray, Notification, 
    shell, ipcMain, globalShortcut, dialog, 
    desktopCapturer, nativeTheme, nativeImage } = require('electron');
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
        submenu: [
            {
                label: 'New Project',
                accelerator: 'Cmd+N',
                click: () => {
                    win.webContents.send('new-project-dialog', {  })
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

if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('fily', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('fily')
}


const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
            // 当运行第二个实例时,将会聚焦到myWindow这个窗口
            if (win) {
                if (win.isMinimized()) win.restore()
                win.focus()
            }
        })
        // app 启动创建窗口
    app.on('ready', createWindow);
}

app.on('open-url', (event, url) => {
    console.log('url=', url);
    projectName = url.substring(url.indexOf('//') + 2);
    console.log('projectName =', projectName);
    win.webContents.send('focus-on-project', {'projectName': projectName});
})

// 当全部窗口关闭时退出
app.on('window-all-closed', () => {
    console.log('所有窗口关闭')
    app.quit();
})

ipcMain.on('open-file-with-os-program', (event, data) => {
    if (data['_type'] && data['_type'] === 'explorer') {
        if (systemType === 'Window_NT') {
            exec('explorer.exe /select,' + data['_path'])
        } else if (systemType === 'Darwin') {
            shell.showItemInFolder(data['_path'])
        }
        
    } else {
        shell.openPath(data['_path'])
    }
    // exec('open "' + data['_path'] + '"')
})

ipcMain.on('change-view', (event, data) => {
    let view = data['_page'];
    if (!!view) {
        win.loadURL(view);
    } else {
        win.loadFile('./page/projectRelatedFiles.html')
    }
})

ipcMain.on('set-ignore-mouse-events', (event, ...args) => {
    BrowserWindow.fromWebContents(event.sender).setIgnoreMouseEvents(...args)
})

ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
})

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

ipcMain.on('show-notification', (event, data) => {
    const notification = {
        appId: "com.xuhang.electron.demo",
        icon: path.join(__dirname, './img/icon_512x512.png'),
        title: data.title || 'Fily 通知',
        body: data.message || data
    }
    new Notification(notification).show()
})


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


// 根据缩略图按钮切换图片
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
    win.webContents.send('update-gallery-image', { 'src': imgSrc })
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
        transparent: false, //是否透明
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    })
    remoteMain.initialize()
    remoteMain.enable(win.webContents);

    if (systemType === "Darwin") {
        app.dock.setIcon(path.join(__dirname, './img/icon_512x512.png'));
        // 设置Dock菜单
        const dockMenu = Menu.buildFromTemplate(dockMenuTempalte);
        app.dock.setMenu(dockMenu);
        // win.on('blur', function() {
        //     const badgeString = app.dock.getBadge();
        //     if (badgeString === '') {
        //         app.dock.setBadge('1');
        //     } else {
        //         app.docker.setBadge((parseInt(badgeString)+1).toString());
        //     }
        // });
    }

    // win.setIgnoreMouseEvents(true)
    // win.maximize()
    // win.setAlwaysOnTop(true, "floating");
    // win.setVisibleOnAllWorkspaces(true);

    // 读取注册表peopleId && 注册webim
    // webimReg(readPeopleId);

    // 加载页面3
    // win.loadFile('./page/projectRelatedFiles.html')
    win.loadFile('./page/projectRelatedFiles.html')

    // Windows 任务栏图标菜单
    // tray = new Tray(path.join(__dirname, "./img/fily.png"));
    const trayImage = nativeImage.createFromPath(path.join(__dirname, "./img/icons.iconset/file20Template.png"));
    trayImage.resize({ width: 16, height: 16 })
    trayImage.setTemplateImage(true);
    tray = new Tray(trayImage);
    const contextMenu = Menu.buildFromTemplate([
        { label: '退出', click: function() { app.quit() } }
    ])
    tray.setToolTip('Fily - File manager for you!')
    tray.setContextMenu(contextMenu)


    // WIN8 & WIN10 不支持原生window.Notification，调用第三方通知窗口
    // addNotificationListner();

    /* win.setThumbarButtons([
        {
            tooltip: 'button1',
            icon: path.join(__dirname, './img/music-room.png'),
            click() { console.log('button1 clicked') }
        }
    ]); */

    // win.setThumbnailToolTip('正在播放...');

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
    globalShortcut.register('Shift+I', () => {
        // 打开开发者工具 (开发者工具会影响窗口透明效果)
        win.webContents.toggleDevTools()
    });

    // 添加window关闭触发事件
    win.on('close', () => {
        win = null;
        app.quit();
    });

    win.setProgressBar(0.7);
}