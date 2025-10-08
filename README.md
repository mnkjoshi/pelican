# Pelican Command Center

A desktop command center application built with Electron.js, designed for developers, creators, and power users. Pelican serves as a personal "mission control," aggregating vital, real-time information from various services into a single, elegant dashboard.

## Features

### 🎓 Canvas LMS Integration
- Displays upcoming assignments from Canvas LMS
- Shows due dates and course information
- Real-time status indicators
- Clickable assignments that open in browser
- Scrollable assignment list

### 📅 Google Calendar Integration
- Shows upcoming events in a compact widget
- Full-screen calendar modal view with proper CSP support
- Automatic event refresh
- Professional calendar icon

### 🔄 Service Status Monitor
- Monitors uptime of your services and APIs
- Real-time status indicators (Online, Degraded, Offline)
- Configurable service endpoints
- Response time tracking
- Uptime/downtime duration tracking
- Professional refresh icon

### 📊 Application Usage Tracker
- Tracks your top 5 most-used applications (Windows)
- Enhanced browser tab detection (e.g., "brave/youtube")
- Excludes Pelican itself from tracking
- 24-hour usage statistics
- Visual usage bars with time spent
- Manual refresh button for instant updates

### 📱 Social Metrics Dashboard
- Display key social media metrics
- Site visits, Discord members, GitHub stars
- Roblox group statistics

### 💻 System Console
- Integrated console for system messages
- Real-time logging of application events
- Error tracking and notifications
- Ultra-compact scrollable container (80px max-height)

### 🎵 Music Player
- Spotify-like music player interface with professional icons
- Browse and select music folders via file dialog
- **Auto-loads default music folder** (`C:\Users\manav\Music\Main`) on startup
- **Autoplay functionality** - automatically advances to next track when current song ends
- Play/pause, next/previous track controls with Feather icons
- Shuffle mode with visual indicator
- Adjustable progress bar with time display
- Ultra-compact playlist view with track selection (60px max-height)
- Support for MP3, WAV, M4A, FLAC, OGG formats
- Highly optimized space-efficient layout

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pelican-electron
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

4. **Development mode (with DevTools):**
   ```bash
   npm run dev
   ```

## Configuration

The application uses `electron-store` for secure configuration management. Settings are automatically saved in:
- Windows: `%APPDATA%\pelican-electron\config.json`

### Service Monitoring Setup

To configure services to monitor:

1. The application comes with default sample services
2. Services are stored in the configuration with this structure:
   ```json
   {
     "services": [
       {
         "name": "My API",
         "url": "https://api.example.com/health"
       }
     ]
   }
   ```

### App Usage Tracking (Windows)

The app usage tracker requires PowerShell execution policy to allow scripts:

1. **Open PowerShell as Administrator**
2. **Set execution policy:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. **The tracker will automatically start with the application**

Usage data is logged to: `%APPDATA%\Pelican\usage.log`

## Architecture

### Main Process (`main.js`)
- Window management and OS interactions
- Background app usage tracking
- Service status monitoring
- Secure storage management
- IPC communication with renderer

### Renderer Process (`renderer.js`)
- UI management and widget rendering
- Dashboard state management
- Periodic data updates
- Event handling

### Preload Script (`preload.js`)
- Secure bridge between main and renderer processes
- Exposes only necessary APIs to the UI
- Maintains security isolation

## Design System

### Color Palette
- **Primary Background:** `#121212` (Deep Void)
- **Widget Background:** `rgba(30, 30, 30, 0.7)` (Raised Slate)
- **Primary Accent:** `#00BFFF` (Electric Blue)
- **Primary Text:** `#F5F5F5` (Cloud White)
- **Secondary Text:** `#8D99AE` (Cool Gray)
- **Success Status:** `#39FF14` (Neon Green)
- **Warning Status:** `#FFBF00` (Amber Glow)
- **Error Status:** `#DC143C` (Crimson Red)

### Typography
- **UI Font:** Inter
- **Monospace Font:** Fira Code / JetBrains Mono

### Icons
- **Icon Library:** Feather Icons (professional, open-source)
- **Integration:** CDN-based with proper CSP configuration
- **Usage:** Window controls, music player, calendar, service refresh

## Widget Layout

The dashboard uses a 12-column CSS Grid layout:

- **Canvas Widget:** Columns 1-6, Rows 1-2
- **Calendar Widget:** Columns 7-12, Rows 1-2
- **Service Status:** Columns 1-4, Row 3
- **App Usage:** Columns 5-8, Row 3
- **Social Metrics:** Columns 9-12, Row 3
- **Console:** Columns 1-12, Row 4

## API Integration

### Canvas LMS
To connect to Canvas LMS:
1. Obtain Canvas API token from your institution
2. Store securely using the configuration system
3. Update the Canvas service URL in widget code

### Google Calendar
For Google Calendar integration:
1. Set up Google Calendar API credentials
2. Implement OAuth 2.0 flow
3. Store tokens securely

## Security Features

- **Frameless Window:** Custom title bar for seamless experience
- **Context Isolation:** Secure separation between main and renderer processes
- **No Node Integration:** Prevents direct Node.js access from renderer
- **Encrypted Storage:** Sensitive data encrypted using electron-store
- **CSP Headers:** Content Security Policy for XSS protection

## Development

### Project Structure
```
pelican-electron/
├── main.js              # Main Electron process
├── preload.js           # Secure preload script
├── renderer.js          # UI logic and widget management
├── index.html           # Main application window
├── styles.css           # Glassmorphism dark theme
├── tracker.ps1          # Windows app usage tracker
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### Adding New Widgets

1. **Create widget HTML structure** in `index.html`
2. **Add widget styles** in `styles.css`
3. **Implement widget logic** in `renderer.js`
4. **Add to dashboard grid** in CSS
5. **Include in initialization** in `PelicanDashboard.loadAllWidgets()`

### Custom Services

To add new service monitoring:

```javascript
const newServices = await window.pelicanAPI.getConfig('services') || [];
newServices.push({
    name: 'My Service',
    url: 'https://myservice.com/health'
});
await window.pelicanAPI.setConfig('services', newServices);
```

## Troubleshooting

### App Usage Tracker Not Working
- Ensure PowerShell execution policy allows scripts
- Check if `%APPDATA%\Pelican\usage.log` is being created
- Run PowerShell as administrator if needed

### Service Status Always Offline
- Check if the service URLs are accessible
- Verify CORS headers if checking web services
- Ensure network connectivity

### High CPU Usage
- Reduce update intervals in `renderer.js`
- Check if background processes are running efficiently
- Monitor console for excessive logging

### Cache Permission Errors
- Cache errors like "Unable to move the cache" are normal on some systems
- These don't affect functionality and can be safely ignored
- Application will continue to work properly despite these warnings

### DevTools Autofill Warnings
- DevTools may show autofill-related warnings - these are harmless
- Only appear in development mode and don't affect production usage

### Application Close Errors
- Fixed with improved cleanup handlers
- Resources are now properly cleaned up on exit
- SIGINT/SIGTERM signals handled gracefully

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Version History

- **v0.1.0** - Initial release with core dashboard functionality
  - Canvas LMS integration (mock data)
  - Google Calendar widget
  - Service status monitoring
  - App usage tracking (Windows)
  - Social metrics dashboard
  - System console
  - Glassmorphism dark theme

## Support

For issues and feature requests, please use the GitHub issue tracker.