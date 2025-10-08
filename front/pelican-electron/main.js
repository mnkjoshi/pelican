const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron/main')
const path = require('node:path')
const Store = require('electron-store')
const axios = require('axios')
const cron = require('node-cron')
const { spawn } = require('child_process')
const fs = require('fs').promises
// Use yt-dlp for reliable YouTube downloads
let ytDlpExec = null
let ffmpegPath = null

try {
    ytDlpExec = require('yt-dlp-exec')
    console.log('yt-dlp-exec loaded successfully')
} catch (e) {
    console.log('yt-dlp-exec not available:', e.message)
}

try {
    ffmpegPath = require('ffmpeg-static')
    console.log('ffmpeg-static loaded successfully, path:', ffmpegPath)
} catch (e) {
    console.log('ffmpeg-static not available:', e.message)
}

// Initialize secure storage
const store = new Store({
    name: 'pelican-config',
    encryptionKey: 'pelican-secure-key-2025'
})

let mainWindow = null
let appTracker = null

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        frame: false, // Frameless window for custom title bar
        titleBarStyle: 'hidden',
        backgroundColor: '#121212',
        icon: path.join(__dirname, 'Pelican.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            // Disable some features that might cause permission issues
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: false
        }
    })

    mainWindow.loadFile('index.html')

    // Handle window close event
    mainWindow.on('closed', () => {
        console.log('Main window closed, cleaning up resources...')
        cleanupResources()
        mainWindow = null
    })

    // Open dev tools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools()
    }
    
    // Suppress DevTools warnings
    mainWindow.webContents.on('devtools-opened', () => {
        mainWindow.webContents.executeJavaScript(`
            console.clear();
            console.log('%c🦜 Pelican Command Center', 'color: #00BFFF; font-size: 16px; font-weight: bold;');
            console.log('%cDevelopment mode active', 'color: #39FF14;');
        `)
    })
}

// App Usage Tracking for Windows
const startAppTracker = () => {
    if (process.platform === 'win32') {
        const trackerScript = `
            $logPath = "$env:APPDATA\\Pelican\\usage.log"
            $logDir = Split-Path $logPath -Parent
            if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force }
            
            while ($true) {
                try {
                    $activeWindow = Add-Type -MemberDefinition '
                        [DllImport("user32.dll")]
                        public static extern IntPtr GetForegroundWindow();
                        [DllImport("user32.dll")]
                        public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
                        [DllImport("user32.dll")]
                        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
                    ' -Name Win32 -Namespace API -PassThru
                    
                    $hwnd = $activeWindow::GetForegroundWindow()
                    $processId = 0
                    $activeWindow::GetWindowThreadProcessId($hwnd, [ref]$processId)
                    
                    if ($processId -gt 0) {
                        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                        if ($process -and $process.MainWindowTitle -and $process.ProcessName -ne "pelican-electron") {
                            # Enhanced browser tab detection
                            $displayName = $process.ProcessName
                            $windowTitle = $process.MainWindowTitle
                            
                            # Browser-specific processing
                            if ($process.ProcessName -eq "brave" -or $process.ProcessName -eq "chrome" -or $process.ProcessName -eq "msedge" -or $process.ProcessName -eq "firefox") {
                                # Extract site name from title (most browsers show "Site Name - Browser Name")
                                if ($windowTitle -match "^(.*?) - ") {
                                    $siteName = $matches[1].Trim()
                                    if ($siteName -and $siteName -ne "") {
                                        $displayName = "$($process.ProcessName)/$siteName"
                                    }
                                }
                            }
                            
                            $entry = @{
                                timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                                processName = $process.ProcessName
                                displayName = $displayName
                                windowTitle = $windowTitle
                            }
                            Add-Content -Path $logPath -Value ($entry | ConvertTo-Json -Compress)
                        }
                    }
                } catch {}
                Start-Sleep -Seconds 5
            }
        `
        
        appTracker = spawn('powershell.exe', ['-Command', trackerScript], {
            windowsHide: true,
            stdio: 'ignore'
        })
        
        // Track the process for cleanup
        trackProcess(appTracker, 'App Tracker PowerShell')
    }
}

