const { contextBridge, ipcRenderer } = require('electron')
const invoke = channel => (...args) => ipcRenderer.invoke(channel, ...args)
contextBridge.exposeInMainWorld('desktopLibrary', {
  getLibrary: invoke('library:get'), addSource: invoke('source:add'), updateSource: invoke('source:update'), scan: invoke('scan'),
  openOriginal: invoke('file:open'), reveal: invoke('file:reveal'), viewed: invoke('file:viewed'), updateFile: invoke('file:update'), previewUrl: invoke('preview:url'),
  exportRegistry: invoke('registry:export'), importRegistry: invoke('registry:import'), setPreference: (key, value) => ipcRenderer.invoke('preference:set', { key, value }),
  onChanged(callback) { const listener = (_, state) => callback(state); ipcRenderer.on('library-changed', listener); return () => ipcRenderer.removeListener('library-changed', listener) },
})
