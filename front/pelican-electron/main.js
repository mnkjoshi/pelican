const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron/main')
const path = require('node:path')
const Store = require('electron-store')
const axios = require('axios')
const cron = require('node-cron')
const { spawn } = require('child_process')
const fs = require('fs').promises

// Load environment variables
require('dotenv').config()
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

// Analytics data (Roblox + GitHub) - replaces social metrics
ipcMain.handle('get-analytics-data', async () => {
    try {
        console.log('Fetching Roblox game visits and GitHub commits...')
        
        // Roblox universe IDs (correct IDs for the API)
        const universeIds = '4443400918,4537025162,2940682045'
        const gameNames = {
            '4443400918': 'Universe',
            '4537025162': 'Murder vs Sheriff Mode MM2 Duels', 
            '2940682045': 'Squid Game'
        }
        
        // Fetch Roblox game visits using the correct API
        let totalGamePlays = 0
        try {
            console.log('Fetching Roblox game data...')
            const robloxUrl = `https://games.roblox.com/v1/games?universeIds=${universeIds}`
            console.log(`Roblox API URL: ${robloxUrl}`)
            
            const robloxResponse = await axios.get(robloxUrl, {
                timeout: 10000,
                headers: {
                    'accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })
            
            console.log('Roblox API response:', robloxResponse.data)
            
            if (robloxResponse.data && robloxResponse.data.data) {
                robloxResponse.data.data.forEach(game => {
                    const gameName = gameNames[game.id] || `Game ${game.id}`
                    const visits = game.visits || 0
                    console.log(`${gameName}: ${visits.toLocaleString()} visits`)
                    totalGamePlays += visits
                })
            }
            
            console.log(`Total Roblox game plays: ${totalGamePlays.toLocaleString()}`)
        } catch (robloxError) {
            console.error('Failed to fetch Roblox data:', robloxError.message)
            // Use fallback mock data if API fails
            totalGamePlays = 7450000 // Mock total
            console.log('Using fallback mock data for Roblox games')
        }
        
        console.log(`Total game plays: ${totalGamePlays.toLocaleString()}`)
        
        // Fetch GitHub commits this week for user mnkjoshi
        let commitsThisWeek = 0
        try {
            console.log('Fetching GitHub commits for mnkjoshi...')
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            const since = oneWeekAgo.toISOString()
            
            // Get user's repositories
            const reposResponse = await axios.get('https://api.github.com/users/mnkjoshi/repos?per_page=100&sort=pushed')
            const repos = reposResponse.data
            
            if (Array.isArray(repos)) {
                console.log(`Found ${repos.length} repositories for mnkjoshi`)
                
                // Fetch commits for each repo in parallel (limit to 10 most recent)
                const commitPromises = repos.slice(0, 10).map(async (repo) => {
                    try {
                        const commitsResponse = await axios.get(
                            `https://api.github.com/repos/${repo.full_name}/commits?author=mnkjoshi&since=${since}&per_page=100`
                        )
                        const commits = commitsResponse.data
                        console.log(`${repo.name}: ${commits.length} commits this week`)
                        return commits.length
                    } catch (error) {
                        console.error(`Failed to fetch commits for ${repo.name}:`, error.message)
                        return 0
                    }
                })
                
                const commitCounts = await Promise.all(commitPromises)
                commitsThisWeek = commitCounts.reduce((sum, count) => sum + count, 0)
            }
        } catch (error) {
            console.error('Failed to fetch GitHub commits:', error.message)
        }
        
        console.log(`Commits this week: ${commitsThisWeek}`)
        
        // Return analytics data in the format expected by socials widget
        return {
            totalGamePlays: totalGamePlays,
            commitsThisWeek: commitsThisWeek,
            // Placeholder values for other metrics if needed
            siteVisits: 0,
            discordMembers: 0
        }
        
    } catch (error) {
        console.error('Failed to fetch analytics data:', error.message)
        return {
            totalGamePlays: 0,
            commitsThisWeek: 0,
            siteVisits: 0,
            discordMembers: 0
        }
    }
})

// Service status tracking with uptime
const serviceStatusHistory = new Map()

// Initialize default services
function initializeDefaultServices() {
    const defaultServices = [
        {
            name: 'Golden Hind',
            url: 'https://golden-hind.onrender.com/',
            description: 'Golden Hind Service API',
            type: 'api'
        },
        {
            name: 'Stellar Resolution',
            url: 'https://stellar-resolution.onrender.com/unwise-labels/getLabels',
            description: 'Stellar Resolution Unwise Labels API',
            type: 'api'
        }
    ]
    
    // List of placeholder/test services to remove
    const placeholderServices = [
        'Portfolio Site',
        'Discord Bot', 
        'Backend API',
        'Test Service',
        'Example Service'
    ]
    
    // Get existing services
    const existingServices = store.get('services', [])
    
    // Remove placeholder services
    const cleanedServices = existingServices.filter(service => {
        if (placeholderServices.includes(service.name) || 
            (service.url && service.url.includes('httpstat.us'))) {
            console.log(`Removing placeholder service: ${service.name}`)
            // Also clean up from status history
            serviceStatusHistory.delete(service.name)
            return false
        }
        return true
    })
    
    // Add new services if they don't exist
    let servicesUpdated = cleanedServices.length !== existingServices.length
    defaultServices.forEach(defaultService => {
        const exists = cleanedServices.find(service => service.name === defaultService.name)
        if (!exists) {
            cleanedServices.push(defaultService)
            servicesUpdated = true
            console.log(`Added new service to monitor: ${defaultService.name}`)
        }
    })
    
    if (servicesUpdated) {
        store.set('services', cleanedServices)
        console.log('Updated services configuration - removed placeholders and added new services')
    }
    
    console.log(`Monitoring ${cleanedServices.length} services:`, cleanedServices.map(s => s.name).join(', '))
}

ipcMain.handle('check-service-status', async (event, services) => {
    const results = []
    
    for (const service of services) {
        const startTime = Date.now()
        try {
            console.log(`Checking service: ${service.name} at ${service.url}`)
            const response = await axios.get(service.url, { 
                timeout: 10000, // Increase timeout for Render services (they can be slow to wake up)
                headers: {
                    'User-Agent': 'Pelican-Command-Center/1.0.0'
                }
            })
            
            // Consider 2xx status codes as online
            const currentStatus = (response.status >= 200 && response.status < 300) ? 'online' : 'degraded'
            
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
            
            const responseTime = Date.now() - startTime
            console.log(`Service ${service.name}: ${currentStatus} (${responseTime}ms, status: ${response.status})`)
            
            results.push({
                name: service.name,
                status: currentStatus,
                responseTime: responseTime,
                uptime: Math.floor((startTime - history.since) / 1000), // seconds
                statusCode: response.status,
                url: service.url
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
            
            console.log(`Service ${service.name}: offline (${error.message})`)
            
            results.push({
                name: service.name,
                status: 'offline',
                responseTime: null,
                error: error.message,
                downtime: Math.floor((startTime - history.since) / 1000), // seconds
                url: service.url
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

// Schedule periodic service checks with random intervals
let serviceCheckTimeout = null

const scheduleNextServiceCheck = () => {
    // Random interval between 7-15 minutes (in milliseconds)
    const minInterval = 7 * 60 * 1000  // 7 minutes
    const maxInterval = 15 * 60 * 1000 // 15 minutes
    const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval
    
    const intervalMinutes = (randomInterval / (60 * 1000)).toFixed(1)
    console.log(`Next service check scheduled in ${intervalMinutes} minutes`)
    
    serviceCheckTimeout = trackTimeout(() => {
        const services = store.get('services', [])
        if (services.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
            console.log('Performing scheduled service check...')
            mainWindow.webContents.send('service-check-update')
        }
        
        // Schedule the next check with a new random interval
        scheduleNextServiceCheck()
    }, randomInterval, `Service Check (${intervalMinutes}min)`)
}

const startServiceMonitoring = () => {
    try {
        console.log('Starting randomized service monitoring (7-15 minute intervals)')
        
        // Perform an initial check immediately
        const services = store.get('services', [])
        if (services.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
            console.log('Performing initial service check...')
            mainWindow.webContents.send('service-check-update')
        }
        
        // Schedule the first random check
        scheduleNextServiceCheck()
    } catch (error) {
        console.error('Failed to start service monitoring:', error)
    }
}

// Canvas LMS API Integration
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN
const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL

// Helper function to make Canvas API requests
async function canvasApiRequest(endpoint) {
    try {
        const url = `${CANVAS_BASE_URL}/api/v1${endpoint}`
        console.log(`Making Canvas API request: ${url}`)
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
                'Accept': 'application/json'
            },
            timeout: 10000
        })
        
        return response.data
    } catch (error) {
        console.error('Canvas API request failed:', error.message)
        throw error
    }
}

// Get Canvas assignments with upcoming deadlines
ipcMain.handle('get-canvas-deadlines', async (event, daysAhead = 7) => {
    try {
        if (!CANVAS_API_TOKEN || !CANVAS_BASE_URL) {
            throw new Error('Canvas API credentials not configured')
        }

        console.log(`Fetching Canvas deadlines for next ${daysAhead} days...`)
        
        // Get current user's courses
        const courses = await canvasApiRequest('/courses?enrollment_state=active')
        console.log(`Found ${courses.length} active courses`)
        
        const deadlines = []
        const now = new Date()
        const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000))
        
        for (const course of courses) {
            try {
                // Get assignments for each course
                const assignments = await canvasApiRequest(`/courses/${course.id}/assignments`)
                
                // Get all submissions for the current user in this course (more efficient)
                let userSubmissions = {}
                try {
                    const submissions = await canvasApiRequest(`/courses/${course.id}/students/submissions?student_ids[]=self&per_page=100`)
                    if (Array.isArray(submissions)) {
                        submissions.forEach(submission => {
                            userSubmissions[submission.assignment_id] = submission.workflow_state !== 'unsubmitted'
                        })
                    }
                } catch (submissionError) {
                    console.warn(`Could not get submissions for course ${course.name}:`, submissionError.message)
                }

                for (const assignment of assignments) {
                    if (assignment.due_at) {
                        const dueDate = new Date(assignment.due_at)
                        
                        // Check if assignment is due within the specified timeframe
                        if (dueDate >= now && dueDate <= futureDate) {
                            // Check user's specific submission status from batch data
                            const userSubmitted = userSubmissions[assignment.id] || false

                            deadlines.push({
                                id: assignment.id,
                                title: assignment.name,
                                course: course.name,
                                courseCode: course.course_code,
                                dueDate: assignment.due_at,
                                dueDateFormatted: dueDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }),
                                url: assignment.html_url,
                                points: assignment.points_possible,
                                submitted: userSubmitted,
                                description: assignment.description ? assignment.description.substring(0, 200) + '...' : 'No description'
                            })
                        }
                    }
                }
                
                // Small delay between API calls to be respectful
                await new Promise(resolve => setTimeout(resolve, 100))
                
            } catch (courseError) {
                console.warn(`Failed to get assignments for course ${course.name}:`, courseError.message)
            }
        }
        
        // Sort deadlines by due date
        deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        
        console.log(`Found ${deadlines.length} upcoming deadlines`)
        return {
            success: true,
            deadlines: deadlines,
            totalCount: deadlines.length,
            daysAhead: daysAhead
        }
        
    } catch (error) {
        console.error('Failed to fetch Canvas deadlines:', error.message)
        return {
            success: false,
            error: error.message,
            deadlines: []
        }
    }
})

// Get Canvas course information
ipcMain.handle('get-canvas-courses', async () => {
    try {
        if (!CANVAS_API_TOKEN || !CANVAS_BASE_URL) {
            throw new Error('Canvas API credentials not configured')
        }

        const courses = await canvasApiRequest('/courses?enrollment_state=active&per_page=50')
        
        const courseInfo = courses.map(course => ({
            id: course.id,
            name: course.name,
            courseCode: course.course_code,
            term: course.term ? course.term.name : 'Unknown',
            url: course.course_code ? `${CANVAS_BASE_URL}/courses/${course.id}` : null,
            enrollmentType: course.enrollments ? course.enrollments[0]?.type : 'student'
        }))
        
        console.log(`Retrieved ${courseInfo.length} active courses`)
        return {
            success: true,
            courses: courseInfo
        }
        
    } catch (error) {
        console.error('Failed to fetch Canvas courses:', error.message)
        return {
            success: false,
            error: error.message,
            courses: []
        }
    }
})

// Get Canvas grades for all courses
ipcMain.handle('get-canvas-grades', async () => {
    try {
        if (!CANVAS_API_TOKEN || !CANVAS_BASE_URL) {
            throw new Error('Canvas API credentials not configured')
        }

        console.log('Fetching Canvas grades...')
        
        // Get current user's courses with grades
        const courses = await canvasApiRequest('/courses?enrollment_state=active&include[]=total_scores&include[]=current_grading_period_scores&per_page=50')
        console.log(`Found ${courses.length} active courses for grades`)
        
        const gradesData = []
        
        for (const course of courses) {
            try {
                // Get detailed enrollment info for this course
                const enrollments = await canvasApiRequest(`/courses/${course.id}/enrollments?user_id=self&include[]=current_score&include[]=final_score`)
                
                let userEnrollment = null
                if (Array.isArray(enrollments) && enrollments.length > 0) {
                    userEnrollment = enrollments[0]
                }
                
                // Get course analytics if available (class averages)
                let classStats = null
                try {
                    const analytics = await canvasApiRequest(`/courses/${course.id}/analytics/assignments`)
                    if (analytics && analytics.length > 0) {
                        const totalPoints = analytics.reduce((sum, assignment) => sum + (assignment.points_possible || 0), 0)
                        const avgPoints = analytics.reduce((sum, assignment) => sum + (assignment.avg_score || 0), 0)
                        classStats = {
                            classAverage: totalPoints > 0 ? ((avgPoints / totalPoints) * 100).toFixed(1) : null
                        }
                    }
                } catch (analyticsError) {
                    console.warn(`Could not get analytics for course ${course.name}:`, analyticsError.message)
                }
                
                // Build grade info
                const gradeInfo = {
                    courseId: course.id,
                    courseName: course.name,
                    courseCode: course.course_code || course.name,
                    currentScore: userEnrollment?.current_score || null,
                    finalScore: userEnrollment?.final_score || null,
                    currentGrade: userEnrollment?.current_grade || 'N/A',
                    finalGrade: userEnrollment?.final_grade || 'N/A',
                    classAverage: classStats?.classAverage || null,
                    url: `${CANVAS_BASE_URL}/courses/${course.id}/grades`,
                    term: course.term ? course.term.name : 'Current Term'
                }
                
                gradesData.push(gradeInfo)
                
                // Small delay between API calls
                await new Promise(resolve => setTimeout(resolve, 150))
                
            } catch (courseError) {
                console.warn(`Failed to get grades for course ${course.name}:`, courseError.message)
                // Still add course with minimal info
                gradesData.push({
                    courseId: course.id,
                    courseName: course.name,
                    courseCode: course.course_code || course.name,
                    currentScore: null,
                    finalScore: null,
                    currentGrade: 'Error',
                    finalGrade: 'Error',
                    classAverage: null,
                    url: `${CANVAS_BASE_URL}/courses/${course.id}/grades`,
                    term: course.term ? course.term.name : 'Current Term'
                })
            }
        }
        
        // Calculate overall GPA if possible
        let overallGPA = null
        const validGrades = gradesData.filter(grade => grade.currentScore !== null)
        if (validGrades.length > 0) {
            const totalPoints = validGrades.reduce((sum, grade) => sum + grade.currentScore, 0)
            const averagePercent = totalPoints / validGrades.length
            
            // Convert percentage to 4.0 scale (rough approximation)
            if (averagePercent >= 97) overallGPA = 4.0
            else if (averagePercent >= 93) overallGPA = 3.7
            else if (averagePercent >= 90) overallGPA = 3.3
            else if (averagePercent >= 87) overallGPA = 3.0
            else if (averagePercent >= 83) overallGPA = 2.7
            else if (averagePercent >= 80) overallGPA = 2.3
            else if (averagePercent >= 77) overallGPA = 2.0
            else if (averagePercent >= 73) overallGPA = 1.7
            else if (averagePercent >= 70) overallGPA = 1.3
            else if (averagePercent >= 67) overallGPA = 1.0
            else if (averagePercent >= 65) overallGPA = 0.7
            else overallGPA = 0.0
        }
        
        console.log(`Retrieved grades for ${gradesData.length} courses`)
        return {
            success: true,
            grades: gradesData,
            overallGPA: overallGPA,
            totalCourses: gradesData.length
        }
        
    } catch (error) {
        console.error('Failed to fetch Canvas grades:', error.message)
        return {
            success: false,
            error: error.message,
            grades: []
        }
    }
})

// Google Calendar API Integration with OAuth 2.0
const { google } = require('googleapis')
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

// OAuth 2.0 configuration
const oauth2Client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET, // Client secret is required for token exchange
    'http://localhost:3000/callback' // Use localhost with specific port and path
)

// Store for access tokens
let googleAccessToken = null

// Simple HTTP server to handle OAuth callback
const http = require('http')
let callbackServer = null

function startCallbackServer() {
    return new Promise((resolve, reject) => {
        callbackServer = http.createServer((req, res) => {
            if (req.url.startsWith('/callback')) {
                const url = new URL(req.url, 'http://localhost:3000')
                const authCode = url.searchParams.get('code')
                const error = url.searchParams.get('error')
                
                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' })
                    res.end(`<html><body><h1>Authorization Error</h1><p>${error}</p><p>You can close this window.</p></body></html>`)
                    reject(new Error(error))
                    return
                }
                
                if (authCode) {
                    res.writeHead(200, { 'Content-Type': 'text/html' })
                    res.end(`<html><body><h1>Authorization Successful!</h1><p>You can close this window and return to Pelican.</p></body></html>`)
                    resolve(authCode)
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/html' })
                    res.end(`<html><body><h1>Authorization Error</h1><p>No authorization code received.</p><p>You can close this window.</p></body></html>`)
                    reject(new Error('No authorization code received'))
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' })
                res.end(`<html><body><h1>404 Not Found</h1></body></html>`)
            }
        })
        
        callbackServer.listen(3000, 'localhost', () => {
            console.log('OAuth callback server started on http://localhost:3000')
        })
    })
}

function stopCallbackServer() {
    if (callbackServer) {
        callbackServer.close()
        callbackServer = null
        console.log('OAuth callback server stopped')
    }
}

// Helper function to classify event types based on title/description
function classifyEventType(title, description) {
    const titleLower = title.toLowerCase()
    const descLower = (description || '').toLowerCase()
    const combined = `${titleLower} ${descLower}`
    
    if (combined.includes('exam') || combined.includes('test') || combined.includes('quiz')) return 'exam'
    if (combined.includes('lecture') || combined.includes('class') || combined.includes('lab') || combined.includes('tutorial')) return 'class'
    if (combined.includes('meeting') || combined.includes('standup') || combined.includes('sync')) return 'meeting'
    if (combined.includes('study') || combined.includes('review') || combined.includes('homework')) return 'study'
    if (combined.includes('seminar') || combined.includes('workshop') || combined.includes('conference')) return 'seminar'
    if (combined.includes('coffee') || combined.includes('lunch') || combined.includes('dinner') || combined.includes('friend')) return 'personal'
    
    return 'default'
}

// Complete Google OAuth flow with automatic callback handling
ipcMain.handle('start-google-oauth', async () => {
    try {
        if (!GOOGLE_OAUTH_CLIENT_ID) {
            throw new Error('Google OAuth Client ID not configured')
        }

        // Start the callback server
        console.log('Starting OAuth callback server...')
        const authCodePromise = startCallbackServer()

        // Generate the authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
            ],
            prompt: 'consent'
        })

        console.log('Generated Google OAuth URL, opening in browser...')
        
        // Open the authorization URL in the default browser
        const { shell } = require('electron')
        await shell.openExternal(authUrl)

        // Wait for the callback server to receive the authorization code
        const authCode = await authCodePromise
        console.log('Received authorization code from callback')

        // Stop the callback server
        stopCallbackServer()

        // Exchange the authorization code for tokens
        console.log('Exchanging authorization code for access token...')
        const { tokens } = await oauth2Client.getToken(authCode)
        
        oauth2Client.setCredentials(tokens)
        googleAccessToken = tokens.access_token
        
        // Store refresh token if available (for future use)
        if (tokens.refresh_token) {
            await store.set('google_refresh_token', tokens.refresh_token)
        }

        console.log('Successfully obtained Google access token')
        return {
            success: true,
            message: 'Google Calendar connected successfully!'
        }
    } catch (error) {
        console.error('Failed to complete Google OAuth:', error.message)
        stopCallbackServer() // Make sure to stop the server on error
        return {
            success: false,
            error: error.message
        }
    }
})