// IPC Handlers
ipcMain.handle('get-config', (event, key) => {
    return store.get(key)
})

ipcMain.handle('set-config', (event, key, value) => {
    store.set(key, value)
    return true
})

ipcMain.handle('get-usage-data', async () => {
    try {
        const logPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Pelican', 'usage.log')
        const data = await fs.readFile(logPath, 'utf-8')
        const lines = data.trim().split('\n').filter(line => line.trim())
        
        const usageMap = new Map()
        const now = new Date()
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
        
        lines.forEach(line => {
            try {
                const entry = JSON.parse(line)
                const timestamp = new Date(entry.timestamp)
                
                if (timestamp > oneDayAgo) {
                    const displayName = entry.displayName || entry.processName
                    const count = usageMap.get(displayName) || 0
                    usageMap.set(displayName, count + 1)
                }
            } catch (e) {}
        })
        
        return Array.from(usageMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, usage: count * 5 })) // Convert to seconds
    } catch (error) {
        return []
    }
})

// Service status tracking with uptime
const serviceStatusHistory = new Map()

ipcMain.handle('check-service-status', async (event, services) => {
    const results = []
    
    for (const service of services) {
        const startTime = Date.now()
        try {
            const response = await axios.get(service.url, { timeout: 5000 })
            const currentStatus = response.status === 200 ? 'online' : 'degraded'
            
            // Update status history
            const history = serviceStatusHistory.get(service.name) || { 
                status: currentStatus, 
                since: startTime,
                lastCheck: startTime 
            }
            
            if (history.status !== currentStatus) {
                history.status = currentStatus
                history.since = startTime
            }
            history.lastCheck = startTime
            serviceStatusHistory.set(service.name, history)
            
            results.push({
                name: service.name,
                status: currentStatus,
                responseTime: Date.now() - startTime,
                uptime: Math.floor((startTime - history.since) / 1000) // seconds
            })
        } catch (error) {
            // Update status history for offline
            const history = serviceStatusHistory.get(service.name) || { 
                status: 'offline', 
                since: startTime,
                lastCheck: startTime 
            }
            
            if (history.status !== 'offline') {
                history.status = 'offline'
                history.since = startTime
            }
            history.lastCheck = startTime
            serviceStatusHistory.set(service.name, history)
            
            results.push({
                name: service.name,
                status: 'offline',
                responseTime: null,
                error: error.message,
                downtime: Math.floor((startTime - history.since) / 1000) // seconds
            })
        }
    }
    
    return results
})

// Music player functionality
const musicLibrary = new Map()
let currentPlaylist = []
let currentTrackIndex = 0
let isPlaying = false
let isShuffled = false
let shuffledIndices = []
let shufflePosition = 0

// Create array of shuffled indices
function createShuffledIndices() {
    if (currentPlaylist.length === 0) {
        console.log('Cannot create shuffled indices: currentPlaylist is empty')
        return
    }
    
    // Create array of indices [0, 1, 2, ..., length-1]
    shuffledIndices = Array.from({ length: currentPlaylist.length }, (_, i) => i)
    
    // Fisher-Yates shuffle the indices
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]]
    }
    
    // Find current song's position in the shuffled array
    shufflePosition = shuffledIndices.findIndex(index => index === currentTrackIndex)
    if (shufflePosition === -1) shufflePosition = 0
    
    console.log('Created shuffled indices:', shuffledIndices.slice(0, 10), '... (showing first 10)')
    console.log('Current track index:', currentTrackIndex, 'found at shuffle position:', shufflePosition)
}

ipcMain.handle('select-music-folder', async () => {
    try {
        const defaultMusicPath = 'C:\\Users\\manav\\Music\\Main'
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Music Folder',
            defaultPath: defaultMusicPath
        })
        
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0]
        }
        return null
    } catch (error) {
        return null
    }
})

ipcMain.handle('scan-music-folder', async (event, folderPath) => {
    try {
        const files = await fs.readdir(folderPath, { withFileTypes: true })
        const audioFiles = files
            .filter(file => file.isFile() && /\.(mp3|wav|m4a|flac|ogg)$/i.test(file.name))
            .map(file => ({
                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                path: path.join(folderPath, file.name),
                duration: 0 // Will be filled by audio metadata later
            }))
        
        currentPlaylist = audioFiles
        return audioFiles
    } catch (error) {
        return []
    }
})

