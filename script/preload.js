const { contextBridge, ipcRenderer } = require('electron')

// contextBridge.exposeInMainWorld('electron', {
//   startDrag: (fileName) => {
//     ipcRenderer.send('ondragstart', path.join(process.cwd(), fileName))
//   }
// })