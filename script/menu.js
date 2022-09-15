const { remote } = require('electron');

let contextMenuTemplate = [{
    label: '归档',
    click: () => {}
}, {
    label: '重命名',
    click: (e) => {
        let projectName = $(this).text().trim();
        showCreateProjectDialog(projectName);
    }
}, {
    label: '删除',
    click: () => {}
}]

let contextMenu = remote.Menu.buildFromTemplate(contextMenuTemplate);

$('.projlist ul').on('contextmenu', 'li', (e) => {
    e.preventDefault();
    contextMenu.popup({
        window: remote.getCurrentWindow()
    })
})

function showCreateProjectDialog(projectName) {
    $('#oldProjectName').val(projectName);
    $('#projectName').val(projectName);
}