ipcMain.handle('music-control', (event, action, data) => {
    try {
        switch (action) {
            case 'play':
                isPlaying = true
                return { playing: true, currentTrack: currentPlaylist[currentTrackIndex] || null }
            case 'pause':
                isPlaying = false
                return { playing: false }
            case 'next':
                if (currentPlaylist.length === 0) return {}
                if (isShuffled) {
                    if (shuffledIndices.length === 0) {
                        console.log('Error: shuffledIndices is empty, recreating...')
                        createShuffledIndices()
                    }
                    // Move to next position in shuffle
                    shufflePosition = (shufflePosition + 1) % shuffledIndices.length
                    currentTrackIndex = shuffledIndices[shufflePosition]
                    console.log('Next: shuffle position:', shufflePosition, 'track index:', currentTrackIndex)
                    return { currentTrack: currentPlaylist[currentTrackIndex], index: currentTrackIndex }
                } else {
                    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length
                    return { currentTrack: currentPlaylist[currentTrackIndex], index: currentTrackIndex }
                }
            case 'prev':
                if (currentPlaylist.length === 0) return {}
                if (isShuffled) {
                    if (shuffledIndices.length === 0) {
                        console.log('Error: shuffledIndices is empty, recreating...')
                        createShuffledIndices()
                    }
                    // Move to previous position in shuffle
                    shufflePosition = shufflePosition > 0 ? shufflePosition - 1 : shuffledIndices.length - 1
                    currentTrackIndex = shuffledIndices[shufflePosition]
                    console.log('Prev: shuffle position:', shufflePosition, 'track index:', currentTrackIndex)
                    return { currentTrack: currentPlaylist[currentTrackIndex], index: currentTrackIndex }
                } else {
                    currentTrackIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : currentPlaylist.length - 1
                    return { currentTrack: currentPlaylist[currentTrackIndex], index: currentTrackIndex }
                }
            case 'shuffle':
                isShuffled = !isShuffled
                if (isShuffled && currentPlaylist.length > 0) {
                    // Create shuffled indices when enabling shuffle
                    createShuffledIndices()
                    console.log('Shuffle enabled: Created shuffled indices for', shuffledIndices.length, 'tracks')
                } else if (!isShuffled) {
                    console.log('Shuffle disabled: Using original playlist order')
                }
                return { shuffled: isShuffled }
            case 'seek':
                return { position: data?.position || 0 }
            case 'select':
                if (data?.index >= 0 && data.index < currentPlaylist.length) {
                    currentTrackIndex = data.index
                    if (isShuffled && shuffledIndices.length > 0) {
                        // Find the selected track's position in the shuffle
                        shufflePosition = shuffledIndices.findIndex(index => index === currentTrackIndex)
                        if (shufflePosition === -1) shufflePosition = 0
                        console.log('Selected track index:', currentTrackIndex, 'found at shuffle position:', shufflePosition)
                    }
                    return { currentTrack: currentPlaylist[currentTrackIndex], index: currentTrackIndex }
                }
                return {}
            case 'setPlaylist':
                if (data?.tracks && Array.isArray(data.tracks)) {
                    currentPlaylist = data.tracks
                    currentTrackIndex = 0
                    // Recreate shuffled indices if shuffle is enabled
                    if (isShuffled && currentPlaylist.length > 0) {
                        createShuffledIndices()
                        console.log('Playlist updated: Recreated shuffled indices for', shuffledIndices.length, 'tracks')
                    }
                    return { success: true, playlistLength: currentPlaylist.length }
                }
                return { success: false }
            default:
                return {}
        }
    } catch (error) {
        console.error('Music control error:', error)
        return {}
    }
})

ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url)
})

