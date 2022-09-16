const { clear } = require('console');
const { ipcRenderer } = require('electron');
const remote = require('electron').remote || require('@electron/remote');
const fs = require('fs');
const path = require('path');

ipcRenderer.on('new-project-dialog', (event, data) => {
    showCreateProjectDialog();
})

ipcRenderer.on('focus-on-project', (event, data) => {
    focusProject(data['projectName']);
})


let currentProject = undefined;
// 项目列表
$('.projlist ul').on('click', 'li', function(e) {
    $('.projlist ul li').each(
        function(idx, ele) {
            $(ele).removeClass('active');
        });
    $(this).addClass('active');
    currentProject = $(this).text();
    listProjectFiles(currentProject);
    $('#projectTitle').text('─' + currentProject.substr(0, 10));
    document.title = 'Fily -' + currentProject
        // updateFileItems()
});

$('.projlist ul').on('contextmenu', 'li', function(e) {
    const that = this;
    let menu = remote.Menu.buildFromTemplate([{
        label: '导出(未实现)',
        click: () => {}
    }, {
        label: '重命名',
        click: (e) => {
            let projectName = $(this).text().trim();
            $('#projectName').val(projectName);
            $('#oldProjectName').val(projectName);
            $('#createProject .btn-success').removeClass('create');
            $('#createProject .btn-success').addClass('update');
            $('#createProject').css('display', 'block');
        }
    }, {
        label: '删除',
        click: () => {
            let projectName = $(this).text().trim();
            let delVal = confirm('确定删除项目 ' + projectName + ' 吗？')
            if (delVal) {
                deleteProject(projectName);
                window.document.location.reload();
            }
        }
    }]);
    menu.popup(remote.getCurrentWindow())
});

// 列出项目下的文件
function listProjectFiles(projectName) {
    $('.projitems .item-wrapper').remove();
    let project = getProjectByProjectName(projectName);
    if (project && project.projectFiles && project.projectFiles.length > 0) {
        for (let i = 0; i < project.projectFiles.length; i++) {
            addFileItem(project.projectFiles[i]);
        }
    }
}


// 修改备注按钮
$('.projitems').on('click', '.glyphicon-comment', function(e) {
    let parentDiv = $(this).parents('.item-wrapper');
    let commentBox = parentDiv.children('.comment-box');
    let heightPx = '0px';
    if (!!commentBox && commentBox.length > 0) { // 备注已存在
        if (commentBox.is(":visible")) {
            heightPx = '0px';
        } else {
            heightPx = '100px';
        }
    } else {
        commentBox = $('<textarea></textarea>').addClass('comment-box');
        parentDiv.append(commentBox);
        heightPx = '100px'
    }
    commentBox.animate({
        style: 'marginBottom',
        easing: 'swing',
        height: heightPx
    }, 500, function() {
        if (heightPx === '0px') {
            commentBox.css('display', 'none');
        }
    })
});

$('.projitems').on('keyup', '.comment-box', function(e) {
    let content = $(this).val();
    let filename = $(this).parents('.item-wrapper').find('.filename').text().trim();
    saveComment(filename, content);
    if (!content || content.trim() === '') {
        $(this).parents('.item-wrapper').find('.glyphicon-comment').removeClass('locked');
    } else {
        $(this).parents('.item-wrapper').find('.glyphicon-comment').addClass('locked');
    }
});

let saveCommentTimeout;

function saveComment(filename, content) {
    if (saveCommentTimeout) {
        clearTimeout(saveCommentTimeout);
    }
    saveCommentTimeout = setTimeout(() => {
        saveFileComment(currentProject, filename, content);
    }, 1000)
}

// 打开文件按钮
$('.projitems').on('click', '.glyphicon-play', function(e) {
    let filepath = $(this).parents('.file-item').find('.abspath').text()
    ipcRenderer.send('open-file-with-os-program', { '_path': filepath });
});

// 删除按钮
$('.projitems').on('click', '.glyphicon-trash', function(e) {
    if ($(this).siblings('.glyphicon-pushpin').hasClass('locked')) {
        alert('该文件已上锁，请先解锁！📌');
        return;
    }
    let conVal = confirm('确定删除文件吗？【不删除真实文件】')
    if (conVal) {
        let wrapper = $(this).parents('.item-wrapper');
        let filename = wrapper.find('.filename').text().trim();
        deleteProjectFile(currentProject, filename);
        wrapper.remove();
        ipcRenderer.send('show-notification', {'title': '删除成功', 'message': filename+' 文件已删除'});
    }
})

