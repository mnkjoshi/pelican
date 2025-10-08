# Pelican Command Center - Development Guide

## Architecture Overview

Pelican follows Electron's multi-process architecture with enhanced security measures:

### Main Process (`main.js`)
- **Window Management**: Creates and manages the application window
- **System Integration**: Handles OS-specific features like app tracking
- **Data Management**: Manages configuration and persistent storage
- **Background Tasks**: Runs periodic service checks and data collection
- **Security**: Implements secure IPC communication

### Renderer Process (`renderer.js`)
- **UI Management**: Handles all user interface interactions
- **Widget System**: Manages individual dashboard widgets
- **Data Visualization**: Renders charts, graphs, and status indicators
- **Event Handling**: Processes user interactions and system events

### Preload Script (`preload.js`)
- **Security Bridge**: Safely exposes main process APIs to renderer
- **Context Isolation**: Maintains security boundaries
- **API Abstraction**: Provides clean interface for renderer

## Widget Development

### Creating a New Widget

1. **Define Widget Structure** in `index.html`:
```html
<div class="widget my-widget" id="my-widget">
    <div class="widget-header">
        <h3>My Widget</h3>
        <div class="widget-controls">
            <!-- Controls here -->
        </div>
    </div>
    <div class="widget-content" id="my-widget-content">
        <div class="loading">Loading...</div>
    </div>
</div>
```

2. **Add Widget Styles** in `styles.css`:
```css
.my-widget { 
    grid-column: 1 / 4; 
    grid-row: 2 / 3; 
}

.my-widget-specific-styles {
    /* Widget-specific styles */
}
```

3. **Implement Widget Logic** in `renderer.js`:
```javascript
async loadMyWidget() {
    const content = document.getElementById('my-widget-content');
    
    try {
        // Fetch data
        const data = await this.fetchMyWidgetData();
        
        // Render content
        content.innerHTML = this.renderMyWidget(data);
        
        // Log success
        this.addToConsole('My Widget loaded successfully', 'success');
        
    } catch (error) {
        content.innerHTML = '<div class="error">Failed to load widget</div>';
        this.addToConsole(`My Widget error: ${error.message}`, 'error');
    }
}

renderMyWidget(data) {
    return `
        <div class="my-widget-container">
            ${data.map(item => `
                <div class="my-widget-item">
                    <span class="item-title">${item.title}</span>
                    <span class="item-value">${item.value}</span>
                </div>
            `).join('')}
        </div>
    `;
}
```

4. **Add to Dashboard Initialization**:
```javascript
async loadAllWidgets() {
    await Promise.all([
        // ... existing widgets
        this.loadMyWidget()
    ]);
}
```

### Widget Best Practices

1. **Error Handling**: Always wrap widget logic in try-catch blocks
2. **Loading States**: Show loading indicators while fetching data
3. **Responsive Design**: Ensure widgets work at different sizes
4. **Performance**: Implement proper update intervals and caching
5. **Accessibility**: Use semantic HTML and proper ARIA labels

## Data Management

### Configuration System

```javascript
// Get configuration
const config = await window.pelicanAPI.getConfig('myKey');

// Set configuration
await window.pelicanAPI.setConfig('myKey', myValue);

// Use utilities for safe access
const config = await PelicanUtils.getStoredConfig('myKey', defaultValue);
```

### Data Flow Patterns

1. **Periodic Updates**: Use intervals for real-time data
2. **Event-Driven Updates**: Respond to system events
3. **Manual Refresh**: Provide user-triggered updates
4. **Caching**: Store frequently accessed data

## Service Integration

### Adding New Service Monitoring

1. **Configure Service** in settings:
```javascript
const services = await window.pelicanAPI.getConfig('services') || [];
services.push({
    name: 'My Service',
    url: 'https://myservice.com/health',
    method: 'GET',
    expectedStatus: 200,
    timeout: 5000
});
await window.pelicanAPI.setConfig('services', services);
```

2. **Implement Health Check** in main process:
```javascript
// Add to main.js service checking logic
const checkCustomService = async (service) => {
    try {
        const response = await axios({
            method: service.method || 'GET',
            url: service.url,
            timeout: service.timeout || 5000
        });
        
        return {
            name: service.name,
            status: response.status === service.expectedStatus ? 'online' : 'degraded',
            responseTime: response.duration
        };
    } catch (error) {
        return {
            name: service.name,
            status: 'offline',
            error: error.message
        };
    }
};
```