// Auto-load default music folder if it exists
ipcMain.handle('auto-load-default-music', async () => {
    try {
        const defaultMusicPath = 'C:\\Users\\manav\\Music\\Main'
        const fs = require('fs')
        
        // Check if the default music folder exists
        if (fs.existsSync(defaultMusicPath)) {
            // Scan the folder for music files
            const musicFiles = []
            const supportedFormats = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']
            
            const scanDirectory = (dir) => {
                const files = fs.readdirSync(dir)
                files.forEach(file => {
                    const fullPath = path.join(dir, file)
                    const stat = fs.statSync(fullPath)
                    
                    if (stat.isDirectory()) {
                        scanDirectory(fullPath)
                    } else if (supportedFormats.includes(path.extname(file).toLowerCase())) {
                        musicFiles.push({
                            name: path.basename(file, path.extname(file)),
                            path: fullPath,
                            size: Math.round(stat.size / 1024) + ' KB'
                        })
                    }
                })
            }
            
            scanDirectory(defaultMusicPath)
            return { success: true, path: defaultMusicPath, tracks: musicFiles }
        }
        
        return { success: false, message: 'Default music folder not found' }
    } catch (error) {
        return { success: false, message: error.message }
    }
})

// YouTube download handler using yt-dlp
ipcMain.handle('download-youtube-audio', async (event, url) => {
    const musicFolder = 'C:\\Users\\manav\\Music\\Main'
    const fs = require('fs')
    
    console.log('Starting YouTube download for:', url)
    
    // Validate the URL
    if (!url || typeof url !== 'string') {
        return { success: false, message: 'Invalid URL provided' }
    }
    
    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    if (!youtubeRegex.test(url)) {
        return { success: false, message: 'Invalid YouTube URL format' }
    }
    
    // Ensure the music folder exists
    if (!fs.existsSync(musicFolder)) {
        fs.mkdirSync(musicFolder, { recursive: true })
    }

    if (!ytDlpExec) {
        return {
            success: false,
            message: 'yt-dlp is not available. Please install it or use file upload instead.'
        }
    }

    try {
        console.log('Using yt-dlp to download:', url)
        
        // Use yt-dlp to download audio and convert to MP3
        const outputTemplate = path.join(musicFolder, '%(title)s.%(ext)s')
        
        console.log('Output template:', outputTemplate)
        console.log('Music folder exists:', fs.existsSync(musicFolder))
        
        const downloadOptions = {
            'extract-audio': true,
            'audio-format': 'mp3',
            'audio-quality': '0', // Best quality
            'output': outputTemplate,
            'no-playlist': true,
            'add-metadata': true,
            'format': 'bestaudio/best',
            'embed-metadata': true
        }
        
        // Add FFmpeg location if available
        if (ffmpegPath) {
            downloadOptions['ffmpeg-location'] = path.dirname(ffmpegPath)
            console.log('Using bundled FFmpeg at:', path.dirname(ffmpegPath))
        }
        
        console.log('yt-dlp options:', downloadOptions)
        
        await ytDlpExec(url, downloadOptions)
        
        console.log('yt-dlp completed successfully')
        
        // If we can't determine the exact file, look for the most recently created file
        const files = fs.readdirSync(musicFolder)
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const fullPath = path.join(musicFolder, file)
                return {
                    path: fullPath,
                    name: file,
                    mtime: fs.statSync(fullPath).mtime
                }
            })
            .sort((a, b) => b.mtime - a.mtime)
        
        if (files.length > 0) {
            const latestFile = files[0]
            const stats = fs.statSync(latestFile.path)
            const fileName = path.basename(latestFile.name, '.mp3')
            
            return {
                success: true,
                filePath: latestFile.path,
                title: fileName,
                duration: 0,
                size: Math.round(stats.size / 1024) + ' KB',
                url: url
            }
        }
        
        return {
            success: false,
            message: 'Download completed but could not locate the file'
        }
        
    } catch (error) {
        console.error('yt-dlp failed:', error)
        
        // More specific error messages based on common yt-dlp errors
        let errorMessage = 'YouTube download failed'
        
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'YouTube blocked the download (403 Forbidden). This video may be restricted or geo-blocked.'
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Video not found. The video may be private, deleted, or the URL is incorrect.'
        } else if (error.message.includes('age')) {
            errorMessage = 'Age-restricted content cannot be downloaded without authentication.'
        } else if (error.message.includes('copyright')) {
            errorMessage = 'This video is protected by copyright and cannot be downloaded.'
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            errorMessage = 'Network error. Please check your internet connection and try again.'
        } else {
            errorMessage = `Download failed: ${error.message}`
        }
        
        return {
            success: false,
            message: errorMessage + '\n\n' +
                'Alternative solutions:\n' +
                '• Try a different video URL\n' +
                '• Use the file upload option instead\n' +
                '• Check if the video is available in your region'
        }
    }
})