// Get Google OAuth authorization URL (legacy - keeping for compatibility)
ipcMain.handle('get-google-auth-url', async () => {
    try {
        if (!GOOGLE_OAUTH_CLIENT_ID) {
            throw new Error('Google OAuth Client ID not configured')
        }

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
            ],
            prompt: 'consent'
        })

        console.log('Generated Google OAuth URL')
        return {
            success: true,
            authUrl: authUrl
        }
    } catch (error) {
        console.error('Failed to generate Google auth URL:', error.message)
        return {
            success: false,
            error: error.message
        }
    }
})

// Exchange authorization code for access token
ipcMain.handle('google-oauth-callback', async (event, authCode) => {
    try {
        if (!authCode) {
            throw new Error('Authorization code is required')
        }

        console.log('Exchanging authorization code for access token...')
        const { tokens } = await oauth2Client.getToken(authCode)
        
        oauth2Client.setCredentials(tokens)
        googleAccessToken = tokens.access_token
        
        // Store refresh token if available (for future use)
        if (tokens.refresh_token) {
            await store.set('google_refresh_token', tokens.refresh_token)
        }

        console.log('Successfully obtained Google access token')
        return {
            success: true,
            message: 'Google Calendar connected successfully!'
        }
    } catch (error) {
        console.error('Failed to exchange authorization code:', error.message)
        return {
            success: false,
            error: error.message
        }
    }
})