// pin按钮
$('.projitems').on('click', '.glyphicon-pushpin', function(e) {
    let $wrapper = $(this).parents('.item-wrapper');
    let filename = $wrapper.find('.filename').text().trim();
    if ($(this).hasClass('locked')) {
        $(this).removeClass('locked');
        $wrapper.prop('style', '');
        changeFilePinStatus(currentProject, filename, 0);
    } else {
        $(this).addClass('locked');
        $wrapper.prop('style', 'border-color: #03b500');
        changeFilePinStatus(currentProject, filename, 1);
    }
})

// 打开文件夹按钮
$('.projitems').on('click', '.glyphicon-folder-open', function(e) {
    let filepath = $(this).parents('.file-item').find('.abspath').text();
    // let sepIndex = filepath.lastIndexOf("\\")
    // let dir = filepath.substring(0, sepIndex);
    ipcRenderer.send('open-file-with-os-program', { '_path': filepath, '_type': 'explorer' });
})


// 导入文件按钮组
$('.modalBox .cancel').on('click', function() {
    $('.modalBox').css('display', 'none')
    toggleClass(0)
    clearAllFiles();
});

$('.modalBox').on('click', '.update', function() {
    let oldProjectName = $('#oldProjectName').val().trim();
    let projectName = $('#projectName').val().trim();
    addProject(projectName, 2, oldProjectName);
    toggleClass(0)
    ipcRenderer.send('show-notification', {'title': '更新成功', 'message': projectName+' 项目已更新'});
});

$('.modalBox').on('click', '.create', function() {
    let projectName = $('#projectName').val().trim();
    addProject(projectName, 1);
    toggleClass(0)
    ipcRenderer.send('show-notification', {'title': '创建成功', 'message': projectName+' 项目已创建'});
});



// 导入已选文件
$('.modalBox .import').on('click', function() {
    let tableRows = $('#importFiles table tr');
    let count = 0;
    for (let i = 1; i < tableRows.length; i++) {
        if ($(tableRows[i]).find('input')[0].checked) {
            let chosenFilename = $(tableRows[i]).find('input').val();
            colFiles.forEach((ele, idx, arr) => {
                if (ele.filename === chosenFilename) {
                    addFileItem(ele);
                    addProjectFile(currentProject, ele);
                    count++;
                }
            });
        }
    }
    $('.modalBox').css('display', 'none')
    toggleClass(0)
    clearAllFiles();
    ipcRenderer.send('show-notification', {'title': '导入成功', 'message': count + ' 个文件已导入'});
});

$(function() {
    let projects = listAllProjects();
    for (let p of projects) {
        addProject(p.projectName, 0);
    }
})

// 根据后缀名多选或取消多选
$('#importFiles .import-ctrl-btn').on('click', '.btn-ext-filter', function() {
    let $ele = $(this);
    let ext = $ele.text();
    let filterFiles = colExtensions[ext];
    if ($ele.hasClass('btn-default')) {
        console.log(filterFiles);
        toggleSelect(filterFiles, true);
        $ele.removeClass('btn-default')
        $ele.addClass('btn-primary')
    } else {
        toggleSelect(filterFiles, false);
        $ele.removeClass('btn-primary')
        $ele.addClass('btn-default')
    }
})

function toggleSelect(filterFiles, flag) {
    let tableRows = $('#importFiles table tr')
    for (let i = 1; i < tableRows.length; i++) {
        let rowFilename = $(tableRows[i]).find('.filename').text();
        let fileHit = filterFiles.some((ele, idx, files) => {
            return ele.filename == rowFilename;
        });
        if (fileHit) {
            $(tableRows[i]).find('input').prop('checked', !!flag);
        }
    }
}