ipcMain.handle('window-control', (event, action) => {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return
        }
        
        switch (action) {
            case 'minimize':
                mainWindow.minimize()
                break
            case 'maximize':
                mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
                break
            case 'close':
                mainWindow.close()
                break
        }
    } catch (error) {
        console.error('Window control error:', error)
    }
})

// Schedule periodic service checks
let serviceCheckInterval = null

const startServiceMonitoring = () => {
    try {
        serviceCheckInterval = cron.schedule('*/30 * * * * *', () => {
            const services = store.get('services', [])
            if (services.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('service-check-update')
            }
        }, {
            scheduled: true,
            timezone: "America/New_York"
        })
    } catch (error) {
        console.error('Failed to start service monitoring:', error)
    }
}

// File copy handler for manual audio file uploads
ipcMain.handle('copy-audio-file', async (event, filePath, fileName) => {
    try {
        const musicFolder = 'C:\\Users\\manav\\Music\\Main'
        const fs = require('fs')
        
        // Ensure the music folder exists
        if (!fs.existsSync(musicFolder)) {
            fs.mkdirSync(musicFolder, { recursive: true })
        }
        
        const targetPath = path.join(musicFolder, fileName)
        
        // Copy the file
        await fs.promises.copyFile(filePath, targetPath)
        
        return {
            success: true,
            filePath: targetPath
        }
        
    } catch (error) {
        console.error('File copy error:', error)
        return {
            success: false,
            message: error.message
        }
    }
})

app.whenReady().then(() => {
    // Set the app user model ID for Windows taskbar
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.pelican.command-center')
    }
    
    createWindow()
    startAppTracker()
    startServiceMonitoring()
    
    // Auto-load default music folder after window is ready
    trackTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('auto-load-music-folder')
        }
    }, 2000, 'Auto-load music folder') // Wait 2 seconds for the renderer to be ready

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    cleanupResources()
    
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Handle before quit event for graceful shutdown
app.on('before-quit', (event) => {
    console.log('App before-quit event triggered')
    cleanupResources()
})

// Handle will-quit event
app.on('will-quit', (event) => {
    console.log('App will-quit event triggered')
    cleanupResources()
})

// Handle process termination signals
process.on('SIGINT', () => {
    console.log('Received SIGINT signal, cleaning up...')
    cleanupResources()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal, cleaning up...')
    cleanupResources()
    process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
    cleanupResources()
    process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason)
    cleanupResources()
})

// Additional IPC handler to manually trigger cleanup (for debugging)
ipcMain.handle('cleanup-resources', () => {
    console.log('Manual cleanup requested from renderer')
    cleanupResources()
    return { success: true, message: 'Cleanup completed' }
})

// Track all active processes for cleanup
let activeProcesses = []
let activeTimeouts = []
let activeIntervals = []

// Helper function to track a new process
function trackProcess(process, description = 'Unknown process') {
    if (process) {
        activeProcesses.push({ process, description })
        console.log(`Tracking new process: ${description} (PID: ${process.pid})`)
        
        process.on('exit', (code, signal) => {
            console.log(`Process ${description} exited with code ${code}, signal ${signal}`)
            // Remove from active processes when it exits
            const index = activeProcesses.findIndex(p => p.process === process)
            if (index > -1) {
                activeProcesses.splice(index, 1)
            }
        })
    }
    return process
}

// Helper function to track timeouts and intervals
function trackTimeout(callback, delay, description = 'Unknown timeout') {
    const timeout = setTimeout(() => {
        callback()
        // Remove from active timeouts when it completes
        const index = activeTimeouts.findIndex(t => t.timeout === timeout)
        if (index > -1) {
            activeTimeouts.splice(index, 1)
        }
    }, delay)
    
    activeTimeouts.push({ timeout, description })
    console.log(`Tracking new timeout: ${description} (${delay}ms)`)
    return timeout
}

