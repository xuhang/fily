const { ipcRenderer } = require('electron');
const fs = require('fs');


let i = 24494512;

function nextImg() {
    if (i >= 24494659) {
        return;
    }
    let imgsrc = './resource/pics/472801/' + (i++) + '.dcm.jpeg';
    ctimg.src = imgsrc
    setTimeout(nextImg, 1000);
}

setTimeout(nextImg, 3000);

// 最小化事件
let minBtn = document.getElementById('minimize_btn');
minBtn.addEventListener('click', () => {
    console.log('最小化窗口');
    ipcRenderer.send('window-ctrl', { '_src': 'from index.html minimize span', '_op': 'minimize' })
});

// 重置窗口事件
let restoreBtn = document.getElementById('restore_btn');
restoreBtn.addEventListener('click', () => {
    console.log('================================')
    ipcRenderer.send('window-ctrl', { '_src': 'from index.html restore span', '_op': 'restore' })
})


// 关闭按钮事件
let closeBtn = document.getElementById('close_btn');
closeBtn.addEventListener('click', function() {
    console.log('clicking the close');
    ipcRenderer.send('close-window', { '_src': 'from index.html close span' });
});

// H5通知事件
let notifyBtn = document.getElementById('notify_btn');
notifyBtn.addEventListener('click', function() {
    console.log('clicking the notify');
    const myNotification = new window.Notification('Title', {
        body: 'Lorem Ipsum Dolor Sit Amet',
        icon: './img/icon.ico'
    })

});

// 用系统默认程序打开PDF
let btn_1 = document.getElementById('openPdfFile');
btn_1.addEventListener('click', function() {
    ipcRenderer.send('open-file-with-os-program', { '_path': 'C:\\Users\\xuhang\\Downloads\\Documents\\GeekTimePdfs\\Java并发编程实战' });
});

// 切换视图
let btn_2 = document.getElementById('changeView');
btn_2.addEventListener('click', () => {
    ipcRenderer.send('change-view', {});
});

// 拖拽文件事件
let dropwrapper = document.getElementById('file_drop_area')
dropwrapper.addEventListener('drop', (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files;
    if (files) {
        console.log('path', files[0].path)
        let spliterDot = files[0].path.lastIndexOf(".")
        let extension = files[0].path.substring(spliterDot + 1);

        if (radioExtensions.indexOf(extension.toLowerCase()) >= 0) {
            playMusic(files[0].path)
        } else {
            displayFile(files[0].path)
        }
    }
})


let displayFile = (path) => {
    const content = fs.readFileSync(path)
    console.log('content', content.toString())
    document.getElementById('content_display').innerHTML = '<pre>' + content.toString() + '</pre>';
}

let radio;
let playMusic = (path) => {
    // let radio = document.getElementById('music_radio');
    // radio.src = path;
    if (!!radio) {
        radio.pause();
    }
    radio = new Audio(path);
    radio.play();
}

dropwrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
})


ipcRenderer.on('update-gallery-image', (event, message) => {
    document.getElementById('gallery_image').setAttribute('src', message['src']);
})