// 拖拽文件事件
let dropwrapper = document.getElementsByClassName('main-container')[0]
dropwrapper.addEventListener('drop', (e) => {
    e.preventDefault()
    if (!currentProject) {
        alert('您当前未选中任何项目！');
        toggleClass(0);
        return;
    }
    let tableRows = $('#importFiles table tr')
    for (let i = 1; i < tableRows.length; i++) {
        $(tableRows[i]).remove();
    }
    const files = e.dataTransfer.files;
    let project = getProjectByProjectName(currentProject);
    let exsitedFilenames = [];
    if (project && project.projectFiles && project.projectFiles.length > 0) {
        for (let i = 0; i < project.projectFiles.length; i++) {
            exsitedFilenames.push(project.projectFiles[i].filename);
        }
    }

    if (files.length == 1 && fs.lstatSync(files[0].path).isFile()) {
        let fileinfo = parsrFilePath(files[0].path)
        if (exsitedFilenames.indexOf(fileinfo.filename) >= 0) {
            alert(fileinfo.filename + "文件已存在")
        } else {
            addFileItem(fileinfo);
            addProjectFile(currentProject, parsrFilePath(files[0].path))
        }
    } else {
        let duplicate = 0;
        let duplicateFile;
        for (let i = 0; i < files.length; i++) {
            /* if (files[i].type === "") {
                addImportItems(parsrFilePath(files[i].path));
            } else {
                addImportItem(parsrFilePath(files[i].path));
            } */

            let fileinfo = parsrFilePath(files[i].path)
            if (exsitedFilenames.indexOf(fileinfo.filename) >= 0) {
                duplicate++;
                duplicateFile = duplicateFile || fileinfo.filename;
                continue;
            }

            let resolvedPaths = new Array();
            parsePath(files[i].path, resolvedPaths);
            addImportItems(resolvedPaths);
        }

        if (duplicate > 0) {
            alert(duplicateFile + (duplicate > 1 ? '等' + duplicate + '个' : '') + '文件已存在')
        }

        for (let k of Object.keys(colExtensions)) {
            $('#importFiles .import-ctrl-btn').prepend($(`<button type="button" class="btn btn-default btn-ext-filter">${k}</button>`))
        }
        $('#importFiles').css('display', 'block')
    }
    toggleClass(0);
})

dropwrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    console.log('over')
    toggleClass(1)
})

dropwrapper.addEventListener('dragenter', (e) => {
    e.preventDefault();
    console.log('enter')
        // toggleClass(1)
})

dropwrapper.addEventListener('dragleave', (e) => {
    e.preventDefault();
    console.log('leav')
    toggleClass(0)
})

let removeTimeout;

function toggleClass(t) {
    if (t === 1) {
        if (removeTimeout) {
            clearTimeout(removeTimeout)
        }
        $('.main-container').addClass('mio-modal-mask')
    } else {
        removeTimeout = setTimeout(() => {
            $('.main-container').removeClass('mio-modal-mask')
        }, 300)
    }
}

// 添加文件
function addFileItem(data) {
    let extensionIcon = extensionToIcon[data.extension];
    if (!extensionIcon) {
        extensionIcon = extensionToIcon['default'];
    }
    let timeago = ago(getDate(data.createTime))
    let html = `
        <div class="item-wrapper" ${data.pin && data.pin == 1 ? 'style="border-color: #03b500;"' : ''}>
            <div class="file-item">
                <span class="file-info">
                <span class="filename"><i class="fa fa-${extensionIcon} fa-lg"></i> ${data.filename}</span>
                <span class="create_time">${timeago}</span>
                <span class="hidden abspath">${data.abspath}</span>
                </span>
                <span class="file-ctrl">
                <span class="glyphicon glyphicon-trash" aria-hidden="true"></span>
                <span class="glyphicon glyphicon-comment ${data.comment ? 'locked' : ''}" aria-hidden="true"></span>
                <span class="glyphicon glyphicon-pushpin ${data.pin && data.pin == 1 ? 'locked' : ''}" aria-hidden="true"></span>
                <span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span>
                <span class="glyphicon glyphicon-play" aria-hidden="true"></span>
                </span>
            </div>
            <textarea class="comment-box" style="display: none;" >${data.comment ? data.comment : ''}</textarea>
        </div>
    `;

    $('.projitems').append($(html));
}


// 新建项目
function showCreateProjectDialog(projectName) {
    $('#projectName').val(!!projectName ? projectName : '');
    $('#createProject').css('display', 'block')
    $('#createProject .btn-success').removeClass('update');
    $('#createProject .btn-success').addClass('create');
}