// Enhanced cleanup function
function cleanupResources() {
    console.log('Starting resource cleanup...')
    
    try {
        // Clean up app tracker process
        if (appTracker) {
            try {
                if (!appTracker.killed) {
                    console.log('Terminating app tracker process...')
                    appTracker.kill('SIGTERM')
                    
                    // Force kill after timeout if still running
                    setTimeout(() => {
                        if (appTracker && !appTracker.killed) {
                            console.log('Force killing app tracker...')
                            appTracker.kill('SIGKILL')
                        }
                    }, 2000)
                }
            } catch (killError) {
                console.warn('Failed to kill app tracker:', killError.message)
            }
            appTracker = null
        }
        
        // Clean up service monitoring cron job
        if (serviceCheckInterval) {
            try {
                console.log('Stopping service check interval...')
                if (typeof serviceCheckInterval.destroy === 'function') {
                    serviceCheckInterval.destroy()
                } else if (typeof serviceCheckInterval.stop === 'function') {
                    serviceCheckInterval.stop()
                }
            } catch (cronError) {
                console.warn('Failed to stop cron job:', cronError.message)
            }
            serviceCheckInterval = null
        }
        
        // Kill any active child processes
        if (activeProcesses.length > 0) {
            console.log(`Terminating ${activeProcesses.length} active processes...`)
            activeProcesses.forEach((processInfo, index) => {
                try {
                    const process = processInfo.process
                    const description = processInfo.description
                    
                    if (process && !process.killed) {
                        console.log(`Terminating: ${description} (PID: ${process.pid})`)
                        process.kill('SIGTERM')
                        
                        // Force kill after timeout if still running
                        setTimeout(() => {
                            if (process && !process.killed) {
                                console.log(`Force killing: ${description}`)
                                process.kill('SIGKILL')
                            }
                        }, 1000)
                    }
                } catch (error) {
                    console.warn(`Failed to kill process ${processInfo.description}:`, error.message)
                }
            })
            activeProcesses = []
        }
        
        // Clear all active timeouts
        if (activeTimeouts.length > 0) {
            console.log(`Clearing ${activeTimeouts.length} active timeouts...`)
            activeTimeouts.forEach((timeoutInfo, index) => {
                try {
                    console.log(`Clearing timeout: ${timeoutInfo.description}`)
                    clearTimeout(timeoutInfo.timeout)
                } catch (error) {
                    console.warn(`Failed to clear timeout ${timeoutInfo.description}:`, error.message)
                }
            })
            activeTimeouts = []
        }
        
        // Clear all active intervals
        if (activeIntervals.length > 0) {
            console.log(`Clearing ${activeIntervals.length} active intervals...`)
            activeIntervals.forEach((interval, index) => {
                try {
                    clearInterval(interval)
                } catch (error) {
                    console.warn(`Failed to clear interval ${index}:`, error.message)
                }
            })
            activeIntervals = []
        }
        
        // Force cleanup any remaining yt-dlp or ffmpeg processes
        if (process.platform === 'win32') {
            try {
                console.log('Cleaning up any remaining yt-dlp and ffmpeg processes...')
                const { spawn } = require('child_process')
                
                // Kill any remaining yt-dlp processes
                const killYtDlp = spawn('taskkill', ['/f', '/im', 'yt-dlp.exe'], { 
                    stdio: 'ignore',
                    windowsHide: true 
                })
                
                // Kill any remaining ffmpeg processes
                const killFfmpeg = spawn('taskkill', ['/f', '/im', 'ffmpeg.exe'], { 
                    stdio: 'ignore',
                    windowsHide: true 
                })
                
                // Don't wait for these to complete
                killYtDlp.unref()
                killFfmpeg.unref()
                
            } catch (killError) {
                console.warn('Failed to cleanup external processes:', killError.message)
            }
        }
        
        console.log('Resource cleanup completed')
        
    } catch (error) {
        console.error('General cleanup error:', error)
    }
}