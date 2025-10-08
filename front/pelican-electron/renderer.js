// Pelican Command Center - Renderer Process
class PelicanDashboard {
    constructor() {
        this.isInitialized = false;
        this.updateIntervals = new Map();
        this.init();
    }

    async init() {
        console.log('Initializing Pelican Command Center...');
        await this.initializeDefaultConfig();
        await this.loadAllWidgets();
        this.setupEventListeners();
        this.startPeriodicUpdates();
        this.isInitialized = true;
        this.addToConsole('Pelican Command Center initialized successfully', 'success');
    }

    async initializeDefaultConfig() {
        // Set default configuration if not exists
        const defaultServices = await window.pelicanAPI.getConfig('services') || [
            { name: 'Portfolio Site', url: 'https://httpstat.us/200' },
            { name: 'Discord Bot', url: 'https://httpstat.us/200' },
            { name: 'Backend API', url: 'https://httpstat.us/200' }
        ];
        
        const defaultSocials = await window.pelicanAPI.getConfig('socials') || {
            siteVisits: 1247,
            discordMembers: 892,
            robloxMembers: 15634,
            githubStars: 47
        };

        await window.pelicanAPI.setConfig('services', defaultServices);
        await window.pelicanAPI.setConfig('socials', defaultSocials);
    }

    async loadAllWidgets() {
        await Promise.all([
            this.loadCanvasWidget(),
            this.loadCalendarWidget(),
            this.loadServiceStatusWidget(),
            this.loadAppUsageWidget(),
            this.loadSocialsWidget(),
            this.loadMusicWidget()
        ]);
    }

    // Canvas LMS Widget
    async loadCanvasWidget() {
        const content = document.getElementById('canvas-content');
        const status = document.getElementById('canvas-status');
        
        // Show loading state
        content.innerHTML = '<div class="loading">Loading Canvas assignments...</div>';
        status.innerHTML = '<span class="status-indicator status-loading"></span> Loading...';
        
        try {
            console.log('Fetching Canvas assignments...');
            
            // Get Canvas deadlines from main process
            const result = await window.pelicanAPI.invoke('get-canvas-deadlines', 7); // Get deadlines for next 7 days
            
            if (result.success) {
                const assignments = result.deadlines; // Show all upcoming assignments (no limit)
                
                content.innerHTML = this.renderAssignments(assignments);
                status.innerHTML = `<span class="status-indicator status-online"></span> ${result.totalCount} upcoming`;
                
                this.addToConsole(`Canvas: Loaded ${result.totalCount} upcoming assignments`, 'success');
            } else {
                throw new Error(result.error || 'Failed to fetch Canvas data');
            }
            
        } catch (error) {
            console.error('Canvas widget error:', error);
            content.innerHTML = `
                <div class="error">
                    <div class="error-title">Canvas Connection Failed</div>
                    <div class="error-message">${error.message}</div>
                    <button onclick="dashboard.loadCanvasWidget()" class="retry-btn">Retry</button>
                </div>
            `;
            status.innerHTML = '<span class="status-indicator status-offline"></span> Offline';
            this.addToConsole(`Canvas widget error: ${error.message}`, 'error');
        }
    }