function addProject(projectName, flag, oldName) {
    let $html = $(`<li><a href="javascript:void(0)"><i class="fa fa-tag fa-lg"></i>${projectName}</a></li>`);
    if (flag == 0 || flag == 1) {
        $('.projlist ul').append($html);
    }
    if (flag == 1) {
        $html.click();
        $('#projectName').val('');
        $('#createProject').css('display', 'none')
        saveProject(projectName);
    }
    if (flag == 2) {
        updateProjectName(oldName, projectName);
        window.location.reload();
    }
}

// 添加待导入的文件
let colExtensions = {};
let colFiles = [];

function addImportItem(data) {
    let html = `
        <tr class="import-file-item">
            <td style="width: 10%;"><input type="checkbox" value="${data.filename}" /></td>
            <td class="filename">${data.filename}</td>
        </tr>
    `;
    colFiles.push(data);
    $('table tr:last-child').after($(html));
}

function addImportItems(data) {
    for (let d of data) {
        addImportItem(d);
        if (d.extension in colExtensions) {
            colExtensions[d.extension].push(d);
        } else {
            colExtensions[d.extension] = [d];
        }
    }
}

function focusProject(projectName) {
    $('.projlist ul li').each(
        function(idx, ele) {
            if ($(ele).text() === projectName) {
                $(ele).click();
            }
        });
}

function clearAllFiles() {
    colExtensions = {};
    colFiles = [];
    if ($('.btn-ext-filter').length > 0) {
        $('.btn-ext-filter').remove();
    }
}

function parsrFilePath(filepath) {
    let filename = path.basename(filepath);
    let abspath = path.resolve(filepath);
    let extension = path.extname(filepath).substring(1);
    let createTime = dateFtt("yyyy-MM-dd hh:mm:ss", new Date());
    return { filename, abspath, extension, createTime };
}

function parsePath(filepath, resolvedPaths) {
    let stat = fs.lstatSync(filepath);
    if (path.basename(filepath).indexOf('.') === 0) {
        return;
    }
    if (stat.isFile()) {
        resolvedPaths.push(parsrFilePath(filepath))
    } else {
        for (let subPath of fs.readdirSync(filepath)) {
            parsePath(path.resolve(filepath, subPath), resolvedPaths);
        }
    }
}

function dateFtt(fmt, date) { //author: meizz 
    var o = {
        "M+": date.getMonth() + 1, //月份 
        "d+": date.getDate(), //日 
        "h+": date.getHours(), //小时 
        "m+": date.getMinutes(), //分 
        "s+": date.getSeconds(), //秒 
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
        "S": date.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

function getDate(strDate) {
    var st = strDate;
    var a = st.split(" ");
    var b = a[0].split("-");
    var c = a[1].split(":");
    var date = new Date(b[0], b[1] - 1, b[2], c[0], c[1], c[2]);
    return date;
}

function ago(time) {
    var ago, curTime, diff, int;
    time = unify(time);
    int = parseInt;
    curTime = +new Date();
    diff = curTime - time;
    ago = "";
    if (1000 * 60 > diff) {
        ago = "刚刚";
    } else if (1000 * 60 <= diff && 1000 * 60 * 60 > diff) {
        ago = int(diff / (1000 * 60)) + "分钟前";
    } else if (1000 * 60 * 60 <= diff && 1000 * 60 * 60 * 24 > diff) {
        ago = int(diff / (1000 * 60 * 60)) + "小时前";
    } else if (1000 * 60 * 60 * 24 <= diff && 1000 * 60 * 60 * 24 * 30 > diff) {
        ago = int(diff / (1000 * 60 * 60 * 24)) + "天前";
    } else if (1000 * 60 * 60 * 24 * 30 <= diff && 1000 * 60 * 60 * 24 * 30 * 12 > diff) {
        ago = int(diff / (1000 * 60 * 60 * 24 * 30)) + "月前";
    } else {
        ago = int(diff / (1000 * 60 * 60 * 24 * 30 * 12)) + "年前";
    }
    return ago;
}

function unify(time) {
    time -= 0;
    if (("" + time).length === 10) {
        time *= 1000;
    }
    return time;
};