// Check if Google Calendar is authenticated
ipcMain.handle('check-google-auth', async () => {
    try {
        // Try to load existing refresh token
        const refreshToken = await store.get('google_refresh_token')
        if (refreshToken) {
            oauth2Client.setCredentials({
                refresh_token: refreshToken
            })
            
            // Try to refresh the access token
            const { credentials } = await oauth2Client.refreshAccessToken()
            oauth2Client.setCredentials(credentials)
            googleAccessToken = credentials.access_token
            
            return { authenticated: true }
        }
        
        return { authenticated: false }
    } catch (error) {
        console.log('No valid Google authentication found')
        return { authenticated: false }
    }
})

// Clear Google Calendar authentication
ipcMain.handle('clear-google-auth', async () => {
    try {
        console.log('Clearing Google Calendar authentication...')
        
        // Clear in-memory tokens
        googleAccessToken = null
        oauth2Client.setCredentials({})
        
        // Remove stored refresh token
        await store.delete('google_refresh_token')
        
        console.log('Google Calendar authentication cleared successfully')
        return {
            success: true,
            message: 'Google Calendar authentication cleared successfully'
        }
    } catch (error) {
        console.error('Failed to clear Google authentication:', error.message)
        return {
            success: false,
            error: error.message
        }
    }
})