### External API Integration

1. **Secure API Keys**: Store in main process only
2. **Rate Limiting**: Implement request throttling
3. **Error Handling**: Handle network failures gracefully
4. **Caching**: Cache responses to reduce API calls

## Styling and Theming

### Color System

```css
:root {
    --primary-bg: #121212;
    --widget-bg: rgba(30, 30, 30, 0.7);
    --accent-color: #00BFFF;
    --text-primary: #F5F5F5;
    --text-secondary: #8D99AE;
    --status-success: #39FF14;
    --status-warning: #FFBF00;
    --status-error: #DC143C;
}
```

### Glassmorphism Effects

```css
.glass-effect {
    background: var(--widget-bg);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
}
```

### Animation Guidelines

```css
/* Smooth transitions */
.animated-element {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effects */
.interactive:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 191, 255, 0.2);
}
```

## Performance Optimization

### Update Intervals

```javascript
// Recommended intervals
const intervals = {
    fastUpdate: 5000,    // Real-time data (5s)
    normalUpdate: 30000, // Regular updates (30s)
    slowUpdate: 300000,  // Infrequent updates (5m)
    hourlyUpdate: 3600000 // Hourly updates
};
```

### Memory Management

```javascript
// Clear intervals on cleanup
window.addEventListener('beforeunload', () => {
    for (const interval of this.updateIntervals.values()) {
        clearInterval(interval);
    }
});

// Limit console history
while (output.children.length > 100) {
    output.removeChild(output.firstChild);
}
```

## Security Considerations

### IPC Communication

```javascript
// Main process - only expose necessary functions
ipcMain.handle('safe-operation', async (event, data) => {
    // Validate input
    if (!isValidInput(data)) {
        throw new Error('Invalid input');
    }
    
    // Process safely
    return await processSafely(data);
});
```

### Context Isolation

```javascript
// Preload script - use contextBridge
contextBridge.exposeInMainWorld('pelicanAPI', {
    safeFunction: (data) => ipcRenderer.invoke('safe-operation', data)
});
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;">
```

## Testing

### Widget Testing

```javascript
// Test widget rendering
async function testWidget() {
    const mockData = generateMockData();
    const rendered = renderWidget(mockData);
    
    // Verify rendering
    assert(rendered.includes('expected-content'));
}
```

### Integration Testing

```javascript
// Test service monitoring
async function testServiceMonitoring() {
    const services = [{ name: 'Test', url: 'http://httpstat.us/200' }];
    const results = await window.pelicanAPI.checkServiceStatus(services);
    
    assert(results[0].status === 'online');
}
```

## Deployment

### Building for Production

1. **Optimize Assets**: Minify CSS and JavaScript
2. **Security Review**: Check all IPC handlers
3. **Performance Testing**: Verify memory usage
4. **Cross-Platform Testing**: Test on different OS versions

### Distribution

```javascript
// Package configuration in package.json
{
  "build": {
    "appId": "com.pelican.commandcenter",
    "productName": "Pelican Command Center",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer.js",
      "utils.js",
      "index.html",
      "styles.css",
      "package.json"
    ]
  }
}
```

## Troubleshooting

### Common Issues

1. **Widget Not Loading**: Check console for errors
2. **Service Status Offline**: Verify network connectivity
3. **High CPU Usage**: Check update intervals
4. **Memory Leaks**: Monitor interval cleanup

### Debug Mode

```bash
npm run dev  # Starts with DevTools open
```

### Logging

```javascript
// Use console logging levels
console.info('Info message');
console.warn('Warning message');
console.error('Error message');

// Use dashboard console
this.addToConsole('Custom message', 'info');
```

## Contributing

### Code Style

- Use ES6+ features
- Follow async/await patterns
- Implement proper error handling
- Write descriptive comments
- Use meaningful variable names

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Update documentation
5. Submit pull request

### Code Review Checklist

- [ ] Security implications reviewed
- [ ] Performance impact assessed
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Cross-platform compatibility verified