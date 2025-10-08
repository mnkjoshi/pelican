// Pelican Command Center - Utility Functions
class PelicanUtils {
    // Storage utilities
    static async getStoredConfig(key, defaultValue = null) {
        try {
            const value = await window.pelicanAPI.getConfig(key);
            return value !== undefined ? value : defaultValue;
        } catch (error) {
            console.error(`Failed to get config for ${key}:`, error);
            return defaultValue;
        }
    }

    static async setStoredConfig(key, value) {
        try {
            await window.pelicanAPI.setConfig(key, value);
            return true;
        } catch (error) {
            console.error(`Failed to set config for ${key}:`, error);
            return false;
        }
    }

    // Network utilities
    static async fetchWithTimeout(url, options = {}, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Date and time utilities
    static getRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        
        const diffInDays = Math.floor(diffInSeconds / 86400);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
        
        return date.toLocaleDateString();
    }

    static formatTimeUntil(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((date - now) / 1000);
        
        if (diffInSeconds < 0) return 'Overdue';
        if (diffInSeconds < 60) return 'Due now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m left`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h left`;
        
        const diffInDays = Math.floor(diffInSeconds / 86400);
        if (diffInDays < 7) return `${diffInDays}d left`;
        
        return date.toLocaleDateString();
    }

    // Data validation utilities
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    static sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Animation utilities
    static async animateValue(element, start, end, duration = 1000, easing = 'easeOutCubic') {
        const startTime = performance.now();
        const easingFunctions = {
            linear: t => t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => 1 - Math.pow(1 - t, 3),
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        };
        
        const easingFunction = easingFunctions[easing] || easingFunctions.easeOutCubic;
        
        return new Promise((resolve) => {
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunction(progress);
                
                const currentValue = start + (end - start) * easedProgress;
                element.textContent = Math.floor(currentValue);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            }
            requestAnimationFrame(animate);
        });
    }

    // Notification utilities
    static showNotification(title, body, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            return new Notification(title, {
                body,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDBCRkZGIi8+Cjwvc3ZnPgo=',
                ...options
            });
        }
        return null;
    }

    static async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }

    // Performance utilities
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Error handling utilities
    static handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Log to console widget if available
        if (window.dashboard && window.dashboard.addToConsole) {
            window.dashboard.addToConsole(`Error in ${context}: ${error.message}`, 'error');
        }
        
        // Show user-friendly notification
        this.showNotification('Pelican Error', `An error occurred in ${context}`, {
            tag: 'error'
        });
    }

    // Color utilities for status indicators
    static getStatusColor(status) {
        const colors = {
            online: '#39FF14',      // Neon Green
            degraded: '#FFBF00',    // Amber Glow
            offline: '#DC143C',     // Crimson Red
            loading: '#8D99AE',     // Cool Gray
            unknown: '#8D99AE'      // Cool Gray
        };
        return colors[status] || colors.unknown;
    }

    // Data formatting utilities
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatPercentage(value, total, decimals = 1) {
        if (total === 0) return '0%';
        return ((value / total) * 100).toFixed(decimals) + '%';
    }

    // Local storage with fallback
    static setLocalItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('LocalStorage unavailable, using memory storage');
            window._pelicanMemoryStorage = window._pelicanMemoryStorage || {};
            window._pelicanMemoryStorage[key] = value;
            return false;
        }
    }

    static getLocalItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('LocalStorage unavailable, using memory storage');
            window._pelicanMemoryStorage = window._pelicanMemoryStorage || {};
            return window._pelicanMemoryStorage[key] || defaultValue;
        }
    }
}

// Make PelicanUtils globally available
window.PelicanUtils = PelicanUtils;