ipcMain.handle('get-calendar-events', async (event, daysAhead = 7) => {
    try {
        if (!GOOGLE_OAUTH_CLIENT_ID) {
            throw new Error('Google OAuth Client ID not configured. Please set GOOGLE_OAUTH_CLIENT_ID in .env file.')
        }

        if (!googleAccessToken && !oauth2Client.credentials.access_token) {
            throw new Error('Google Calendar not authenticated. Please connect your Google account first.')
        }

        console.log(`Fetching events from ALL Google Calendars for next ${daysAhead} days...`)
        
        const now = new Date()
        const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000))
        
        // Create calendar API client
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        
        // First, get list of all calendars
        console.log('Fetching calendar list...')
        const calendarListResponse = await calendar.calendarList.list()
        const calendars = calendarListResponse.data.items || []
        
        console.log(`Found ${calendars.length} calendars:`)
        calendars.forEach(cal => {
            console.log(`  - ${cal.summary} (${cal.id}) - Access: ${cal.accessRole}`)
        })
        
        // Filter to only calendars we can read from
        const readableCalendars = calendars.filter(cal => 
            cal.accessRole === 'owner' || 
            cal.accessRole === 'reader' || 
            cal.accessRole === 'writer'
        )
        
        console.log(`Fetching events from ${readableCalendars.length} readable calendars...`)
        
        // Fetch events from all calendars in parallel
        const eventPromises = readableCalendars.map(async (cal) => {
            try {
                console.log(`Fetching events from: ${cal.summary}`)
                const response = await calendar.events.list({
                    calendarId: cal.id,
                    timeMin: now.toISOString(),
                    timeMax: futureDate.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 50
                })
                
                const events = response.data.items || []
                console.log(`  → Found ${events.length} events in ${cal.summary}`)
                
                // Add calendar info to each event
                return events.map(event => ({
                    ...event,
                    calendarName: cal.summary,
                    calendarId: cal.id,
                    calendarColor: cal.backgroundColor || cal.foregroundColor || '#1976d2'
                }))
            } catch (error) {
                console.error(`Failed to fetch events from calendar "${cal.summary}":`, error.message)
                return [] // Return empty array for failed calendars
            }
        })
        
        // Wait for all calendar requests to complete
        const eventArrays = await Promise.all(eventPromises)
        const allEvents = eventArrays.flat()
        
        console.log(`Retrieved total of ${allEvents.length} events from all calendars`)
        
        if (allEvents.length === 0) {
            console.log('No calendar events found across all calendars')
            return {
                success: true,
                events: [],
                totalCount: 0,
                daysAhead: daysAhead,
                calendarsChecked: readableCalendars.length
            }
        }
        
        // Process and format events
        const upcomingEvents = allEvents
            .filter(item => item.start && (item.start.dateTime || item.start.date))
            .map(item => {
                // Handle both date and dateTime events
                const startDateTime = item.start.dateTime ? new Date(item.start.dateTime) : new Date(item.start.date)
                const endDateTime = item.end.dateTime ? new Date(item.end.dateTime) : new Date(item.end.date)
                
                const eventType = classifyEventType(item.summary || 'Untitled Event', item.description)
                
                return {
                    id: item.id,
                    title: item.summary || 'Untitled Event',
                    description: item.description || '',
                    start: startDateTime,
                    end: endDateTime,
                    location: item.location || '',
                    type: eventType,
                    attendees: (item.attendees || []).map(attendee => attendee.email).filter(Boolean),
                    htmlLink: item.htmlLink,
                    calendarName: item.calendarName,
                    calendarId: item.calendarId,
                    calendarColor: item.calendarColor,
                    startFormatted: startDateTime.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    endFormatted: endDateTime.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    duration: Math.round((endDateTime - startDateTime) / (1000 * 60)), // duration in minutes
                    isToday: startDateTime.toDateString() === now.toDateString(),
                    isUpcoming: startDateTime > now,
                    googleMapsUrl: item.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}` : null
                }
            })
            .filter(event => event.isUpcoming)
            .sort((a, b) => a.start - b.start)
        
        console.log(`Processed ${upcomingEvents.length} upcoming events from ${readableCalendars.length} calendars`)
        return {
            success: true,
            events: upcomingEvents,
            totalCount: upcomingEvents.length,
            daysAhead: daysAhead,
            calendarsChecked: readableCalendars.length,
            calendarNames: readableCalendars.map(cal => cal.summary)
        }
        
    } catch (error) {
        console.error('Failed to fetch Google Calendar events:', error.message)
        
        // Provide helpful error messages
        let errorMessage = error.message
        if (error.code === 401) {
            errorMessage = 'Google Calendar authentication expired. Please reconnect your Google account.'
        } else if (error.code === 403) {
            errorMessage = 'Google Calendar API access denied. Please check your permissions.'
        } else if (error.code === 404) {
            errorMessage = 'Google Calendar not found. Please check your calendar ID.'
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Unable to connect to Google Calendar API. Please check your internet connection.'
        }
        
        return {
            success: false,
            error: errorMessage,
            events: [],
            needsAuth: error.code === 401 || error.message.includes('not authenticated')
        }
    }
})

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
    initializeDefaultServices()
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

// Get list of monitored services
ipcMain.handle('get-services', () => {
    const services = store.get('services', [])
    console.log(`Returning ${services.length} monitored services`)
    return services
})

// Add a new service to monitor
ipcMain.handle('add-service', (event, service) => {
    const services = store.get('services', [])
    
    // Check if service already exists
    const exists = services.find(s => s.name === service.name || s.url === service.url)
    if (exists) {
        return { success: false, message: 'Service already exists' }
    }
    
    services.push(service)
    store.set('services', services)
    console.log(`Added new service: ${service.name}`)
    
    return { success: true, message: 'Service added successfully' }
})

// Remove a service from monitoring
ipcMain.handle('remove-service', (event, serviceName) => {
    const services = store.get('services', [])
    const filteredServices = services.filter(s => s.name !== serviceName)
    
    if (filteredServices.length === services.length) {
        return { success: false, message: 'Service not found' }
    }
    
    store.set('services', filteredServices)
    serviceStatusHistory.delete(serviceName)
    console.log(`Removed service: ${serviceName}`)
    
    return { success: true, message: 'Service removed successfully' }
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
        
        // Clean up service monitoring timeout
        if (serviceCheckTimeout) {
            try {
                console.log('Stopping service check timeout...')
                clearTimeout(serviceCheckTimeout.timeout || serviceCheckTimeout)
            } catch (timeoutError) {
                console.warn('Failed to clear service timeout:', timeoutError.message)
            }
            serviceCheckTimeout = null
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