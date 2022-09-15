const os = require('os');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(path.join(os.homedir(), 'fily-projects.json'));

const db = low(adapter);
const TB_NAME = 'projects';
db.defaults({ 'projects': [] }).write();

function listAllProjects() {
    return db.get('projects').value();
}

function saveProject(projectName) {
    db.get('projects').push({
        projectName: projectName
    }).write();
}

function updateProjectName(oldName, newName) {
    db.read().get('projects').find({
        projectName: oldName
    }).assign({
        projectName: newName
    }).write();
}

function deleteProject(projectName) {
    db.read().get('projects').remove({
        projectName: projectName
    }).write();
}

function getProjectByProjectName(projectName) {
    return db.read().get('projects').find({
        projectName: projectName
    }).value();
}

function listAllFilesOfProject(projectName) {
    return db.read().get('projects').find({
        projectName: projectName
    }).map('projectFiles').value()
}

function addProjectFile(projectName, fileItem) {
    let projectFiles = db.get('projects').find({
        projectName: projectName
    }).get('projectFiles').value();

    if (!projectFiles) {
        projectFiles = [fileItem];
    } else {
        projectFiles.push(fileItem);
    }

    db.get('projects').find({
        projectName: projectName
    }).assign({ projectFiles }).write()
}

function saveFileComment(projectName, filename, comment) {
    let projectFiles = db.get('projects').find({
        projectName: projectName
    }).get('projectFiles').value();

    for (let projectFile of projectFiles) {
        if (projectFile.filename === filename) {
            projectFile.comment = comment;
        }
    }

    db.get('projects').find({
        projectName: projectName
    }).assign({ projectFiles }).write();

}

function changeFilePinStatus(projectName, filename, status) {
    let projectFiles = db.get('projects').find({
        projectName: projectName
    }).get('projectFiles').value();

    for (let projectFile of projectFiles) {
        if (projectFile.filename === filename) {
            projectFile.pin = status;
        }
    }

    db.get('projects').find({
        projectName: projectName
    }).assign({ projectFiles }).write();
}

function deleteProjectFile(projectName, filename) {
    let projectFiles = db.get('projects').find({
        projectName: projectName
    }).get('projectFiles').value();

    projectFiles.forEach((item, index, arr) => {
        if (item.filename === filename) {
            arr.splice(index, 1);
        }
    })

    db.get('projects').find({
        projectName: projectName
    }).assign({ projectFiles }).write();

}

module.exports = {
    listAllProjects,
    saveProject,
    getProjectByProjectName,
    listAllFilesOfProject,
    addProjectFile,
    saveFileComment,
    deleteProjectFile,
    updateProjectName,
    deleteProject,
    changeFilePinStatus
}