    renderAssignments(assignments) {
        if (assignments.length === 0) {
            return '<div class="no-data">No upcoming assignments</div>';
        }

        return `
            <div class="assignment-list">
                ${assignments.map(assignment => {
                    const isOverdue = new Date(assignment.dueDate) < new Date();
                    const urgencyClass = this.getAssignmentUrgency(assignment.dueDate);
                    
                    return `
                        <div class="assignment-item ${urgencyClass}" onclick="openCanvasAssignment('${assignment.url || '#'}')">
                            <div class="assignment-header">
                                <div class="assignment-title">${assignment.title}</div>
                                ${assignment.points ? `<div class="assignment-points">${assignment.points} pts</div>` : ''}
                            </div>
                            <div class="assignment-course">${assignment.courseCode || assignment.course}</div>
                            <div class="assignment-due ${isOverdue ? 'overdue' : ''}">
                                ${isOverdue ? 'Overdue: ' : 'Due: '}${assignment.dueDateFormatted}
                            </div>
                            ${assignment.submitted ? '<div class="assignment-status submitted">✓ Submitted</div>' : '<div class="assignment-status pending">⏱ Pending</div>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    getAssignmentUrgency(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const hoursUntilDue = (due - now) / (1000 * 60 * 60);
        
        if (hoursUntilDue < 0) return 'overdue';
        if (hoursUntilDue < 24) return 'urgent';
        if (hoursUntilDue < 72) return 'soon';
        return 'normal';
    }

    // Google Calendar Widget
    async loadCalendarWidget() {
        const content = document.getElementById('calendar-content');
        
        // Show loading state
        content.innerHTML = '<div class="loading">Loading calendar events...</div>';
        
        try {
            // First check if Google Calendar is authenticated
            const authStatus = await window.pelicanAPI.checkGoogleAuth();
            
            if (!authStatus.authenticated) {
                content.innerHTML = await this.renderGoogleAuthSetup();
                return;
            }
            
            console.log('Fetching calendar events...');
            
            // Get calendar events from main process
            const result = await window.pelicanAPI.invoke('get-calendar-events', 7); // Next 7 days
            
            if (result.success) {
                const events = result.events.slice(0, 4); // Show top 4 in widget
                
                content.innerHTML = this.renderEvents(events);
                
                // Enhanced logging with calendar information
                const calendarInfo = result.calendarsChecked ? ` from ${result.calendarsChecked} calendars` : '';
                const calendarNames = result.calendarNames ? ` (${result.calendarNames.join(', ')})` : '';
                this.addToConsole(`Calendar: Loaded ${result.totalCount} upcoming events${calendarInfo}${calendarNames}`, 'success');
            } else if (result.needsAuth) {
                content.innerHTML = await this.renderGoogleAuthSetup();
            } else {
                throw new Error(result.error || 'Failed to fetch calendar data');
            }
            
        } catch (error) {
            console.error('Calendar widget error:', error);
            content.innerHTML = `
                <div class="error">
                    <div class="error-title">Calendar Connection Failed</div>
                    <div class="error-message">${error.message}</div>
                    <button onclick="dashboard.loadCalendarWidget()" class="retry-btn">Retry</button>
                </div>
            `;
            this.addToConsole(`Calendar widget error: ${error.message}`, 'error');
        }
    }

    async renderGoogleAuthSetup() {
        // Check if already authenticated
        const authStatus = await window.pelicanAPI.checkGoogleAuth();
        
        if (authStatus.authenticated) {
            return `
                <div class="google-auth-setup authenticated">
                    <div class="auth-title">Google Calendar Connected</div>
                    <div class="auth-description">
                        Your Google Calendar is connected and syncing
                    </div>
                    <div class="auth-buttons">
                        <button onclick="disconnectGoogleCalendar()" class="disconnect-btn">
                            <i data-feather="x-circle"></i>
                            Disconnect Account
                        </button>
                        <button onclick="refreshCalendarEvents()" class="refresh-btn">
                            <i data-feather="refresh-cw"></i>
                            Refresh Events
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="google-auth-setup">
                    <div class="auth-title">Connect Google Calendar</div>
                    <div class="auth-description">
                        Connect your Google account to view your calendar events
                    </div>
                    <button onclick="connectGoogleCalendar()" class="connect-btn">
                        <i data-feather="calendar"></i>
                        Connect Google Calendar
                    </button>
                    <div class="auth-note">
                        Your calendar data stays private and secure
                    </div>
                </div>
            `;
        }
    }

    renderEvents(events) {
        if (events.length === 0) {
            return '<div class="no-data">No upcoming events</div>';
        }

        return `
            <div class="event-list">
                ${events.map(event => `
                    <div class="event-item ${event.type || ''}" onclick="openEventDetails('${event.id}')">
                        <div class="event-header">
                            <div class="event-title">${event.title}</div>
                            <div class="event-type ${event.type || 'default'}">${this.formatEventType(event.type)}</div>
                        </div>
                        <div class="event-time">${event.startFormatted}</div>
                        ${event.calendarName ? `
                            <div class="event-calendar" style="color: ${event.calendarColor || '#666'}">
                                <i data-feather="calendar"></i>
                                ${event.calendarName}
                            </div>
                        ` : ''}
                        ${event.location ? `
                            <div class="event-location" onclick="event.stopPropagation(); openGoogleMaps('${event.googleMapsUrl}')">
                                <i data-feather="map-pin"></i>
                                ${this.truncateLocation(event.location)}
                            </div>
                        ` : ''}
                        <div class="event-duration">${event.duration} min</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatEventType(type) {
        const types = {
            'class': 'Class',
            'meeting': 'Meeting', 
            'exam': 'Exam',
            'study': 'Study',
            'personal': 'Personal',
            'seminar': 'Seminar',
            'default': 'Event'
        };
        return types[type] || 'Event';
    }

    truncateLocation(location) {
        if (location.length > 30) {
            return location.substring(0, 30) + '...';
        }
        return location;
    }

    // Service Status Widget
    async loadServiceStatusWidget() {
        const content = document.getElementById('status-content');
        
        try {
            const services = await window.pelicanAPI.getConfig('services');
            const statuses = await window.pelicanAPI.checkServiceStatus(services);
            
            content.innerHTML = this.renderServiceStatus(statuses);
            
        } catch (error) {
            content.innerHTML = '<div class="error">Unable to check service status</div>';
            this.addToConsole(`Service status error: ${error.message}`, 'error');
        }
    }

    renderServiceStatus(statuses) {
        return `
            <div class="service-list">
                ${statuses.map(service => `
                    <div class="service-item">
                        <span class="service-name">${service.name}</span>
                        <div class="service-status">
                            <div class="service-status-line">
                                <span class="status-indicator status-${service.status}"></span>
                                <span>${service.status.charAt(0).toUpperCase() + service.status.slice(1)}</span>
                                ${service.responseTime ? `<span>(${service.responseTime}ms)</span>` : ''}
                            </div>
                            ${service.uptime !== undefined ? 
                                `<div class="service-uptime">Up: ${this.formatDuration(service.uptime)}</div>` : 
                                service.downtime !== undefined ? 
                                `<div class="service-uptime">Down: ${this.formatDuration(service.downtime)}</div>` : ''
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // App Usage Widget
    async loadAppUsageWidget() {
        const content = document.getElementById('usage-content');
        
        try {
            const usageData = await window.pelicanAPI.getUsageData();
            content.innerHTML = this.renderAppUsage(usageData);
            
        } catch (error) {
            content.innerHTML = '<div class="error">Unable to load usage data</div>';
            this.addToConsole(`App usage error: ${error.message}`, 'error');
        }
    }

    renderAppUsage(usageData) {
        if (usageData.length === 0) {
            return '<div class="no-data">No usage data available</div>';
        }

        const maxUsage = Math.max(...usageData.map(app => app.usage));
        
        return `
            <div class="usage-list">
                ${usageData.map(app => `
                    <div class="usage-item">
                        <div class="usage-header">
                            <span class="usage-name">${app.name}</span>
                            <span class="usage-time">${this.formatDuration(app.usage)}</span>
                        </div>
                        <div class="usage-bar">
                            <div class="usage-fill" style="width: ${(app.usage / maxUsage) * 100}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Analytics Widget (Roblox + GitHub)
    async loadSocialsWidget() {
        const content = document.getElementById('socials-content');
        content.innerHTML = '<div class="loading">Loading analytics...</div>';
        
        try {
            this.addToConsole('Analytics: Fetching Roblox game visits and GitHub commits...', 'info');
            const analyticsData = await window.pelicanAPI.getAnalyticsData();
            content.innerHTML = this.renderSocialMetrics(analyticsData);
            
            // Log successful data fetch
            this.addToConsole(`Analytics: ${analyticsData.totalGamePlays.toLocaleString()} total Roblox game plays`, 'success');
            this.addToConsole(`Analytics: ${analyticsData.commitsThisWeek} GitHub commits this week`, 'success');
            
        } catch (error) {
            content.innerHTML = '<div class="error">Unable to load analytics data</div>';
            this.addToConsole(`Analytics error: ${error.message}`, 'error');
        }
    }

    renderSocialMetrics(analytics) {
        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${this.formatNumber(analytics.totalGamePlays)}</div>
                    <div class="metric-label">Game Plays</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${analytics.commitsThisWeek}</div>
                    <div class="metric-label">Commits This Week</div>
                </div>
            </div>
        `;
    }

    // Utility functions for formatting
    formatDate(date) {
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        
        return date.toLocaleDateString();
    }

    formatDateTime(date) {
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();
        
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) return `Today ${timeStr}`;
        if (isTomorrow) return `Tomorrow ${timeStr}`;
        return `${date.toLocaleDateString()} ${timeStr}`;
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    // Event listeners and periodic updates
    setupEventListeners() {
        // Service status update listener
        window.pelicanAPI.onServiceUpdate(() => {
            this.loadServiceStatusWidget();
        });
    }

    startPeriodicUpdates() {
        // Update app usage every 30 seconds
        this.updateIntervals.set('usage', setInterval(() => {
            this.loadAppUsageWidget();
        }, 30000));

        // Update service status every 60 seconds
        this.updateIntervals.set('services', setInterval(() => {
            this.loadServiceStatusWidget();
        }, 60000));

        // Update calendar every 5 minutes
        this.updateIntervals.set('calendar', setInterval(() => {
            this.loadCalendarWidget();
        }, 300000));

        // Update social metrics every 10 minutes
        this.updateIntervals.set('socials', setInterval(() => {
            this.loadSocialsWidget();
        }, 600000));
    }

    // Music Player Widget
    async loadMusicWidget() {
        const content = document.getElementById('music-content');
        
        try {
            // Initialize music player state
            this.musicState = {
                currentTrack: null,
                currentIndex: 0,
                isPlaying: false,
                isShuffled: false,
                autoplay: true, // Autoplay enabled by default
                playlist: [],
                currentTime: 0,
                duration: 0
            };
            
            // Initialize volume control state
            this.previousVolume = 0.5;
            
            // Set up audio element listeners
            this.setupAudioListeners();
            
            this.addToConsole('Music player initialized', 'success');
            
        } catch (error) {
            content.innerHTML = '<div class="error">Unable to initialize music player</div>';
            this.addToConsole(`Music player error: ${error.message}`, 'error');
        }
    }

    setupAudioListeners() {
        const audio = document.getElementById('audio-player');
        const progressBar = document.getElementById('progress-bar');
        const volumeBar = document.getElementById('volume-bar');
        const volumeDisplay = document.getElementById('volume-display');
        const volumeIcon = document.getElementById('volume-icon-header');
        const currentTimeEl = document.getElementById('current-time');
        const totalTimeEl = document.getElementById('total-time');
        
        // Set initial volume
        audio.volume = 0.5; // 50%
        
        // Volume control listeners
        volumeBar.addEventListener('input', () => {
            const volume = volumeBar.value / 100;
            audio.volume = volume;
            volumeDisplay.textContent = volumeBar.value + '%';
            
            // Update volume icon based on level
            if (volume === 0) {
                volumeIcon.setAttribute('data-feather', 'volume-x');
            } else if (volume < 0.5) {
                volumeIcon.setAttribute('data-feather', 'volume-1');
            } else {
                volumeIcon.setAttribute('data-feather', 'volume-2');
            }
            
            // Refresh feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
        
        // Click volume icon to mute/unmute
        volumeIcon.addEventListener('click', () => {
            if (audio.volume > 0) {
                // Mute
                this.previousVolume = audio.volume;
                audio.volume = 0;
                volumeBar.value = 0;
                volumeDisplay.textContent = '0%';
                volumeIcon.setAttribute('data-feather', 'volume-x');
            } else {
                // Unmute
                const restoreVolume = this.previousVolume || 0.5;
                audio.volume = restoreVolume;
                volumeBar.value = restoreVolume * 100;
                volumeDisplay.textContent = Math.round(restoreVolume * 100) + '%';
                
                if (restoreVolume < 0.5) {
                    volumeIcon.setAttribute('data-feather', 'volume-1');
                } else {
                    volumeIcon.setAttribute('data-feather', 'volume-2');
                }
            }
            
            // Refresh feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
        
        audio.addEventListener('loadedmetadata', () => {
            this.musicState.duration = audio.duration;
            totalTimeEl.textContent = this.formatAudioTime(audio.duration);
            progressBar.max = audio.duration;
        });
        
        audio.addEventListener('timeupdate', () => {
            this.musicState.currentTime = audio.currentTime;
            currentTimeEl.textContent = this.formatAudioTime(audio.currentTime);
            progressBar.value = audio.currentTime;
        });
        
        audio.addEventListener('ended', () => {
            // Auto-advance to next track if autoplay is enabled
            if (window.dashboard && 
                window.dashboard.musicState.playlist.length > 0 && 
                window.dashboard.musicState.autoplay) {
                
                nextTrack().then(() => {
                    // Log the autoplay action
                    window.dashboard.addToConsole('Auto-playing next track', 'info');
                }).catch(error => {
                    window.dashboard.addToConsole(`Autoplay error: ${error.message}`, 'error');
                });
            } else if (window.dashboard && !window.dashboard.musicState.autoplay) {
                // Stop playing and update UI when autoplay is disabled
                window.dashboard.musicState.isPlaying = false;
                const playIcon = document.getElementById('play-pause-icon');
                playIcon.setAttribute('data-feather', 'play');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                window.dashboard.addToConsole('Track ended - autoplay disabled', 'info');
            }
        });
        
        progressBar.addEventListener('input', () => {
            audio.currentTime = progressBar.value;
        });
    }

    updatePlaylist(tracks) {
        const playlist = document.getElementById('playlist');
        
        if (tracks.length === 0) {
            playlist.innerHTML = '<div class="no-data">No music files loaded</div>';
            return;
        }
        
        playlist.innerHTML = tracks.map((track, index) => `
            <div class="playlist-item ${index === this.musicState.currentIndex ? 'active' : ''}" 
                 onclick="selectTrack(${index})">
                <span class="playlist-item-name">${track.name}</span>
                <span class="playlist-item-duration">${this.formatAudioTime(track.duration || 0)}</span>
            </div>
        `).join('');
        
        // Re-initialize Feather icons if available
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    formatAudioTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    addToConsole(message, type = 'info') {
        const output = document.getElementById('console-output');
        const timestamp = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = `[${timestamp}] ${message}`;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
        
        // Keep only last 100 lines
        while (output.children.length > 100) {
            output.removeChild(output.firstChild);
        }
    }
}

// Global functions for UI interactions
async function openCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    const body = modal.querySelector('.modal-body');
    
    // Show modal and loading state
    modal.classList.add('active');
    body.innerHTML = '<div class="loading">Loading calendar events...</div>';
    
    try {
        console.log('Fetching full calendar events for modal...');
        const result = await window.pelicanAPI.invoke('get-calendar-events', 14); // Next 2 weeks
        
        if (result.success) {
            body.innerHTML = renderCalendarModal(result.events);
            // Initialize feather icons for the new content
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            if (window.dashboard) {
                window.dashboard.addToConsole(`Calendar: Loaded ${result.totalCount} events for modal`, 'success');
            }
        } else {
            throw new Error(result.error || 'Failed to fetch calendar events');
        }
        
    } catch (error) {
        console.error('Calendar modal error:', error);
        body.innerHTML = `
            <div class="error">
                <div class="error-title">Failed to Load Calendar</div>
                <div class="error-message">${error.message}</div>
                <button onclick="openCalendarModal()" class="retry-btn">Retry</button>
            </div>
        `;
        if (window.dashboard) {
            window.dashboard.addToConsole(`Calendar modal error: ${error.message}`, 'error');
        }
    }
}

function closeCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    modal.classList.remove('active');
}

function renderCalendarModal(events) {
    if (events.length === 0) {
        return '<div class="no-data">No upcoming events in the next 2 weeks</div>';
    }
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
        const dateKey = event.start.toDateString();
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    return `
        <div class="calendar-view">
            ${Object.entries(eventsByDate).map(([dateKey, dayEvents]) => `
                <div class="calendar-day">
                    <div class="day-header">
                        <h3>${new Date(dateKey).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</h3>
                        <span class="event-count">${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="day-events">
                        ${dayEvents.map(event => `
                            <div class="calendar-event-item ${event.type}">
                                <div class="event-time-badge">
                                    ${event.start.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </div>
                                <div class="event-details">
                                    <div class="event-title">${event.title}</div>
                                    ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                                    ${event.location ? `
                                        <div class="event-location-full" onclick="openGoogleMaps('${event.googleMapsUrl}')">
                                            <i data-feather="map-pin"></i>
                                            ${event.location}
                                        </div>
                                    ` : ''}
                                    <div class="event-meta">
                                        <span class="event-duration">${event.duration} minutes</span>
                                        <span class="event-type-badge ${event.type}">${window.dashboard.formatEventType(event.type)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function openGoogleMaps(mapsUrl) {
    if (mapsUrl) {
        await window.pelicanAPI.openExternal(mapsUrl);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Opened Google Maps: ${mapsUrl}`, 'info');
        }
    }
}

async function openEventDetails(eventId) {
    // For now, just log the event click - could expand to show more details
    if (window.dashboard) {
        window.dashboard.addToConsole(`Event clicked: ${eventId}`, 'info');
    }
}

// Google Calendar Authentication
async function connectGoogleCalendar() {
    try {
        if (window.dashboard) {
            window.dashboard.addToConsole('Starting Google Calendar authentication...', 'info');
        }
        
        // Use the new streamlined OAuth flow
        const authResult = await window.pelicanAPI.startGoogleOAuth();
        
        if (authResult.success) {
            if (window.dashboard) {
                window.dashboard.addToConsole('Google Calendar connected successfully!', 'success');
            }
            
            // Refresh the calendar events
            await updateCalendarEvents();
        } else {
            throw new Error(authResult.error);
        }
    } catch (error) {
        console.error('Google auth error:', error);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Google auth error: ${error.message}`, 'error');
        }
    }
}

// Disconnect Google Calendar
async function disconnectGoogleCalendar() {
    try {
        if (window.dashboard) {
            window.dashboard.addToConsole('Disconnecting Google Calendar...', 'info');
        }
        
        const result = await window.pelicanAPI.clearGoogleAuth();
        
        if (result.success) {
            if (window.dashboard) {
                window.dashboard.addToConsole('Google Calendar disconnected successfully!', 'success');
            }
            
            // Refresh the calendar widget to show the connect button again
            await updateCalendarEvents();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Google disconnect error:', error);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Google disconnect error: ${error.message}`, 'error');
        }
    }
}

// Refresh calendar events
async function refreshCalendarEvents() {
    await updateCalendarEvents();
    if (window.dashboard) {
        window.dashboard.addToConsole('Calendar events refreshed', 'info');
    }
}

function showGoogleAuthModal() {
    // Create modal for auth code input
    const modalHtml = `
        <div class="modal-overlay" id="google-auth-modal" onclick="closeGoogleAuthModal()">
            <div class="modal-content google-auth-modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Google Calendar Authorization</h2>
                    <button class="close-modal-btn" onclick="closeGoogleAuthModal()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="auth-instructions">
                        <p>1. A Google authorization page should have opened in your browser</p>
                        <p>2. Sign in to your Google account and grant calendar permissions</p>
                        <p>3. Copy the authorization code and paste it below:</p>
                    </div>
                    <div class="auth-code-input">
                        <label for="auth-code">Authorization Code:</label>
                        <input type="text" id="auth-code" placeholder="Paste authorization code here..." />
                        <button onclick="submitGoogleAuthCode()" class="submit-auth-btn">
                            Connect Calendar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    document.getElementById('google-auth-modal').classList.add('active');
    
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('auth-code').focus();
    }, 100);
}

function closeGoogleAuthModal() {
    const modal = document.getElementById('google-auth-modal');
    if (modal) {
        modal.remove();
    }
}

async function submitGoogleAuthCode() {
    const authCodeInput = document.getElementById('auth-code');
    const authCode = authCodeInput.value.trim();
    
    if (!authCode) {
        alert('Please enter the authorization code');
        return;
    }
    
    try {
        const result = await window.pelicanAPI.googleOAuthCallback(authCode);
        
        if (result.success) {
            closeGoogleAuthModal();
            
            // Reload calendar widget
            if (window.dashboard) {
                window.dashboard.addToConsole('Google Calendar connected successfully!', 'success');
                await window.dashboard.loadCalendarWidget();
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Auth code submission error:', error);
        alert(`Error: ${error.message}`);
        
        if (window.dashboard) {
            window.dashboard.addToConsole(`Auth error: ${error.message}`, 'error');
        }
    }
}

function openUploadModal() {
    const modal = document.getElementById('upload-modal');
    const input = document.getElementById('music-link-input');
    
    // Clear any previous input
    input.value = '';
    modal.classList.add('active');
    
    // Focus on the input field
    setTimeout(() => {
        input.focus();
    }, 100);
    
    // Add Enter key listener if not already added
    if (!input.hasAttribute('data-enter-listener')) {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                processUploadLink();
            }
        });
        input.setAttribute('data-enter-listener', 'true');
    }
}

function closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    const input = document.getElementById('music-link-input');
    
    modal.classList.remove('active');
    input.value = '';
}

// Grades Modal Functions
async function openGradesModal() {
    const modal = document.getElementById('grades-modal');
    const container = document.getElementById('grades-container');
    
    // Show modal and loading state
    modal.classList.add('active');
    container.innerHTML = '<div class="loading">Loading Canvas grades...</div>';
    
    try {
        console.log('Fetching Canvas grades for modal...');
        const result = await window.pelicanAPI.invoke('get-canvas-grades');
        
        if (result.success) {
            container.innerHTML = renderGradesModal(result);
            if (window.dashboard) {
                window.dashboard.addToConsole(`Canvas: Loaded grades for ${result.totalCourses} courses`, 'success');
            }
        } else {
            throw new Error(result.error || 'Failed to fetch Canvas grades');
        }
        
    } catch (error) {
        console.error('Grades modal error:', error);
        container.innerHTML = `
            <div class="error">
                <div class="error-title">Failed to Load Grades</div>
                <div class="error-message">${error.message}</div>
                <button onclick="openGradesModal()" class="retry-btn">Retry</button>
            </div>
        `;
        if (window.dashboard) {
            window.dashboard.addToConsole(`Grades modal error: ${error.message}`, 'error');
        }
    }
}

function closeGradesModal() {
    const modal = document.getElementById('grades-modal');
    modal.classList.remove('active');
}

function renderGradesModal(data) {
    const { grades, overallGPA, totalCourses } = data;
    
    if (grades.length === 0) {
        return '<div class="no-data">No grade data available</div>';
    }
    
    // Calculate some statistics
    const gradesWithScores = grades.filter(g => g.currentScore !== null);
    const avgScore = gradesWithScores.length > 0 
        ? (gradesWithScores.reduce((sum, g) => sum + g.currentScore, 0) / gradesWithScores.length).toFixed(1)
        : 'N/A';
    
    return `
        <div class="grades-overview">
            <div class="gpa-card">
                <div class="gpa-value">${overallGPA ? overallGPA.toFixed(2) : 'N/A'}</div>
                <div class="gpa-label">Estimated GPA</div>
            </div>
            <div class="stats-card">
                <div class="stat-item">
                    <span class="stat-value">${totalCourses}</span>
                    <span class="stat-label">Courses</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${avgScore}%</span>
                    <span class="stat-label">Average</span>
                </div>
            </div>
        </div>
        
        <div class="grades-list">
            ${grades.map(grade => `
                <div class="grade-item" onclick="openCanvasAssignment('${grade.url}')">
                    <div class="grade-header">
                        <div class="course-info">
                            <div class="course-name">${grade.courseName}</div>
                            <div class="course-code">${grade.courseCode}</div>
                        </div>
                        <div class="grade-display">
                            <div class="current-grade ${getGradeClass(grade.currentScore)}">${grade.currentGrade}</div>
                            ${grade.currentScore !== null ? `<div class="grade-percent">${grade.currentScore.toFixed(1)}%</div>` : ''}
                        </div>
                    </div>
                    ${grade.classAverage ? `
                        <div class="grade-comparison">
                            <div class="comparison-bar">
                                <div class="your-score" style="width: ${Math.min(grade.currentScore || 0, 100)}%"></div>
                                <div class="class-avg-marker" style="left: ${Math.min(grade.classAverage, 100)}%">
                                    <span class="avg-label">Class: ${grade.classAverage}%</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function getGradeClass(score) {
    if (score === null) return 'grade-na';
    if (score >= 90) return 'grade-a';
    if (score >= 80) return 'grade-b';
    if (score >= 70) return 'grade-c';
    if (score >= 60) return 'grade-d';
    return 'grade-f';
}

async function processUploadLink() {
    const input = document.getElementById('music-link-input');
    const link = input.value.trim();
    
    if (!link) {
        window.dashboard.addToConsole('Please enter a valid link', 'error');
        return;
    }
    
    // Validate that it's a YouTube link
    const isYouTubeLink = link.includes('youtube.com') || link.includes('youtu.be');
    
    if (!isYouTubeLink) {
        window.dashboard.addToConsole('Currently only YouTube links are supported', 'error');
        return;
    }
    
    // Close the modal first
    closeUploadModal();
    
    // Show processing message
    window.dashboard.addToConsole(`Starting download: ${link}`, 'info');
    window.dashboard.addToConsole(`Trying multiple download methods...`, 'info');
    window.dashboard.addToConsole(`Note: Some videos may be blocked by YouTube`, 'warning');
    
    try {
        // Download the audio
        const result = await window.pelicanAPI.downloadYouTubeAudio(link);
        
        if (result.success) {
            window.dashboard.addToConsole(`Successfully downloaded: ${result.title}`, 'success');
            
            // Create a track object to add to the playlist
            const newTrack = {
                name: result.title || 'Downloaded Audio',
                path: result.filePath,
                size: 'Downloaded',
                duration: result.duration || 0
            };
            
            // Add the track to the current playlist
            if (window.dashboard && window.dashboard.musicState) {
                window.dashboard.musicState.playlist.push(newTrack);
                
                // Update the playlist in main process
                await window.pelicanAPI.musicControl('setPlaylist', { 
                    tracks: window.dashboard.musicState.playlist 
                });
                
                // Update the UI
                window.dashboard.updatePlaylist(window.dashboard.musicState.playlist);
                
                window.dashboard.addToConsole(`Added "${result.title}" to playlist`, 'success');
            }
            
        } else {
            window.dashboard.addToConsole(`Download failed: ${result.message}`, 'error');
        }
        
    } catch (error) {
        window.dashboard.addToConsole(`Download error: ${error.message}`, 'error');
        console.error('YouTube download error:', error);
    }
}

function refreshServices() {
    if (window.dashboard) {
        window.dashboard.loadServiceStatusWidget();
        window.dashboard.addToConsole('Service status refreshed manually', 'info');
    }
}

function refreshAppUsage() {
    if (window.dashboard) {
        window.dashboard.loadAppUsageWidget();
        window.dashboard.addToConsole('App usage data refreshed manually', 'info');
    }
}

function clearConsole() {
    const output = document.getElementById('console-output');
    output.innerHTML = '<div class="console-line">Console cleared</div>';
}

// Assignment clicking functionality
async function openAssignment(url) {
    if (url && url !== '#') {
        await window.pelicanAPI.openExternal(url);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Opened assignment: ${url}`, 'info');
        }
    }
}

// Canvas assignment clicking functionality
async function openCanvasAssignment(url) {
    if (url && url !== '#') {
        await window.pelicanAPI.openExternal(url);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Opened Canvas assignment: ${url}`, 'info');
        }
    }
}

// Music Player Controls
async function selectMusicFolder() {
    try {
        const folderPath = await window.pelicanAPI.selectMusicFolder();
        
        if (folderPath) {
            const tracks = await window.pelicanAPI.scanMusicFolder(folderPath);
            
            if (window.dashboard) {
                // Set playlist in renderer state
                window.dashboard.musicState.playlist = tracks;
                window.dashboard.musicState.currentIndex = 0;
                
                // Send playlist to main process for navigation controls
                await window.pelicanAPI.musicControl('setPlaylist', { tracks: tracks });
                
                // Update UI
                window.dashboard.updatePlaylist(tracks);
                window.dashboard.addToConsole(`Loaded ${tracks.length} music files from ${folderPath}`, 'success');
            }
        }
    } catch (error) {
        if (window.dashboard) {
            window.dashboard.addToConsole(`Failed to load music folder: ${error.message}`, 'error');
        }
    }
}

async function autoLoadDefaultMusicFolder() {
    try {
        const result = await window.pelicanAPI.autoLoadDefaultMusic();
        if (result.success && result.tracks && result.tracks.length > 0) {
            if (window.dashboard) {
                // Set playlist in renderer state
                window.dashboard.musicState.playlist = result.tracks;
                window.dashboard.musicState.currentIndex = 0;
                
                // Send playlist to main process for navigation controls
                await window.pelicanAPI.musicControl('setPlaylist', { tracks: result.tracks });
                
                // Update UI
                window.dashboard.updatePlaylist(result.tracks);
                window.dashboard.addToConsole(`Auto-loaded ${result.tracks.length} music files from ${result.path}`, 'success');
                
                // Update the current track display
                const currentTrackTitle = document.getElementById('current-track-title');
                const currentTrackArtist = document.getElementById('current-track-artist');
                
                if (currentTrackTitle && currentTrackArtist) {
                    currentTrackTitle.textContent = 'Ready to play';
                    currentTrackArtist.textContent = `${result.tracks.length} tracks loaded`;
                }
                
                // Initialize autoplay button state
                const autoplayBtn = document.getElementById('autoplay-btn');
                if (autoplayBtn && window.dashboard.musicState.autoplay) {
                    autoplayBtn.classList.add('active');
                }
            }
        } else if (!result.success) {
            if (window.dashboard) {
                window.dashboard.addToConsole(`Default music folder not found: C:\\Users\\manav\\Music\\Main`, 'info');
            }
        }
    } catch (error) {
        if (window.dashboard) {
            window.dashboard.addToConsole(`Failed to auto-load default music folder: ${error.message}`, 'error');
        }
    }
}

function toggleAutoplay() {
    if (window.dashboard) {
        // Toggle the autoplay state
        window.dashboard.musicState.autoplay = !window.dashboard.musicState.autoplay;
        
        // Update button visual state
        const autoplayBtn = document.getElementById('autoplay-btn');
        if (autoplayBtn) {
            if (window.dashboard.musicState.autoplay) {
                autoplayBtn.classList.add('active');
            } else {
                autoplayBtn.classList.remove('active');
            }
        }
        
        // Log the change
        const status = window.dashboard.musicState.autoplay ? 'enabled' : 'disabled';
        window.dashboard.addToConsole(`Autoplay ${status}`, 'info');
    }
}

function switchUploadMethod(method) {
    const urlTab = document.getElementById('url-tab');
    const fileTab = document.getElementById('file-tab');
    const urlMethod = document.getElementById('url-method');
    const fileMethod = document.getElementById('file-method');
    
    if (method === 'url') {
        urlTab.classList.add('active');
        fileTab.classList.remove('active');
        urlMethod.classList.remove('hidden');
        fileMethod.classList.add('hidden');
    } else {
        fileTab.classList.add('active');
        urlTab.classList.remove('active');
        fileMethod.classList.remove('hidden');
        urlMethod.classList.add('hidden');
    }
}

async function processFileUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        window.dashboard.addToConsole('Please select a file first', 'error');
        return;
    }
    
    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
        window.dashboard.addToConsole('Please select an audio file', 'error');
        return;
    }
    
    // Close modal
    closeUploadModal();
    
    window.dashboard.addToConsole(`Adding file: ${file.name}`, 'info');
    
    try {
        // Copy file to music folder
        const result = await window.pelicanAPI.copyAudioFile(file.path, file.name);
        
        if (result.success) {
            // Create track object
            const newTrack = {
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                path: result.filePath,
                size: Math.round(file.size / 1024) + ' KB'
            };
            
            // Add to playlist
            if (window.dashboard && window.dashboard.musicState) {
                window.dashboard.musicState.playlist.push(newTrack);
                
                // Update the playlist in main process
                await window.pelicanAPI.musicControl('setPlaylist', { 
                    tracks: window.dashboard.musicState.playlist 
                });
                
                // Update the UI
                window.dashboard.updatePlaylist(window.dashboard.musicState.playlist);
                
                window.dashboard.addToConsole(`Added "${newTrack.name}" to playlist`, 'success');
            }
        } else {
            window.dashboard.addToConsole(`Failed to add file: ${result.message}`, 'error');
        }
        
    } catch (error) {
        window.dashboard.addToConsole(`Error adding file: ${error.message}`, 'error');
    }
}

function toggleUpload() {
    if (window.dashboard) {
        // Toggle the upload state
        window.dashboard.musicState.upload = !window.dashboard.musicState.upload;

        // Update button visual state
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            if (window.dashboard.musicState.upload) {
                uploadBtn.classList.add('active');
            } else {
                uploadBtn.classList.remove('active');
            }
        }

        // Log the change
        const status = window.dashboard.musicState.upload ? 'enabled' : 'disabled';
        window.dashboard.addToConsole(`Upload ${status}`, 'info');
    }
}



async function togglePlayPause() {
    const audio = document.getElementById('audio-player');
    const playIcon = document.getElementById('play-pause-icon');
    
    if (!window.dashboard || !window.dashboard.musicState.playlist.length) {
        return;
    }
    
    if (audio.paused) {
        if (!audio.src && window.dashboard.musicState.playlist.length > 0) {
            const currentTrack = window.dashboard.musicState.playlist[window.dashboard.musicState.currentIndex];
            audio.src = currentTrack.path;
            updateCurrentTrackDisplay(currentTrack);
        }
        
        await audio.play();
        playIcon.setAttribute('data-feather', 'pause');
        feather.replace();
        window.dashboard.musicState.isPlaying = true;
        await window.pelicanAPI.musicControl('play');
    } else {
        audio.pause();
        playIcon.setAttribute('data-feather', 'play');
        feather.replace();
        window.dashboard.musicState.isPlaying = false;
        await window.pelicanAPI.musicControl('pause');
    }
}

async function nextTrack() {
    if (!window.dashboard || !window.dashboard.musicState.playlist.length) return;
    
    try {
        const result = await window.pelicanAPI.musicControl('next');
        window.dashboard.musicState.currentIndex = result.index;
        
        const audio = document.getElementById('audio-player');
        const playIcon = document.getElementById('play-pause-icon');
        const currentTrack = window.dashboard.musicState.playlist[window.dashboard.musicState.currentIndex];
        
        if (!currentTrack) return;
        
        audio.src = currentTrack.path;
        updateCurrentTrackDisplay(currentTrack);
        window.dashboard.updatePlaylist(window.dashboard.musicState.playlist);
        
        // Auto-play next track if music was playing
        if (window.dashboard.musicState.isPlaying) {
            try {
                await audio.play();
                playIcon.setAttribute('data-feather', 'pause');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            } catch (playError) {
                console.error('Autoplay failed:', playError);
                window.dashboard.musicState.isPlaying = false;
                playIcon.setAttribute('data-feather', 'play');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        }
    } catch (error) {
        console.error('Next track error:', error);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Next track error: ${error.message}`, 'error');
        }
    }
}

async function previousTrack() {
    if (!window.dashboard || !window.dashboard.musicState.playlist.length) return;
    
    try {
        const result = await window.pelicanAPI.musicControl('prev');
        window.dashboard.musicState.currentIndex = result.index;
        
        const audio = document.getElementById('audio-player');
        const playIcon = document.getElementById('play-pause-icon');
        const currentTrack = window.dashboard.musicState.playlist[window.dashboard.musicState.currentIndex];
        
        if (!currentTrack) return;
        
        audio.src = currentTrack.path;
        updateCurrentTrackDisplay(currentTrack);
        window.dashboard.updatePlaylist(window.dashboard.musicState.playlist);
        
        // Continue playing if music was playing
        if (window.dashboard.musicState.isPlaying) {
            try {
                await audio.play();
                playIcon.setAttribute('data-feather', 'pause');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            } catch (playError) {
                console.error('Previous track play failed:', playError);
                window.dashboard.musicState.isPlaying = false;
                playIcon.setAttribute('data-feather', 'play');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        }
    } catch (error) {
        console.error('Previous track error:', error);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Previous track error: ${error.message}`, 'error');
        }
    }
}

async function selectTrack(index) {
    if (!window.dashboard || !window.dashboard.musicState.playlist.length) return;
    
    try {
        window.dashboard.musicState.currentIndex = index;
        const result = await window.pelicanAPI.musicControl('select', { index });
        
        const audio = document.getElementById('audio-player');
        const playIcon = document.getElementById('play-pause-icon');
        const currentTrack = window.dashboard.musicState.playlist[index];
        
        if (!currentTrack) return;
        
        audio.src = currentTrack.path;
        updateCurrentTrackDisplay(currentTrack);
        window.dashboard.updatePlaylist(window.dashboard.musicState.playlist);
        
        // Auto-play selected track if music was playing
        if (window.dashboard.musicState.isPlaying) {
            try {
                await audio.play();
                playIcon.setAttribute('data-feather', 'pause');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            } catch (playError) {
                console.error('Selected track play failed:', playError);
                window.dashboard.musicState.isPlaying = false;
                playIcon.setAttribute('data-feather', 'play');
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        }
        
        window.dashboard.addToConsole(`Selected track: ${currentTrack.name}`, 'info');
    } catch (error) {
        console.error('Track selection error:', error);
        if (window.dashboard) {
            window.dashboard.addToConsole(`Track selection error: ${error.message}`, 'error');
        }
    }
}

async function toggleShuffle() {
    const result = await window.pelicanAPI.musicControl('shuffle');
    window.dashboard.musicState.isShuffled = result.shuffled;
    
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (result.shuffled) {
        shuffleBtn.classList.add('shuffle-active');
    } else {
        shuffleBtn.classList.remove('shuffle-active');
    }
    
    window.dashboard.addToConsole(`Shuffle ${result.shuffled ? 'enabled' : 'disabled'}`, 'info');
}

function updateCurrentTrackDisplay(track) {
    const titleEl = document.getElementById('current-track-title');
    const artistEl = document.getElementById('current-track-artist');
    
    titleEl.textContent = track.name;
    artistEl.textContent = track.path.split('\\').slice(-2, -1)[0] || 'Unknown Artist';
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dashboard = new PelicanDashboard();
        
        // Set up auto-load music folder listener
        if (window.pelicanAPI && window.pelicanAPI.onAutoLoadMusic) {
            window.pelicanAPI.onAutoLoadMusic(autoLoadDefaultMusicFolder);
        }
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
    }
});

// Handle window events
window.addEventListener('beforeunload', () => {
    try {
        if (window.dashboard && window.dashboard.updateIntervals) {
            // Clear all intervals
            for (const interval of window.dashboard.updateIntervals.values()) {
                clearInterval(interval);
            }
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.dashboard) {
        window.dashboard.addToConsole(`Error: ${event.error.message}`, 'error');
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.dashboard) {
        window.dashboard.addToConsole(`Promise rejection: ${event.reason}`, 'error');
    }
});