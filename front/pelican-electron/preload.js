const { contextBridge, ipcRenderer } = require('electron')

// Expose secure APIs to renderer process
contextBridge.exposeInMainWorld('pelicanAPI', {
  // Configuration management
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  
  // App usage tracking
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
  
  // Service monitoring
  checkServiceStatus: (services) => ipcRenderer.invoke('check-service-status', services),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Window controls
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  
  // Music player
  selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
  scanMusicFolder: (folderPath) => ipcRenderer.invoke('scan-music-folder', folderPath),
  autoLoadDefaultMusic: () => ipcRenderer.invoke('auto-load-default-music'),
  downloadYouTubeAudio: (url) => ipcRenderer.invoke('download-youtube-audio', url),
  copyAudioFile: (filePath, fileName) => ipcRenderer.invoke('copy-audio-file', filePath, fileName),
  musicControl: (action, data) => ipcRenderer.invoke('music-control', action, data),
  
  // Event listeners
  onServiceUpdate: (callback) => ipcRenderer.on('service-check-update', callback),
  removeServiceListener: (callback) => ipcRenderer.removeListener('service-check-update', callback),
  onAutoLoadMusic: (callback) => ipcRenderer.on('auto-load-music-folder', callback),
  
  // System info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
})