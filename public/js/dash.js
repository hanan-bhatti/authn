class Dashboard {
    constructor() {
        this.apiBase = '/api/users';
        this.currentUser = null;
        this.currentTheme = localStorage.getItem('theme') || 'auto';
        this.currentSection = 'Dashboard';
        this.init();
    }

    // Initialize the dashboard
    init() {
        this.loadCurrentUser();
        this.isAuthenticated();
        this.applyTheme(this.currentTheme);
        this.currentDynamicTheme = JSON.parse(localStorage.getItem('dynamicThemeInfo')) || null;
        this.initTheme();
        this.initEventListeners();
        this.initNavigation();
        this.loadCurrentUser().then(() => {
            this.syncThemeWithDatabase();
        });
        this.loadNotifications();
        this.updateUserDisplay();
        this.initializeSecurityEventListeners();
        this.initTheme();
    }

    // Theme Management
    initTheme() {
        this.applyTheme(this.currentTheme);
        this.updateThemeToggle();
        this.initThemeTooltip();
    }

    async isAuthenticated() {
        try {
            const response = await this.makeRequest('/me');
            if (response.data && response.data.user) {
                this.currentUser = response.data.user;
                return true; // User is authenticated
            } else {
                this.currentUser = null;
                return false;
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/login';
            this.currentUser = null;

            if (error.status !== 401) {
                this.showToast('Authentication check failed', 'error');
                window.location.href = '/login';
            }

            return false;
        }
    }

    async checkAuthAndRedirect() {
        const isAuth = await this.isAuthenticated();

        if (!isAuth) {
            // Only redirect if user is not authenticated
            window.location.href = '/login';
        } else {
            // User is authenticated, you can proceed with your app logic
            console.log('User authenticated:', this.currentUser);
        }
    }

    async applyTheme(theme) {
        console.log('Applying theme:', theme);

        if (theme === 'auto') {
            try {
                // Check if we have a cached theme that's still valid
                const cachedThemeInfo = this.getCachedThemeInfo();

                if (cachedThemeInfo && this.isCacheValid(cachedThemeInfo)) {
                    console.log('Using cached dynamic theme: ' + cachedThemeInfo.theme.theme);
                    // Apply cached theme immediately
                    this.applyDynamicThemeColors(cachedThemeInfo.theme.colors);
                    document.documentElement.setAttribute('data-theme', cachedThemeInfo.theme.theme || 'auto');

                    this.currentTheme = 'auto';
                    this.currentDynamicTheme = cachedThemeInfo.theme;

                    // Update UI elements
                    this.updateThemeToggle();
                    this.updateProfileThemeDropdown();
                    this.showThemeStatus(cachedThemeInfo.theme, cachedThemeInfo.weather);

                    // Update database preference if needed (non-blocking)
                    this.updateThemePreferenceInBackground('auto');

                    // Schedule background refresh for next time
                    this.scheduleThemeRefresh();
                    return;
                }

                // No valid cache, fetch new theme
                console.log('Fetching new dynamic theme');
                await this.fetchAndApplyDynamicTheme();

            } catch (error) {
                console.error('Error applying auto theme:', error);
                // Fallback to cached theme if available, otherwise use system default
                const cachedThemeInfo = this.getCachedThemeInfo();
                if (cachedThemeInfo) {
                    console.log('Falling back to cached theme due to error');
                    this.applyDynamicThemeColors(cachedThemeInfo.theme.colors);
                    document.documentElement.setAttribute('data-theme', cachedThemeInfo.theme.theme || 'auto');
                    this.currentTheme = 'auto';
                    this.currentDynamicTheme = cachedThemeInfo.theme;
                } else {
                    // Final fallback to system preference
                    this.applySystemPreference();
                }
            }
        } else {
            // Handle light/dark themes as before (fast, no API calls)
            this.clearDynamicThemeColors();
            document.documentElement.setAttribute('data-theme', theme);
            this.currentTheme = theme;
            this.currentDynamicTheme = null;

            localStorage.setItem('theme', theme);
            localStorage.removeItem('dynamicThemeInfo');

            // Update database preference if needed (non-blocking)
            this.updateThemePreferenceInBackground(theme);

            this.updateThemeToggle();
            this.updateProfileThemeDropdown();
        }
    }

    // Get cached theme info from localStorage
    getCachedThemeInfo() {
        try {
            const cached = localStorage.getItem('dynamicThemeInfo');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Error parsing cached theme info:', error);
            return null;
        }
    }

    // Check if cached theme is still valid (10 minutes)
    isCacheValid(cachedInfo) {
        if (!cachedInfo || !cachedInfo.lastUpdated) {
            return false;
        }

        const lastUpdated = new Date(cachedInfo.lastUpdated);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

        return lastUpdated > tenMinutesAgo;
    }

    // Fetch and apply dynamic theme with caching
    async fetchAndApplyDynamicTheme() {
        try {
            // Show loading indicator for first-time loads only
            const cachedInfo = this.getCachedThemeInfo();
            if (!cachedInfo) {
                this.showThemeLoadingStatus();
            }

            const currentWeather = await this.getCurrentWeather();
            const dynamicTheme = await this.fetchDynamicTheme(currentWeather);

            if (dynamicTheme) {
                // Apply theme immediately
                this.applyDynamicThemeColors(dynamicTheme.colors);
                document.documentElement.setAttribute('data-theme', dynamicTheme.theme || 'auto');

                this.currentTheme = 'auto';
                this.currentDynamicTheme = dynamicTheme;

                // Cache the theme for future use
                const cacheData = {
                    theme: dynamicTheme,
                    lastUpdated: new Date().toISOString(),
                    weather: currentWeather
                };

                localStorage.setItem('theme', 'auto');
                localStorage.setItem('dynamicThemeInfo', JSON.stringify(cacheData));

                // Update database preference if needed (non-blocking)
                this.updateThemePreferenceInBackground('auto');

                // Update UI
                this.updateThemeToggle();
                this.updateProfileThemeDropdown();
                this.showThemeStatus(dynamicTheme, currentWeather);

                console.log('Dynamic theme applied and cached');
            } else {
                throw new Error('Failed to fetch dynamic theme');
            }
        } catch (error) {
            console.error('Error fetching dynamic theme:', error);
            throw error;
        }
    }

    // Apply system preference as fallback
    applySystemPreference() {
        console.log('Applying system preference fallback');

        this.clearDynamicThemeColors();

        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', systemTheme);
        this.currentTheme = 'auto'; // Keep as auto but apply system theme
        this.currentDynamicTheme = null;

        this.updateThemeToggle();
        this.updateProfileThemeDropdown();

        this.showToast('info', 'Theme', 'Using system preference due to network issues');
    }

    // Non-blocking database preference update
    async updateThemePreferenceInBackground(theme) {
        // Only update if user preference differs and user is loaded
        if (this.currentUser && this.currentUser.preferences?.theme !== theme) {
            try {
                await this.updateSetting('theme', theme);
            } catch (error) {
                // Silently fail - this is a background operation
                console.warn('Failed to update theme preference in database:', error);
            }
        }
    }

    // Show loading status for theme (only for first-time loads)
    showThemeLoadingStatus() {
        const statusElement = document.getElementById('theme-status') || this.createThemeStatusElement();
        statusElement.textContent = '🎨 Loading theme...';
        statusElement.className = 'theme-status show loading';

        // Auto-hide after 5 seconds max
        setTimeout(() => {
            if (statusElement.textContent.includes('Loading')) {
                statusElement.className = 'theme-status';
            }
        }, 5000);
    }

    scheduleThemeRefresh() {
        if (this.themeRefreshTimeout) {
            clearTimeout(this.themeRefreshTimeout);
        }

        // Schedule next refresh in 10 minutes
        this.themeRefreshTimeout = setTimeout(() => {
            if (this.currentTheme === 'auto') {
                console.log('Refreshing theme in background');
                this.refreshDynamicThemeInBackground();
            }
        }, 10 * 60 * 1000); // 10 minutes
    }

    // Background theme refresh (non-blocking)
    async refreshDynamicThemeInBackground() {
        if (this.currentTheme !== 'auto') {
            return;
        }

        try {
            console.log('Background theme refresh started');
            const currentWeather = await this.getCurrentWeather();
            const dynamicTheme = await this.fetchDynamicTheme(currentWeather);

            if (dynamicTheme) {
                // Check if theme actually changed
                const cachedInfo = this.getCachedThemeInfo();
                const themeChanged = !cachedInfo ||
                    cachedInfo.theme.theme !== dynamicTheme.theme ||
                    cachedInfo.weather !== currentWeather;

                if (themeChanged) {
                    console.log('Theme changed, applying new theme');

                    // Apply new theme
                    this.applyDynamicThemeColors(dynamicTheme.colors);
                    document.documentElement.setAttribute('data-theme', dynamicTheme.theme || 'auto');
                    this.currentDynamicTheme = dynamicTheme;

                    // Update cache
                    const cacheData = {
                        theme: dynamicTheme,
                        lastUpdated: new Date().toISOString(),
                        weather: currentWeather
                    };
                    localStorage.setItem('dynamicThemeInfo', JSON.stringify(cacheData));

                    // Update UI
                    this.updateThemeToggle();
                    this.showThemeStatus(dynamicTheme, currentWeather);

                    console.log('Background theme refresh completed - theme updated');
                } else {
                    // Just update the cache timestamp
                    const cacheData = {
                        theme: dynamicTheme,
                        lastUpdated: new Date().toISOString(),
                        weather: currentWeather
                    };
                    localStorage.setItem('dynamicThemeInfo', JSON.stringify(cacheData));
                    console.log('Background theme refresh completed - no changes');
                }
            }
        } catch (error) {
            console.warn('Background theme refresh failed (non-critical):', error);
        } finally {
            // Schedule next refresh
            this.scheduleThemeRefresh();
        }
    }

    async getCurrentWeather() {
        try {
            const cachedWeather = this.getCachedWeather();
            if (cachedWeather) {
                return cachedWeather.condition;
            }

            // Quick geolocation check (reduced timeout)
            if (navigator.geolocation) {
                try {
                    const permission = await navigator.permissions.query({ name: 'geolocation' });

                    if (permission.state === 'granted') {
                        const position = await this.getCurrentPositionFast();
                        const weather = await this.fetchWeatherByLocationFast(position.coords.latitude, position.coords.longitude);
                        if (weather) {
                            this.cacheWeather(weather);
                            return weather;
                        }
                    }
                } catch (geoError) {
                    console.log('Quick geolocation failed, using fallback');
                }
            }

            return null;
        } catch (error) {
            console.error('Error in getCurrentWeather:', error);
            return null;
        }
    }

    // Cache weather data for 5 minutes
    getCachedWeather() {
        try {
            const cached = localStorage.getItem('cachedWeather');
            if (!cached) return null;

            const weatherData = JSON.parse(cached);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (new Date(weatherData.timestamp) > fiveMinutesAgo) {
                return weatherData;
            }

            // Remove expired cache
            localStorage.removeItem('cachedWeather');
            return null;
        } catch (error) {
            return null;
        }
    }

    // Cache weather data
    cacheWeather(condition) {
        try {
            const weatherData = {
                condition: condition,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('cachedWeather', JSON.stringify(weatherData));
        } catch (error) {
            console.warn('Failed to cache weather:', error);
        }
    }

    // Faster geolocation with shorter timeout
    getCurrentPositionFast() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 3000, // Reduced from 10000
                enableHighAccuracy: false,
                maximumAge: 300000
            });
        });
    }

    // Faster weather API calls with shorter timeout
    async fetchWeatherByLocationFast(lat, lon) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) return null;
            const data = await response.json();
            return data.condition;
        } catch (error) {
            console.warn('Fast weather fetch failed:', error);
            return null;
        }
    }

    // Enhanced page visibility handler for smarter refresh
    initializeDynamicThemeRefresh() {
        // Clear existing interval-based refresh
        // We now use smart caching and background refresh instead

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentTheme === 'auto') {
                const cachedThemeInfo = this.getCachedThemeInfo();

                if (!cachedThemeInfo || !this.isCacheValid(cachedThemeInfo)) {
                    console.log('Page visible and theme cache expired, refreshing');
                    // Small delay to avoid blocking the visibility change
                    setTimeout(() => {
                        this.refreshDynamicThemeInBackground();
                    }, 500);
                }
            }
        });
    }

    // Cleanup method for timeouts
    cleanup() {
        if (this.themeRefreshTimeout) {
            clearTimeout(this.themeRefreshTimeout);
            this.themeRefreshTimeout = null;
        }
    }

    // Enhanced theme status with loading state
    showThemeStatus(dynamicTheme, weather) {
        const getStatusMessage = () => {
            if (dynamicTheme.theme === 'independence') return '🇵🇰 Pakistan Zindabad!';
            if (dynamicTheme.theme === 'pakistan-day') return '🇵🇰 Pakistan Day Mubarak!';
            if (dynamicTheme.theme === 'kashmir-day') return '🖤 Kashmir Solidarity Day';
            if (dynamicTheme.theme === 'defence-day') return '⚔️ Defence Day Tribute';
            if (dynamicTheme.theme === 'quaid-birthday') return '👨‍💼 Quaid-e-Azam Remembrance';
            if (dynamicTheme.theme === 'ramadan') return '🌙 Ramadan Kareem';
            if (dynamicTheme.theme === 'sunny') return '☀️ Bright & Sunny';
            if (dynamicTheme.theme === 'rainy') return '🌧️ Cool & Rainy';
            if (dynamicTheme.theme === 'stormy') return '⛈️ Stormy Weather';
            if (dynamicTheme.theme === 'cloudy') return '☁️ Cloudy Skies';
            if (dynamicTheme.theme === 'winter') return '❄️ Winter Vibes';
            if (dynamicTheme.theme === 'spring') return '🌸 Spring Fresh';
            if (dynamicTheme.theme === 'summer') return '🌞 Summer Heat';
            if (dynamicTheme.theme === 'autumn') return '🍂 Autumn Colors';
            return '🎨 Theme Applied';
        };

        const statusElement = document.getElementById('theme-status') || this.createThemeStatusElement();
        statusElement.textContent = getStatusMessage();
        statusElement.className = 'theme-status show';

        // Auto-hide after 3 seconds instead of 10
        setTimeout(() => {
            statusElement.className = 'theme-status';
        }, 3000);
    }

    async fetchDynamicTheme(weather = null) {
        try {
            const params = new URLSearchParams();
            if (weather) params.append('weather', weather);

            const userLocation = this.currentUser?.preferences?.location || 'Pakistan';
            params.append('location', userLocation);

            const response = await fetch(`/api/theme?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            return await response.json();
        } catch (error) {
            return null;
        }
    }

    applyDynamicThemeColors(colors) {
        const root = document.documentElement;
        Object.entries(colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }

    clearDynamicThemeColors() {
        const root = document.documentElement;
        const cssProperties = [
            '--bg-primary', '--bg-secondary', '--bg-tertiary',
            '--text-primary', '--text-secondary', '--text-muted',
            '--border-color', '--accent-primary', '--accent-secondary',
            '--success', '--warning', '--danger', '--info',
            '--shadow', '--shadow-lg', '--bg-overlay'
        ];
        cssProperties.forEach(property => root.style.removeProperty(property));
    }

    async fetchWeatherByLocation(lat, lon) {
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, { timeout: 5000 });
            if (!response.ok) return null;

            const data = await response.json();
            return data.condition;
        } catch (error) {
            return null;
        }
    }

    async fetchWeatherByCity(city) {
        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, { timeout: 5000 });
            if (!response.ok) return null;

            const data = await response.json();
            return data.condition;
        } catch (error) {
            return null;
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false,
                maximumAge: 300000
            });
        });
    }

    createThemeStatusElement() {
        const statusElement = document.createElement('div');
        statusElement.id = 'theme-status';
        statusElement.className = 'theme-status';

        const style = document.createElement('style');
        style.textContent = `
        .theme-status {
            position: fixed;
            top: 10px;
            right: 60px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            z-index: 9999;
            opacity: 0;
            transform: translateX(100px);
            transition: all 3s ease;
            border: 1px solid var(--border-color);
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px var(--shadow);
        }
        .theme-status.show {
            opacity: 1;
            transform: translateX(0);
        }
    `;

        document.head.appendChild(style);
        document.body.appendChild(statusElement);
        return statusElement;
    }

    async refreshDynamicTheme() {
        if (this.currentTheme === 'auto') {
            await this.applyTheme('auto');
        }
    }

    updateProfileThemeDropdown() {
        const profileThemeSelect = document.getElementById('theme');
        if (profileThemeSelect && profileThemeSelect.value !== this.currentTheme) {
            profileThemeSelect.value = this.currentTheme;
        }
    }

    // Enhanced updateTitle method
    updateTitle() {
        const userName = this.currentUser?.fullName || this.currentUser?.username || 'User';
        const currentSectionName = this.getCurrentSectionName();

        if (currentSectionName && currentSectionName !== 'Dashboard') {
            document.title = `${userName} - ${currentSectionName}`;
        } else {
            document.title = `${userName} - Dashboard`;
        }
    }

    updateThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const themeOptions = document.querySelectorAll('.theme-option');

        // Update toggle icon based on current theme
        const icon = themeToggle.querySelector('i');

        if (this.currentTheme === 'auto') {
            // For auto theme, show dynamic icon based on current applied theme
            if (this.currentDynamicTheme) {
                // Show icon based on the actual dynamic theme applied
                switch (this.currentDynamicTheme.theme) {
                    case 'independence':
                    case 'pakistan-day':
                    case 'defence-day':
                        icon.className = 'fas fa-flag';
                        icon.style.color = '#28a745'; // Green for national themes
                        break;
                    case 'ramadan':
                        icon.className = 'fas fa-moon';
                        icon.style.color = '#ffd700'; // Gold for Ramadan
                        break;
                    case 'kashmir-day':
                        icon.className = 'fas fa-heart';
                        icon.style.color = '#000000'; // Black for Kashmir Day
                        break;
                    case 'quaid-birthday':
                        icon.className = 'fas fa-star';
                        icon.style.color = '#3498db'; // Blue for formal theme
                        break;
                    case 'sunny':
                        icon.className = 'fas fa-sun';
                        icon.style.color = '#ff8c00'; // Orange for sunny
                        break;
                    case 'rainy':
                        icon.className = 'fas fa-cloud-rain';
                        icon.style.color = '#4fc3f7'; // Blue for rainy
                        break;
                    case 'stormy':
                        icon.className = 'fas fa-bolt';
                        icon.style.color = '#e94560'; // Red for stormy
                        break;
                    case 'cloudy':
                        icon.className = 'fas fa-cloud';
                        icon.style.color = '#63b3ed'; // Light blue for cloudy
                        break;
                    case 'spring':
                        icon.className = 'fas fa-seedling';
                        icon.style.color = '#22c55e'; // Green for spring
                        break;
                    case 'summer':
                        icon.className = 'fas fa-sun';
                        icon.style.color = '#fb923c'; // Orange for summer
                        break;
                    case 'autumn':
                        icon.className = 'fas fa-leaf';
                        icon.style.color = '#d97706'; // Orange for autumn
                        break;
                    case 'winter':
                        icon.className = 'fas fa-snowflake';
                        icon.style.color = '#3b82f6'; // Blue for winter
                        break;
                    default:
                        // Default auto icon with system preference colors
                        icon.className = 'fas fa-adjust';
                        icon.style.color = ''; // Reset to default CSS color
                }
            } else {
                // Fallback auto icon when no dynamic theme is loaded yet
                icon.className = 'fas fa-adjust';
                icon.style.color = ''; // Reset to default CSS color
            }
        } else {
            // For manual themes, show standard icons
            icon.style.color = ''; // Reset any custom colors
            switch (this.currentTheme) {
                case 'light':
                    icon.className = 'fas fa-sun';
                    break;
                case 'dark':
                    icon.className = 'fas fa-moon';
                    break;
                default:
                    icon.className = 'fas fa-adjust';
            }
        }

        // Update active theme option in dropdown
        themeOptions.forEach(option => {
            const isActive = option.dataset.theme === this.currentTheme;
            option.classList.toggle('active', isActive);

            // Update option text for auto theme to show current dynamic theme
            if (option.dataset.theme === 'auto' && this.currentDynamicTheme && isActive) {
                const originalText = option.querySelector('.theme-name')?.textContent || 'Auto';
                const themeText = option.querySelector('.theme-name');
                const subText = option.querySelector('.theme-description');

                if (themeText && !originalText.includes('Auto')) {
                    // Store original text if not already stored
                    option.dataset.originalText = originalText;
                }

                if (themeText) {
                    themeText.textContent = 'Auto';
                }

                if (subText) {
                    subText.textContent = `Currently: ${this.currentDynamicTheme.name}`;
                }
            } else if (option.dataset.theme === 'auto' && !isActive) {
                // Reset auto theme text when not active
                const themeText = option.querySelector('.theme-name');
                const subText = option.querySelector('.theme-description');

                if (themeText) {
                    themeText.textContent = option.dataset.originalText || 'Auto';
                }

                if (subText) {
                    subText.textContent = 'Automatic theme based on festivals and weather';
                }
            }
        });
    }

    // Initialize tooltip functionality
    initThemeTooltip() {
        const themeToggle = document.getElementById('themeToggle');
        this.hideThemeTooltip();
        if (!themeToggle) return;

        // Add event listeners for mouseover and mouseout
        themeToggle.addEventListener('mouseenter', () => this.showThemeTooltip());
        themeToggle.addEventListener('mouseleave', () => this.hideThemeTooltip());
    }

    showThemeTooltip() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        // Remove existing tooltip
        this.hideThemeTooltip();

        let tooltipText = '';
        let themeIcon = '🎨';

        if (this.currentTheme === 'auto' && this.currentDynamicTheme) {
            tooltipText = this.currentDynamicTheme.name;

            // Set appropriate icon based on theme
            const iconMap = {
                'independence': '🇵🇰',
                'pakistan-day': '🇵🇰',
                'kashmir-day': '🖤',
                'defence-day': '⚔️',
                'quaid-birthday': '👨‍💼',
                'ramadan': '🌙',
                'sunny': '☀️',
                'rainy': '🌧️',
                'stormy': '⛈️',
                'cloudy': '☁️',
                'winter': '❄️',
                'spring': '🌸',
                'summer': '🌞',
                'autumn': '🍂'
            };
            themeIcon = iconMap[this.currentDynamicTheme.theme] || '🎨';
        } else {
            const themeNames = {
                'light': 'Light Theme',
                'dark': 'Dark Theme',
                'auto': 'Auto Theme'
            };
            tooltipText = themeNames[this.currentTheme] || 'Custom Theme';

            const themeIcons = {
                'light': '☀️',
                'dark': '🌙',
                'auto': '🤖'
            };
            themeIcon = themeIcons[this.currentTheme] || '🎨';
        }

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'theme-tooltip';
        tooltip.innerHTML = `<span class="tooltip-icon">${themeIcon}</span> ${tooltipText}`;

        // Add CSS if not already added
        if (!document.querySelector('#theme-tooltip-styles')) {
            const style = document.createElement('style');
            style.id = 'theme-tooltip-styles';
            style.textContent = `
            .theme-tooltip {
                position: fixed;
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 999999;
                opacity: 0;
                transition: all 0.2s ease;
                border: 1px solid var(--border-color);
                box-shadow: 0 4px 12px var(--shadow);
                backdrop-filter: blur(10px);
                pointer-events: none;
            }
            
            /* Tooltip above button (default) */
            .theme-tooltip.tooltip-above {
                transform: translateX(-50%) translateY(-100%);
            }
            
            .theme-tooltip.tooltip-above.show {
                opacity: 1;
                transform: translateX(-50%) translateY(calc(-100% - 8px));
            }
            
            .theme-tooltip.tooltip-above::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: var(--bg-secondary);
                filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
            }
            
            /* Tooltip below button */
            .theme-tooltip.tooltip-below {
                transform: translateX(-50%) translateY(0%);
            }
            
            .theme-tooltip.tooltip-below.show {
                opacity: 1;
                transform: translateX(-50%) translateY(8px);
            }
            
            .theme-tooltip.tooltip-below::after {
                content: '';
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-bottom-color: var(--bg-secondary);
                filter: drop-shadow(0 -1px 1px rgba(0,0,0,0.1));
            }
            
            .theme-tooltip .tooltip-icon {
                margin-right: 4px;
            }
        `;
            document.head.appendChild(style);
        }

        // Position tooltip with collision detection
        const rect = themeToggle.getBoundingClientRect();
        const tooltipHeight = 40; // Approximate tooltip height
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        // Determine if tooltip should show above or below
        const showBelow = spaceAbove < tooltipHeight + 10;

        tooltip.style.left = `${rect.left + rect.width / 2}px`;

        if (showBelow) {
            // Position below the button
            tooltip.style.top = `${rect.bottom}px`;
            tooltip.classList.add('tooltip-below');
        } else {
            // Position above the button (default)
            tooltip.style.top = `${rect.top}px`;
            tooltip.classList.add('tooltip-above');
        }

        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;

        // Show tooltip with animation
        requestAnimationFrame(() => {
            tooltip.classList.add('show');
        });
    }

    hideThemeTooltip() {
        const existingTooltip = document.querySelector('.theme-tooltip');
        if (existingTooltip) {
            existingTooltip.classList.remove('show');
            setTimeout(() => {
                if (existingTooltip.parentNode) {
                    existingTooltip.remove();
                }
            }, 200);
        }
        this.currentTooltip = null;
    }

    // Event Listeners
    initEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        const themeDropdown = document.getElementById('themeDropdown');

        // Remove existing listeners first
        themeToggle.replaceWith(themeToggle.cloneNode(true));
        const newThemeToggle = document.getElementById('themeToggle');

        newThemeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('show');
        });

        // Theme options - also prevent duplicates
        document.querySelectorAll('.theme-option').forEach(option => {
            // Clone to remove existing listeners
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);

            newOption.addEventListener('click', async () => {
                await this.applyTheme(newOption.dataset.theme);
                themeDropdown.classList.remove('show');
            });
        });

        // Close theme dropdown when clicking outside
        document.addEventListener('click', () => {
            themeDropdown.classList.remove('show');
        });

        // Sidebar toggles
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        document.getElementById('mobileSidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('show');
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });
    }

    // Security Event Listeners
    initializeSecurityEventListeners() {
        // Account deletion modal event listeners
        const requestDeleteBtn = document.getElementById('requestDeleteBtn');
        const accountDeletionForm = document.getElementById('accountDeletionForm');
        const deletionModalClose = document.getElementById('deletionModalClose');
        const cancelDeletionBtn = document.getElementById('cancelDeletionBtn');
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');

        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.requestAccountDeletionEmail();
            });
        }

        if (requestDeleteBtn) {
            requestDeleteBtn.addEventListener('click', () => {
                // Show account deletion modal
                this.showModaldeletion('accountDeletionModal');
                this.requestAccountDeletion();
            });
        }

        if (accountDeletionForm) {
            accountDeletionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                this.confirmAccountDeletion(formData);
            });
        }

        if (deletionModalClose) {
            deletionModalClose.addEventListener('click', () => {
                this.hideModaldeletion('accountDeletionModal');
            });
        }

        if (cancelDeletionBtn) {
            cancelDeletionBtn.addEventListener('click', () => {
                this.hideModaldeletion('accountDeletionModal');
            });
        }

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Forms
        this.initForms();

        // Quick actions
        this.initQuickActions();

        // Modal management
        this.initModals();
    }

    // Navigation
    initNavigation() {
        // Get initial section from URL hash or default to dashboard
        const hashSection = window.location.hash ? window.location.hash.substring(1) : 'dashboard';

        // Show section and load data immediately on initialization
        this.showSection(hashSection, false);

        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            const section = e.state?.section || (window.location.hash ? window.location.hash.substring(1) : 'dashboard');
            this.showSection(section, false);
        });

        // Handle hash changes (direct URL access, bookmarks, etc.)
        window.addEventListener('hashchange', (e) => {
            const section = window.location.hash ? window.location.hash.substring(1) : 'dashboard';
            this.showSection(section, false);
        });
    }

    // Show section
    showSection(sectionName, pushState = true) {
        console.log('Showing section:', sectionName); // Debug log

        // Validate section name
        const validSections = ['dashboard', 'profile', 'security', 'notifications', 'settings', 'devices', 'sessions', 'analytics', 'audit-logs', 'admin'];
        if (!validSections.includes(sectionName)) {
            console.warn('Invalid section, defaulting to dashboard:', sectionName);
            sectionName = 'dashboard';
        }

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;

            // Update page title
            const titles = {
                'dashboard': 'Dashboard',
                'profile': 'Profile',
                'security': 'Security',
                'notifications': 'Notifications',
                'settings': 'Settings',
                'devices': 'Devices',
                'sessions': 'Sessions',
                'analytics': 'Analytics',
                'audit-logs': 'Audit Logs',
                'admin': 'Admin Panel'
            };

            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.textContent = titles[sectionName] || 'Dashboard';
            }

            // Update document title with user name
            if (typeof this.updateTitle === 'function') {
                this.updateTitle();
            }

            // Update active navigation
            this.updateActiveNav(sectionName);

            // Always load section data
            this.loadSectionData(sectionName);

            // Update URL hash and history state
            if (pushState && window.location.hash !== `#${sectionName}`) {
                history.pushState({ section: sectionName }, '', `#${sectionName}`);
            }

            // Close mobile sidebar
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('show');
            }
        } else {
            console.error(`Section element not found: ${sectionName}-section`);
        }
    }

    // Update active navigation link
    updateActiveNav(section) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    async loadSectionData(section) {
        console.log('Loading data for section:', section); // Debug log

        try {
            switch (section) {
                case 'dashboard':
                    if (typeof this.loadDashboardData === 'function') {
                        await this.loadDashboardData();
                    }
                    break;
                case 'profile':
                    if (typeof this.loadProfileData === 'function') {
                        await this.loadProfileData();
                    }
                    break;
                case 'security':
                    if (typeof this.loadSecurityData === 'function') {
                        await this.loadSecurityData();
                    }
                    break;
                case 'notifications':
                    if (typeof this.loadNotifications === 'function') {
                        await this.loadNotifications();
                    }
                    break;
                case 'settings':
                    if (typeof this.loadSettings === 'function') {
                        await this.loadSettings();
                    }
                    break;
                case 'devices':
                    if (typeof this.loadDevices === 'function') {
                        await this.loadDevices();
                    }
                    break;
                case 'sessions':
                    if (typeof this.loadSessions === 'function') {
                        await this.loadSessions();
                    }
                    break;
                case 'analytics':
                    if (typeof this.loadAnalytics === 'function') {
                        await this.loadAnalytics();
                    }
                    break;
                case 'audit-logs':
                    if (typeof this.loadAuditLogs === 'function') {
                        await this.loadAuditLogs();
                    }
                    break;
                case 'admin':
                    if (typeof this.loadAdminData === 'function') {
                        await this.loadAdminData();
                    }
                    break;
                default:
                    console.warn(`Unknown section: ${section}`);
            }

            console.log('Data loaded successfully for:', section); // Debug log

        } catch (error) {
            console.error(`Error loading data for section ${section}:`, error);
        }
    }

    getCurrentSectionName() {
        const titles = {
            'dashboard': 'Dashboard',
            'profile': 'Profile',
            'security': 'Security',
            'notifications': 'Notifications',
            'settings': 'Settings',
            'devices': 'Devices',
            'sessions': 'Sessions',
            'analytics': 'Analytics',
            'audit-logs': 'Audit Logs',
            'admin': 'Admin Panel'
        };
        return titles[this.currentSection];
    }

    async makeRequest(endpoint, options = {}) {
        const token = this.getAuthToken();

        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        // Add timeout to prevent hanging requests
        const timeoutMs = options.timeout || 30000; // 30 seconds default
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Check if response is ok before parsing JSON
            if (!response.ok) {
                let errorMessage;
                let errorData = null;

                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
                    } else {
                        errorMessage = `HTTP ${response.status} - ${response.statusText}`;
                    }
                } catch (parseError) {
                    errorMessage = `HTTP ${response.status} - ${response.statusText}`;
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);

            // Handle different error types with user-friendly messages
            if (error.name === 'AbortError') {
                this.showToast('error', 'Request Timeout', 'The request took too long to complete. Please try again.');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                this.showToast('error', 'Network Error', 'Cannot connect to server. Please check your connection.');
            } else if (error.status === 401) {
                this.showToast('error', 'Authentication Error', 'Please log in again.');
            } else if (error.status === 403) {
                if (error.message.includes('2FA') || error.message.includes('Two-factor')) {
                    this.showToast('warning', '2FA Required', error.message);
                } else {
                    this.showToast('error', 'Access Denied', 'You do not have permission to perform this action.');
                }
            } else if (error.status === 404) {
                this.showToast('error', 'Not Found', 'The requested resource was not found.');
            } else if (error.status >= 500) {
                this.showToast('error', 'Server Error', 'An internal server error occurred. Please try again later.');
            } else {
                this.showToast('error', 'Error', error.message || 'An unexpected error occurred.');
            }

            throw error;
        }
    }

    async testServerConnectivity() {
        try {
            // Test basic connectivity without authentication
            const response = await fetch(`${this.apiBase}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    getAuthToken() {
        try {
            if (typeof localStorage !== 'undefined') {
                const token = localStorage.getItem('authToken');
                if (token) return token;
            }
            return this.getCookie('token');
        } catch (error) {
            return null;
        }
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // User Management
    async loadCurrentUser() {
        try {
            const response = await this.makeRequest('/profile');
            this.currentUser = response.data.user;

            // Apply theme from user preferences if available
            if (this.currentUser.preferences?.theme) {
                const dbTheme = this.currentUser.preferences.theme;
                if (dbTheme !== this.currentTheme) {
                    this.currentTheme = dbTheme;
                    localStorage.setItem('theme', dbTheme);
                    this.applyTheme(dbTheme);
                }
            }

            this.updateUserDisplay();
            this.populateProfileForm();
            this.checkAdminAccess();
        } catch (error) {
            // Redirect to login if unauthorized
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                window.location.href = '/login';
            }
        }
    }

    // Add method to sync theme with database on page load
    async syncThemeWithDatabase() {
        if (!this.currentUser?.preferences) {
            return;
        }

        const dbTheme = this.currentUser.preferences.theme;
        const localTheme = localStorage.getItem('theme') || 'auto';

        // If themes don't match, use database theme as source of truth
        if (dbTheme && dbTheme !== localTheme) {
            this.currentTheme = dbTheme;
            localStorage.setItem('theme', dbTheme);
            this.applyTheme(dbTheme);
        }
    }

    updateUserDisplay() {
        if (!this.currentUser) return;

        // Update user info in header
        document.getElementById('userName').textContent =
            this.currentUser.fullName || this.currentUser.username;

        // Update user avatar
        const userAvatar = document.getElementById('userAvatar');
        userAvatar.src = this.currentUser.avatar;
        userAvatar.alt = this.currentUser.username;

        // Update favicon - Fixed version
        const faviconElement = document.querySelector('link[rel="icon"]');
        if (!faviconElement) {
            this.showToast('error', 'Error', 'Favicon element not found');
            return;
        }

        // Set the favicon href to the user's profile picture or default
        faviconElement.href = this.currentUser.avatar;

        this.updateTitle();
    }

    populateProfileForm() {
        if (!this.currentUser) return;

        // Populate basic profile fields
        const fields = ['firstName', 'lastName', 'email', 'username', 'phone', 'bio', 'website'];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && this.currentUser[field]) {
                element.value = this.currentUser[field];
            }
        });

        // Handle date of birth
        if (this.currentUser.dateOfBirth) {
            const dobElement = document.getElementById('dateOfBirth');
            if (dobElement) {
                const date = new Date(this.currentUser.dateOfBirth);
                dobElement.value = date.toISOString().split('T')[0];
            }
        }

        // Handle gender selection
        const genderElement = document.getElementById('gender');
        if (genderElement && this.currentUser.gender) {
            genderElement.value = this.currentUser.gender;
        }

        // FIXED: Handle theme selection in profile form
        const themeElement = document.getElementById('theme');
        if (themeElement) {
            themeElement.value = this.currentTheme;

            // Add event listener for theme changes in profile form
            themeElement.addEventListener('change', async (e) => {
                const newTheme = e.target.value;
                await this.applyTheme(newTheme);
            });
        }

        // Handle profile picture
        const profilePictureElement = document.getElementById('profilePicture');
        if (profilePictureElement) {
            profilePictureElement.src = this.currentUser.avatar;
        }
    }

    async updateProfile(formData) {
        try {
            // Create update payload
            const updateData = {};

            // Handle basic fields
            const fields = ['firstName', 'lastName', 'phone', 'bio', 'website', 'dateOfBirth', 'gender'];

            fields.forEach(field => {
                const value = formData.get(field);
                if (value !== null && value !== undefined) {
                    if (field === 'dateOfBirth' && value) {
                        updateData[field] = value;
                    } else if (field === 'gender') {
                        // Handle gender - allow empty string to clear gender
                        updateData[field] = value || null;
                    } else {
                        updateData[field] = value.toString().trim();
                    }
                }
            });

            // FIXED: Handle theme update from profile form
            const themeValue = formData.get('theme');
            if (themeValue && themeValue !== this.currentTheme) {
                await this.applyTheme(themeValue);
            }

            // Make API request
            const response = await this.makeRequest('/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            // Update current user data
            this.currentUser = { ...this.currentUser, ...response.data.user };

            // Update display
            this.updateUserDisplay();

            return response;
        } catch (error) {
            this.showToast('error', 'Error', error.message || 'Failed to update profile');
            throw error;
        }
    }

    checkAdminAccess() {
        const adminNav = document.querySelector('.admin-only');
        if (this.currentUser?.role === 'admin' || this.currentUser?.role === 'superadmin') {
            adminNav.style.display = 'block';
        } else {
            adminNav.style.display = 'none';
        }
    }

    // Dashboard Data
    async loadDashboardData() {
        try {
            this.showLoading(true);
            // Load analytics for dashboard stats
            this.load2FAStatus();
            if (this.currentUser?.twoFactorAuth?.isEnabled) {
                const setup2FABtn = document.getElementById('setup-2fa-btn');
                setup2FABtn.disabled = true;
                setup2FABtn.textContent = '2 Factor Authentication Enabled';
            } else {
                setup2FABtn.textContent = 'Enable 2 Factor Authentication';
                setup2FABtn.disabled = false;
            }
            const analyticsResponse = await this.makeRequest('/analytics');
            const analytics = analyticsResponse.data.analytics;

            // Update stat cards
            document.getElementById('accountAge').textContent = analytics.accountAge || 0;
            document.getElementById('totalLogins').textContent = analytics.totalLogins || 0;
            document.getElementById('avgSessions').textContent = analytics.avgSessionsPerDay || 0;

            // Calculate security score
            let securityScore = 100;
            if (!this.currentUser?.isEmailVerified) securityScore -= 20;
            if (!this.currentUser?.twoFactorAuth?.isEnabled) securityScore -= 30;
            if (!this.currentUser?.phone) securityScore -= 10;

            document.getElementById('securityScore').textContent = `${securityScore}%`;

            // Load recent activity
            await this.loadRecentActivity();

        } catch (error) {
            document.getElementById('dashboardContent').innerHTML =
                '<p class="text-center">Error loading dashboard data</p>';
            this.showToast('error', 'Error', 'Failed to load dashboard data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await this.makeRequest('/audit-logs?limit=5');
            const activityList = document.getElementById('recentActivity');

            if (response.data.auditLogs.length === 0) {
                activityList.innerHTML = '<p class="text-center">No recent activity</p>';
                return;
            }

            const activitiesHtml = response.data.auditLogs.map(log => {
                const iconMap = {
                    'login': 'fas fa-sign-in-alt',
                    'logout': 'fas fa-sign-out-alt',
                    'profile_update': 'fas fa-user-edit',
                    'password_change': 'fas fa-key',
                    '2fa_enabled': 'fas fa-shield-alt',
                    'default': 'fas fa-info-circle'
                };

                const icon = iconMap[log.action] || iconMap.default;
                const time = new Date(log.timestamp).toLocaleString();

                return `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="activity-info">
                            <h4>${this.formatActionName(log.action)}</h4>
                        </div>
                        <div class="activity-time">${time}</div>
                    </div>
                `;
            }).join('');

            activityList.innerHTML = activitiesHtml;

        } catch (error) {
            document.getElementById('recentActivity').innerHTML =
                '<p class="text-center">Error loading activity</p>';
        }
    }

    formatActionName(action) {
        return action.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Profile Management
    async loadProfileData() {
        if (!this.currentUser) return;

        // Populate profile form
        const form = document.getElementById('profileForm');
        form.firstName.value = this.currentUser.firstName || '';
        form.lastName.value = this.currentUser.lastName || '';
        form.email.value = this.currentUser.email || '';
        form.username.value = this.currentUser.username || '';
        form.phone.value = this.currentUser.phone || '';
        form.bio.value = this.currentUser.bio || '';
        form.website.value = this.currentUser.website || '';

        if (this.currentUser.dateOfBirth) {
            form.dateOfBirth.value = this.currentUser.dateOfBirth.split('T')[0];
        }

        // FIXED: Set the theme dropdown to current theme
        if (form.theme) {
            form.theme.value = this.currentTheme;
        }

        // Update profile picture
        const profilePicture = document.getElementById('profilePicture');
        const profilePicURL = this.currentUser.avatar;
        profilePicture.src = profilePicURL

        // Load location data
        if (this.currentUser.homeLocation) {
            const locationForm = document.getElementById('locationForm');
            locationForm.address.value = this.currentUser.homeLocation.address || '';
            locationForm.landmark.value = this.currentUser.homeLocation.landmark || '';
            locationForm.latitude.value = this.currentUser.homeLocation.coordinates[1] || '';
            locationForm.longitude.value = this.currentUser.homeLocation.coordinates[0] || '';
        }
    }

    // Security Management
    async loadSecurityData() {
        try {
            await this.load2FAStatus();
            await this.loadSocialAccounts();
            this.initializeBackupCodes();

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to load security data');
        }
    }

    async load2FAStatus() {
        const statusContainer = document.getElementById('twofaStatus');
        const backupCodesSection = document.getElementById('backupCodesSection');

        if (this.currentUser?.twoFactorAuth?.isEnabled) {
            const setup2FABtn = document.getElementById('setup-2fa-btn');
            setup2FABtn.disabled = true;
            setup2FABtn.textContent = '2 Factor Authentication Enabled';
            const StatusHeader = document.getElementById('twofaHeader');
            StatusHeader.textContent = 'Two-Factor Authentication Enabled';
            StatusHeader.classList.remove('twofaheader-disabled');
            StatusHeader.classList.add('twofaheader-enabled');
            statusContainer.innerHTML = `
            <div class="twofa-enabled">
                <i class="fas fa-shield-alt" style="color: var(--success); font-size: 24px; margin-bottom: 12px;"></i>
                <h4>Two-Factor Authentication is Enabled</h4>
                <p>Your account is protected with 2 factor Authentication</p>
                <button class="btn btn-danger btn-sm" id="disable2FABtn">
                    Disable 2 step factor Authentication
                </button>
            </div>
        `;

            // Show backup codes section when 2FA is enabled
            backupCodesSection.style.display = 'block';

            // Add event listeners
            document.getElementById('disable2FABtn').addEventListener('click', () => {
                this.disable2FA();
            });

        } else {
            const StatusHeader = document.getElementById('twofaHeader');
            StatusHeader.textContent = 'Two-Factor Authentication Disabled';
            StatusHeader.classList.remove('twofaheader-enabled');
            StatusHeader.classList.add('twofaheader-disabled');
            statusContainer.innerHTML = `
            <div class="twofa-disabled">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 24px; margin-bottom: 12px;"></i>
                <h4>Two-Factor Authentication is Disabled</h4>
                <p>Enable 2 step factor Authentication to secure your account</p>
                <button class="btn btn-primary" id="setup2FABtn">
                    Setup 2 step factor Authentication
                </button>
            </div>
        `;

            // Hide backup codes section when 2FA is disabled
            backupCodesSection.style.display = 'none';

            // Add event listener
            document.getElementById('setup2FABtn').addEventListener('click', () => {
                this.setup2FA();
            });
        }
    }

    async loadSocialAccounts() {
        try {
            const response = await this.makeRequest('/social-accounts');
            const container = document.getElementById('socialAccounts');

            if (response.data.socialAccounts.length === 0) {
                container.innerHTML = '<p class="text-center">No social accounts linked</p>';
                return;
            }

            const accountsHtml = response.data.socialAccounts.map(account => `
                <div class="social-account">
                    <div class="social-account-info">
                        <div class="social-icon ${account.provider}">
                            <i class="fab fa-${account.provider}"></i>
                        </div>
                        <div>
                            <h4>${account.displayName}</h4>
                            <p>${account.email}</p>
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm unlink-social-btn" data-provider="${account.provider}">
                        Unlink
                    </button>
                </div>
            `).join('');

            container.innerHTML = accountsHtml;

            // Attach event listeners to dynamically created elements
            container.querySelectorAll('.unlink-social-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const provider = button.dataset.provider;
                    this.unlinkSocial(provider);
                });
            });

            container.innerHTML = accountsHtml;

        } catch (error) {
            document.getElementById('socialAccounts').innerHTML =
                '<p class="text-center">Error loading social accounts</p>';
            this.showToast('error', 'Error', 'Failed to load social accounts');
        }
    }

    async requestAccountDeletion() {
        this.showModaldeletion('accountDeletionModal');
        this.showToast('info', 'Info', 'Type "DELETE MY ACCOUNT" to confirm deletion');

        // Enable/disable the delete button based on confirmation text
        const confirmTextInput = document.getElementById('deleteConfirmText');
        const confirmButton = document.getElementById('confirmDeletionBtn');
        const passwordInput = document.getElementById('deletePassword');

        if (!confirmTextInput || !confirmButton) {
            this.showToast('error', 'Error', 'Required elements for account deletion not found');
            return;
        }
        confirmTextInput.addEventListener('input', () => {
            // Check if the input matches the required text
            const typed = confirmTextInput.value.trim().toUpperCase();
            const required = 'DELETE MY ACCOUNT';
            if (!passwordInput) {
                this.showToast('error', 'Error', 'Password input for deletion not found');
                return;
            }
            if (required === typed) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                // If password is empty, auto-focus it
                if (!passwordInput.value) {
                    passwordInput.focus();
                }
            } else {
                confirmButton.disabled = true;
                // If password is empty, auto-focus it
                if (!passwordInput.value) {
                    passwordInput.focus();
                }
                confirmButton.style.opacity = '0.6';
                confirmButton.style.background = '#894e54';
            }
        });

        // Allow pressing Enter in password field to submit
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !confirmButton.disabled) {
                e.preventDefault();
                deletionForm.requestSubmit(); // safer than form.submit()
            }
        });

        // Remove existing listeners and add new one
        confirmTextInput.removeEventListener('input', this.deletionInputHandler);

        // Store handler reference for later removal
        this.deletionInputHandler = () => {
            confirmButton.disabled = confirmTextInput.value !== 'DELETE MY ACCOUNT';
        };

        confirmTextInput.addEventListener('input', this.deletionInputHandler);
    }

    async confirmAccountDeletion(formData) {
        try {
            this.showLoading(true);

            const response = await this.makeRequest('/account', {
                method: 'DELETE',
                body: JSON.stringify({
                    confirmText: formData.get('confirmText'),
                    password: formData.get('password')
                })
            });

            this.showToast('success', 'Account Deleted', 'Your account has been successfully deleted. You will be redirected shortly.');

            // Clear any stored auth data and redirect after delay
            setTimeout(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
            }, 3000);

        } catch (error) {
            this.showToast('error', 'Deletion Failed', error.message || 'Failed to delete account');
        } finally {
            this.showLoading(false);
        }
    }

    async getModalInput(title, message, options = {}) {
        return new Promise((resolve, reject) => {
            const {
                inputType = 'text',
                placeholder = '',
                required = false,
                confirmButtonText = 'Confirm',
                confirmButtonColor = '#007bff',
                inputId = 'modalInput'
            } = options;

            const modalContent = `
            <div class="input-container">
                <p>${message}</p>
                <input 
                    type="${inputType}" 
                    id="${inputId}" 
                    placeholder="${placeholder}" 
                    style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
                <div class="modal-actions" style="margin-top: 15px; text-align: right;">
                    <button id="modalCancel" style="margin-right: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="modalConfirm" style="padding: 8px 16px; background: ${confirmButtonColor}; color: white; border: none; border-radius: 4px; cursor: pointer;">${confirmButtonText}</button>
                </div>
            </div>
        `;

            // Show modal with input
            this.showModal(title, modalContent);

            // Get references to the input and buttons
            const input = document.getElementById(inputId);
            const cancelBtn = document.getElementById('modalCancel');
            const confirmBtn = document.getElementById('modalConfirm');
            const modalCloseBtn = document.getElementById('modalClose');

            // Focus on input
            input.focus();

            // Handle confirm button click
            confirmBtn.onclick = () => {
                const value = input.value;
                if (required && !value.trim()) {
                    this.showToast('error', 'Validation Error', 'This field is required');
                    input.focus();
                    return;
                }
                this.hideModal();
                resolve(value || null);
            };

            // Handle cancel button click
            cancelBtn.onclick = () => {
                this.hideModal();
                resolve(null);
            };

            // Handle modal close button click
            modalCloseBtn.onclick = () => {
                this.hideModal();
                resolve(null);
            };

            // Handle Enter key press in input
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            };

            // Handle Escape key press
            document.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            };
        });
    }

    async getPasswordForDeletion() {
        return await this.getModalInput(
            'Account Deletion',
            'Please enter your password to confirm account deletion:',
            {
                inputType: 'password',
                placeholder: 'Enter your password',
                required: true,
                confirmButtonText: 'Confirm Delete',
                confirmButtonColor: '#dc3545'
            }
        );
    }

    async getPasswordFor2FA() {
        return await this.getModalInput(
            'Disable 2FA',
            'Please enter your password to disable 2FA:',
            {
                inputType: 'password',
                placeholder: 'Enter your password',
                required: true,
                confirmButtonText: 'Disable 2FA',
                confirmButtonColor: '#ffc107'
            }
        );
    }

    async getNewRole() {
        return await this.getModalInput(
            'Change User Role',
            'Enter new role (user, moderator, admin, superadmin):',
            {
                placeholder: 'e.g., moderator',
                required: true,
                confirmButtonText: 'Update Role',
                confirmButtonColor: '#28a745'
            }
        );
    }

    async getReason(action) {
        return await this.getModalInput(
            'Reason Required',
            `Reason for ${action}ing this user (optional):`,
            {
                placeholder: 'Enter reason...',
                required: false,
                confirmButtonText: 'Continue',
                confirmButtonColor: '#007bff'
            }
        );
    }

    async requestAccountDeletionEmail() {
        try {
            const password = await this.getPasswordForDeletion();
            if (!password) return;

            this.showLoading(true);

            const response = await this.makeRequest('/delete-request', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            this.showToast('success', 'Deletion Requested', 'Please check your email for confirmation instructions.');

        } catch (error) {
            this.showToast('error', 'Request Failed', error.message || 'Failed to request account deletion');
        } finally {
            this.showLoading(false);
        }
    }

    initializeBackupCodes() {
        // Add event listeners for backup codes buttons
        const viewBackupCodesBtn = document.getElementById('viewBackupCodesBtn');
        const regenerateBackupCodesBtn = document.getElementById('regenerateBackupCodesBtn');

        if (viewBackupCodesBtn) {
            viewBackupCodesBtn.addEventListener('click', () => this.viewBackupCodes());
        }

        if (regenerateBackupCodesBtn) {
            regenerateBackupCodesBtn.addEventListener('click', () => this.regenerateBackupCodes());
        }
    }

    viewBackupCodes() {
        const backupCodesDisplay = document.getElementById('backupCodesDisplay');

        if (backupCodesDisplay.style.display === 'none' || !backupCodesDisplay.style.display) {
            // Show and load backup codes
            this.loadBackupCodes();
        } else {
            // Hide backup codes
            backupCodesDisplay.style.display = 'none';
            // Update button text
            const viewBtn = document.getElementById('viewBackupCodesBtn');
            if (viewBtn) {
                viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Backup Codes';
            }
        }
    }

    async loadBackupCodes() {
        try {
            // Check if user is authenticated first
            const token = this.getCookie('authToken') || {};
            console.log('Token found:', !!token);
            if (!token) {
                console.error('No authentication token found');
                this.showBackupCodesMessage('warning', 'Authentication Required',
                    'Please log in to view backup codes.',
                    `<button class="btn btn-primary" onclick="window.location.href='/login'">
                <i class="fas fa-sign-in-alt"></i> Log In
            </button>`
                );
                return;
            }

            // Check if current user data is loaded
            if (!this.currentUser) {
                console.error('User data not loaded');
                this.showBackupCodesMessage('info', 'Loading User Data...',
                    'Please wait while we load your account information.',
                    '<div class="spinner-border spinner-border-sm" role="status"></div>'
                );

                // Try to load user data first
                await this.loadUserData();

                // Check again after loading
                if (!this.currentUser) {
                    this.showBackupCodesMessage('warning', 'Authentication Required',
                        'Please log in to view backup codes.',
                        `<button class="btn btn-primary" onclick="window.location.href='/login'">
                    <i class="fas fa-sign-in-alt"></i> Log In
                </button>`
                    );
                    return;
                }
            }

            // Always check if 2FA is enabled first
            if (!this.currentUser?.twoFactorAuth?.isEnabled) {
                // 2FA not enabled - show setup message
                this.showBackupCodesMessage('info', '2FA Not Enabled',
                    'You need to enable Two-Factor Authentication before you can generate backup codes.',
                    `<button class="btn btn-primary" onclick="dashboard.setup2FA()">
                <i class="fas fa-shield-alt"></i> Enable 2FA
            </button>`
                );
                return;
            }

            // Show loading state
            this.showBackupCodesMessage('info', 'Loading...',
                'Fetching backup codes status...',
                '<div class="spinner-border spinner-border-sm" role="status"></div>'
            );

            // 2FA is enabled - get backup codes status
            console.log('About to make backup codes request...');
            const response = await this.makeRequest('/2fa/backup-codes', { method: 'GET' });
            console.log('Backup codes response received:', response);

            // Show the backup codes display
            const backupCodesDisplay = document.getElementById('backupCodesDisplay');
            const container = document.getElementById('backupCodesList');

            if (!backupCodesDisplay || !container) {
                console.error('Required DOM elements not found');
                this.showToast('error', 'Error', 'Interface error - please refresh the page');
                return;
            }

            backupCodesDisplay.style.display = 'block';

            // Update view button text
            const viewBtn = document.getElementById('viewBackupCodesBtn');
            if (viewBtn) {
                viewBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Backup Codes';
            }

            if (response.data.hasBackupCodes) {
                // User has existing backup codes
                container.innerHTML = `
            <div class="backup-codes-status">
                <div class="alert alert-success">
                    <strong><i class="fas fa-check-circle"></i> Backup codes are available</strong>
                    <p>You have ${response.data.codeCount} backup codes.</p>
                    <p class="text-muted">For security reasons, backup codes are not displayed here. 
                    Use the "Generate New Backup Codes" button to create and view new ones.</p>
                </div>
            </div>
        `;
            } else {
                // No backup codes available
                container.innerHTML = `
            <div class="backup-codes-status">
                <div class="alert alert-warning">
                    <strong><i class="fas fa-exclamation-triangle"></i> No backup codes available</strong>
                    <p>Generate backup codes to secure your account in case you lose access to your authenticator app.</p>
                </div>
            </div>
        `;
            }

        } catch (error) {
            console.error('Error loading backup codes:', error);

            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                this.showBackupCodesMessage('warning', 'Authentication Required',
                    'Your session has expired. Please log in again.',
                    `<button class="btn btn-primary" onclick="window.location.href='/login'">
                <i class="fas fa-sign-in-alt"></i> Log In
            </button>`
                );
            } else if (error.message.includes('Two-factor authentication required')) {
                this.showBackupCodesMessage('warning', '2FA Verification Required',
                    'Please verify your 2FA code first to access backup codes.',
                    `<button class="btn btn-primary" onclick="dashboard.show2FAVerification()">
                <i class="fas fa-key"></i> Verify 2FA
            </button>`
                );
            } else if (error.message.includes('2FA is not enabled')) {
                this.showBackupCodesMessage('info', '2FA Not Enabled',
                    'You need to enable Two-Factor Authentication first.',
                    `<button class="btn btn-primary" onclick="dashboard.setup2FA()">
                <i class="fas fa-shield-alt"></i> Enable 2FA
            </button>`
                );
            } else {
                this.showBackupCodesMessage('danger', 'Error',
                    'Failed to load backup codes. Please try again.',
                    `<button class="btn btn-outline-primary" onclick="dashboard.loadBackupCodes()">
                <i class="fas fa-redo"></i> Retry
            </button>`
                );
                this.showToast('error', 'Error', 'Failed to load backup codes');
            }
        }
    }

    showBackupCodesMessage(type, title, message, buttonHtml = '') {
        const backupCodesDisplay = document.getElementById('backupCodesDisplay');
        const container = document.getElementById('backupCodesList');

        backupCodesDisplay.style.display = 'block';

        // Update view button text
        const viewBtn = document.getElementById('viewBackupCodesBtn');
        if (viewBtn) {
            viewBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Backup Codes';
        }

        container.innerHTML = `
    <div class="alert alert-${type}">
        <strong><i class="fas fa-info-circle"></i> ${title}</strong>
        <p>${message}</p>
        ${buttonHtml}
    </div>
`;
    }

    async regenerateBackupCodes() {
        try {
            // Check if 2FA is enabled first
            if (!this.currentUser?.twoFactorAuth?.isEnabled) {
                this.showToast('error', 'Error', '2FA is not enabled. Please enable 2FA first.');
                return;
            }

            // Show confirmation dialog ONLY ONCE
            const confirmed = await this.showConfirm('Are you sure you want to generate new backup codes? This will invalidate your existing codes.');
            if (!confirmed) {
                return;
            }

            if (confirmed) {
                // Show loading state
                this.showLoading(true);

                // Show loading in backup codes area
                this.showBackupCodesMessage('info', 'Generating...',
                    'Creating new backup codes...',
                    '<div class="spinner-border spinner-border-sm" role="status"></div>'
                );

                // Call the regenerate endpoint
                const response = await this.makeRequest('/2fa/backup-codes/regenerate', {
                    method: 'POST'
                });

                // IMMEDIATELY display the newly generated codes (don't call loadBackupCodes again)
                if (response.data && response.data.backupCodes) {
                    this.displayBackupCodes(response.data.backupCodes);
                } else {
                    throw new Error('No backup codes received from server');
                    this.showToast('error', 'Error', 'Failed to generate new backup codes');
                }
            }

        } catch (error) {
            console.error('Error generating backup codes:', error);

            if (error.message.includes('Two-factor authentication required')) {
                this.showToast('warning', '2FA Required', 'Please verify your 2FA code first');
                this.show2FAVerification();
            } else if (error.message.includes('2FA is not enabled')) {
                this.showToast('error', 'Error', '2FA is not enabled. Please enable 2FA first.');
                this.showBackupCodesMessage('info', '2FA Not Enabled',
                    'You need to enable Two-Factor Authentication first.',
                    `<button class="btn btn-primary" id="enable2FAButton"></button>
                <i class="fas fa-shield-alt"></i> Enable 2FA
            </button>`
                );
                const enable2FAButton = document.getElementById('enable2FAButton');
                if (enable2FAButton) {
                    enable2FAButton.addEventListener('click', () => this.setup2FA());
                }
            } else {
                this.showBackupCodesMessage('danger', 'Error',
                    'Failed to generate new backup codes. Please try again.',
                    `<button class="btn btn-outline-primary" id="retryRegenerateBackupCodes">
                <i class="fas fa-redo"></i> Retry
            </button>`
                );
                // Use event listener instead of inline onclick
                const retryButton = document.getElementById('retryRegenerateBackupCodes');
                if (retryButton) {
                    retryButton.addEventListener('click', () => this.regenerateBackupCodes());
                }
                this.showToast('error', 'Error', 'Failed to generate new backup codes');
            }
        } finally {
            this.showLoading(false);
        }
    }

    displayBackupCodes(codes) {
        const backupCodesDisplay = document.getElementById('backupCodesDisplay');
        const container = document.getElementById('backupCodesList');

        backupCodesDisplay.style.display = 'block';

        // Update view button text
        const viewBtn = document.getElementById('viewBackupCodesBtn');
        if (viewBtn.classList.contains('active')) {
            viewBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Backup Codes';
        }

        // Create safe strings for onclick handlers
        const codesForDownload = codes.join(',');
        const codesForCopy = codes.join('\\n');

        container.innerHTML = `
        <div class="backup-codes-generated">
        <div class="alert alert-danger">
            <strong><i class="fas fa-exclamation-triangle"></i> Important: Save These Codes Now!</strong>
            <p>These backup codes will not be shown again. Save them securely before closing this page.</p>
        </div>
        
        <div class="backup-codes-grid">
            ${codes.map((code, index) => `
            <div class="backup-code-item">
                <span class="code-number">${index + 1}.</span>
                <code class="code-value">${code}</code>
                <button class="btn btn-sm btn-outline-secondary copy-code-btn" 
                    data-code="${code}"
                    title="Copy this code">
                <i class="fas fa-copy"></i>
                </button>
            </div>
            `).join('')}
        </div>
        
        <div class="backup-codes-actions mt-3">
            <button class="btn btn-success download-codes-btn" data-codes="${codesForDownload}">
            <i class="fas fa-download"></i> Download Codes
            </button>
            <button class="btn btn-info copy-all-codes-btn" data-codes="${codesForCopy}">
            <i class="fas fa-clipboard"></i> Copy All Codes
            </button>
            <button class="btn btn-secondary view-backup-codes-btn">
            <i class="fas fa-check"></i> I've Saved These Codes
            </button>
        </div>
        </div>
    `;

        // Attach event listeners to dynamically created elements
        container.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.code;
                this.copyToClipboard(code);
            });
        });

        container.querySelectorAll('.download-codes-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const codes = btn.dataset.codes;
                this.downloadBackupCodes(codes);
            });
        });

        container.querySelectorAll('.copy-all-codes-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const codes = btn.dataset.codes;
                this.copyAllBackupCodes(codes);
            });
        });

        container.querySelectorAll('.view-backup-codes-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.viewBackupCodes();
            });
        });

        // Show the warning section
        const warningSection = document.querySelector('.backup-codes-warning');
        if (warningSection) {
            warningSection.style.display = 'block';
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    copyAllBackupCodes(codesText) {
        const formattedCodes = `TransitFLOW Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${codesText.split('\n').map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nKeep these codes safe! Each code can only be used once.`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(formattedCodes).then(() => {
                this.showToast('success', 'Copied', 'All backup codes copied to clipboard');
            }).catch(() => {
                this.fallbackCopyToClipboard(formattedCodes);
            });
        } else {
            this.fallbackCopyToClipboard(formattedCodes);
        }
    }

    downloadBackupCodes(codesString) {
        const codes = codesString.split(',');
        const content = `TransitFLOW - Two-Factor Authentication Backup Codes\n\n` +
            `Generated: ${new Date().toLocaleString()}\n` +
            `Account: ${this.currentUser.email}\n\n` +
            `IMPORTANT: Keep these codes safe and secure!\n` +
            `Each code can only be used once.\n\n` +
            `Backup Codes:\n` +
            codes.map((code, index) => `${index + 1}. ${code}`).join('\n') +
            `\n\nIf you lose access to your authenticator app, you can use these codes to regain access to your account.\n` +
            `Generate new backup codes if you suspect these have been compromised.`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transitflow-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showToast('success', 'Downloaded', 'Backup codes saved to file');
    }

    async loadNotifications() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/notifications');
            const container = document.getElementById('notificationsList');

            if (!container.dataset.listenerAttached) {
                container.addEventListener('click', (e) => {
                    const deleteBtn = e.target.closest('.notification-delete-btn');
                    const markReadBtn = e.target.closest('.notification-mark-read-btn');
                    const clearAllBtn = e.target.closest('#clearAllNotificationsBtn');

                    if (deleteBtn) {
                        const notificationId = deleteBtn.dataset.notificationId;
                        this.deleteNotification(notificationId);
                    } else if (markReadBtn) {
                        const notificationId = markReadBtn.dataset.notificationId;
                        this.markNotificationAsRead(notificationId);
                    } else if (clearAllBtn) {
                        this.clearAllNotifications();
                    }
                });

                // Mark listener so it doesn't get attached again
                container.dataset.listenerAttached = "true";
            }

            if (response.data.notifications.length === 0) {
                container.innerHTML = '<p class="text-center">No notifications</p>';
                this.updateNotificationBadge(0);
                return;
            }

            // Build notifications list HTML
            const notificationsHtml = response.data.notifications.map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" data-notification-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <div class="notification-time">${new Date(notification.createdAt).toLocaleString()}</div>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                        <button class="notification-mark-read-btn" data-notification-id="${notification.id}" title="Mark as read">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="notification-delete-btn" data-notification-id="${notification.id}" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

            // Add "Clear All" button at the top
            container.innerHTML = `
            <div class="notification-header">
            </div>
            ${notificationsHtml}
        `;

            const unreadCount = response.data.notifications.filter(n => !n.read).length;
            this.updateNotificationBadge(unreadCount);

        } catch (error) {
            document.getElementById('notificationsList').innerHTML =
                '<p class="text-center">Error loading notifications</p>';
            this.showToast('error', 'Error', 'Failed to load notifications');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteNotification(notificationId) {
        try {
            const button = document.querySelector(`.notification-delete-btn[data-notification-id="${notificationId}"]`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }

            await this.makeRequest(`/notifications/${notificationId}`, { method: 'DELETE' });

            const notificationItem = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.remove();
            }

            this.updateNotificationBadge();
        } catch (error) {
            this.showToast('error', 'Error', error.message.includes('404') ? 'Notification not found' : 'Failed to delete notification');

            const button = document.querySelector(`.notification-delete-btn[data-notification-id="${notificationId}"]`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-times"></i>';
            }
        }
    }


    async markNotificationAsRead(notificationId) {
        try {
            const button = document.querySelector(`.notification-mark-read-btn[data-notification-id="${notificationId}"]`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }

            await this.makeRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });

            const notificationItem = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.classList.remove('unread');
                const markReadBtn = notificationItem.querySelector('.notification-mark-read-btn');
                if (markReadBtn) markReadBtn.remove();
            }

            this.updateNotificationBadge();
        } catch (error) {
            this.showToast('error', 'Error', error.message.includes('404') ? 'Notification not found' : 'Failed to mark notification as read');

            const button = document.querySelector(`.notification-mark-read-btn[data-notification-id="${notificationId}"]`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-check"></i>';
            }
        }
    }


    updateNotificationBadge() {
        const unreadItems = document.querySelectorAll('.notification-item.unread').length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = unreadItems;
            badge.style.display = unreadItems > 0 ? 'block' : 'none';
        }
    }

    async markAllNotificationsAsRead() {
        try {
            await this.makeRequest('/notifications/mark-all-read', {
                method: 'PUT'
            });

            // Update all notification items in DOM
            const unreadItems = document.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                item.classList.remove('unread');
                const markReadBtn = item.querySelector('.notification-mark-read-btn');
                if (markReadBtn) {
                    markReadBtn.remove();
                }
            });

            // Update notification badge
            this.updateNotificationBadge();


        } catch (error) {
            this.showToast('error', 'Error', 'Failed to mark all notifications as read');
        }
    }

    async clearAllNotifications() {
        if (!await this.showConfirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
            return;
        }

        try {
            await this.makeRequest('/notifications/clear-all', {
                method: 'DELETE'
            });

            // Clear notifications from DOM
            const container = document.getElementById('notificationsList');
            if (container) {
                container.innerHTML = '<p class="text-center">No notifications</p>';
            }

            // Update notification badge
            this.updateNotificationBadge();

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to clear all notifications');
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'security': 'fas fa-shield-alt',
            'account': 'fas fa-user',
            'system': 'fas fa-cog',
            'marketing': 'fas fa-bullhorn',
            'feature': 'fas fa-star'
        };
        return icons[type] || 'fas fa-bell';
    }

    // Settings
    async loadSettings() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/settings');
            const settings = response?.data?.settings || {};

            // Apply theme from database if available
            if (settings.theme && settings.theme !== this.currentTheme) {
                this.currentTheme = settings.theme;
                this.applyTheme(settings.theme);
            }

            // Update general settings form safely
            const settingsForm = document.getElementById('settingsForm');
            if (settingsForm) {
                if (settingsForm.language) {
                    settingsForm.language.value = settings.language || 'en';
                }
                if (settingsForm.timezone) {
                    settingsForm.timezone.value = settings.timezone || 'UTC';
                }
                if (settingsForm.theme) {
                    settingsForm.theme.value = settings.theme || 'auto';
                }
                if (settingsForm.gender) {
                    settingsForm.gender.value = settings.gender || '';
                }
            }

            // Sync custom theme dropdown highlight
            if (settings.theme) {
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.theme === settings.theme);
                });
            }

            // Load other settings sections
            await Promise.all([
                this.loadNotificationSettings(settings),
                this.loadPrivacySettings(settings)
            ]);

        } catch (error) {
            console.error('Error loading settings:', error);

            const settingsContainer = document.getElementById('settingsContainer');
            if (settingsContainer) {
                settingsContainer.innerHTML = '<p class="text-center">Failed to load settings</p>';
            }

            this.showToast('error', 'Error', 'Failed to load settings');
        } finally {
            this.showLoading(false);
        }
    }

    async loadNotificationSettings(settings) {
        const container = document.getElementById('notificationSettings');
        const notifications = settings.notifications || {};

        const settingsHtml = `
        <div class="setting-group">
            <h4>Email Notifications</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Security Alerts</h5>
                    <p>Get notified about security-related activities</p>
                </div>
                <div class="toggle-switch ${notifications.email?.security ? 'active' : ''}" 
                     data-setting="notifications.email.security">
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Account Updates</h5>
                    <p>Receive notifications about account changes</p>
                </div>
                <div class="toggle-switch ${notifications.email?.updates ? 'active' : ''}" 
                     data-setting="notifications.email.updates">
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Marketing</h5>
                    <p>Receive marketing emails</p>
                </div>
                <div class="toggle-switch ${notifications.email?.marketing ? 'active' : ''}" 
                     data-setting="notifications.email.marketing">
                </div>
            </div>
        </div>
        <div class="setting-group">
            <h4>Push Notifications</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Security Alerts</h5>
                    <p>Push notifications for security events</p>
                </div>
                <div class="toggle-switch ${notifications.push?.security ? 'active' : ''}" 
                     data-setting="notifications.push.security">
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Updates</h5>
                    <p>Push notifications for account updates</p>
                </div>
                <div class="toggle-switch ${notifications.push?.updates ? 'active' : ''}" 
                     data-setting="notifications.push.updates">
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Marketing</h5>
                    <p>Push notifications for promotions</p>
                </div>
                <div class="toggle-switch ${notifications.push?.marketing ? 'active' : ''}" 
                     data-setting="notifications.push.marketing">
                </div>
            </div>
        </div>
        <div class="setting-group">
            <h4>SMS Notifications</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Security Alerts</h5>
                    <p>SMS notifications for security events</p>
                </div>
                <div class="toggle-switch ${notifications.sms?.security ? 'active' : ''}" 
                     data-setting="notifications.sms.security">
                </div>
            </div>
        </div>
    `;

        container.innerHTML = settingsHtml;
        this.initToggleSwitches();
    }

    async loadPrivacySettings(settings) {
        const container = document.getElementById('privacySettings');
        const privacy = settings.privacy || {};

        const settingsHtml = `
        <div class="setting-group">
            <h4>Profile Visibility</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Profile Visibility</h5>
                    <p>Control who can see your profile</p>
                </div>
                <div class="select-wrapper">
                    <select class="setting-select" data-setting="privacy.profileVisibility">
                        <option value="public" ${privacy.profileVisibility === 'public' ? 'selected' : ''}>Public</option>
                        <option value="friends" ${privacy.profileVisibility === 'friends' ? 'selected' : ''}>Friends Only</option>
                        <option value="private" ${privacy.profileVisibility === 'private' ? 'selected' : ''}>Private</option>
                    </select>
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Location Sharing</h5>
                    <p>Allow sharing your location with other users</p>
                </div>
                <div class="toggle-switch ${privacy.locationSharing ? 'active' : ''}" 
                     data-setting="privacy.locationSharing">
                </div>
            </div>
        </div>
        <div class="setting-group">
            <h4>Data Collection</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Analytics</h5>
                    <p>Allow collection of usage analytics</p>
                </div>
                <div class="toggle-switch ${privacy.dataCollection?.analytics ? 'active' : ''}" 
                     data-setting="privacy.dataCollection.analytics">
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Marketing</h5>
                    <p>Receive marketing communications</p>
                </div>
                <div class="toggle-switch ${privacy.dataCollection?.marketing ? 'active' : ''}" 
                     data-setting="privacy.dataCollection.marketing">
                </div>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <h5>Personalization</h5>
                    <p>Allow data collection for personalized experience</p>
                </div>
                <div class="toggle-switch ${privacy.dataCollection?.personalization ? 'active' : ''}" 
                     data-setting="privacy.dataCollection.personalization">
                </div>
            </div>
        </div>
    `;

        container.innerHTML = settingsHtml;
        this.initToggleSwitches();
        this.initSelectElements();
    }

    initToggleSwitches() {
        // Remove existing event listeners to prevent duplicates
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            // Clone and replace to remove all event listeners
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
        });

        // Add fresh event listeners
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const setting = toggle.dataset.setting;

                // Temporarily disable the toggle to prevent double-clicks
                toggle.style.pointerEvents = 'none';

                try {
                    // Toggle the visual state immediately for better UX
                    const wasActive = toggle.classList.contains('active');
                    toggle.classList.toggle('active');
                    const newValue = toggle.classList.contains('active');
                    // Update the setting
                    await this.updateSetting(setting, newValue);

                } catch (error) {
                    // Revert the visual state if the update failed
                    toggle.classList.toggle('active');
                    this.showToast('error', 'Error', 'Failed to update setting');
                } finally {
                    // Re-enable the toggle
                    setTimeout(() => {
                        toggle.style.pointerEvents = 'auto';
                    }, 300);
                }
            });

            // Add visual feedback for hover
            toggle.addEventListener('mouseenter', () => {
                toggle.style.transform = 'scale(1.05)';
            });

            toggle.addEventListener('mouseleave', () => {
                toggle.style.transform = 'scale(1)';
            });
        });
    }

    initSelectElements() {
        document.querySelectorAll('.setting-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                const value = e.target.value;
                this.updateSetting(setting, value);
            });
        });
    }

    async updateSetting(settingPath, value) {
        try {
            // Create a unique key for this request
            const requestKey = `${settingPath}_${value}`;

            // Prevent duplicate requests
            if (this.pendingSettingRequests && this.pendingSettingRequests.has(requestKey)) {
                console.log('Duplicate request prevented for:', requestKey);
                return this.pendingSettingRequests.get(requestKey);
            }

            // Initialize pending requests tracker
            if (!this.pendingSettingRequests) {
                this.pendingSettingRequests = new Map();
            }

            // Validate the setting path
            if (!settingPath || typeof settingPath !== 'string') {
                throw new Error('Invalid setting path');
            }

            const pathParts = settingPath.split('.');
            const updateData = {};

            // Build nested object correctly
            let current = updateData;
            for (let i = 0; i < pathParts.length - 1; i++) {
                if (!current[pathParts[i]]) {
                    current[pathParts[i]] = {};
                }
                current = current[pathParts[i]];
            }
            current[pathParts[pathParts.length - 1]] = value;

            // Create and store the promise
            const requestPromise = this.makeRequest('/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            }).then(response => {
                if (response && response.success) {
                    // Only show success toast for non-theme settings to avoid spam
                    if (settingPath !== 'theme') {

                    }
                } else {
                    throw new Error(response?.message || 'Failed to update setting');
                    show.this.showToast('error', 'Error', response?.message || 'Failed to update setting');
                }
                return response;
            }).finally(() => {
                // Clean up the pending request
                this.pendingSettingRequests.delete(requestKey);
            });

            this.pendingSettingRequests.set(requestKey, requestPromise);
            return await requestPromise;

        } catch (error) {
            this.showToast('error', 'Error', error.message || 'Failed to update setting');
            throw error;
        }
    }

    validateSettingsStructure(settings) {
        return {
            language: settings.language || 'en',
            timezone: settings.timezone || 'UTC',
            theme: settings.theme || 'light',
            notifications: {
                email: {
                    enabled: settings.notifications?.email?.enabled ?? true,
                    security: settings.notifications?.email?.security ?? true,
                    marketing: settings.notifications?.email?.marketing ?? false,
                    updates: settings.notifications?.email?.updates ?? true
                },
                push: {
                    enabled: settings.notifications?.push?.enabled ?? true,
                    security: settings.notifications?.push?.security ?? true,
                    marketing: settings.notifications?.push?.marketing ?? false,
                    updates: settings.notifications?.push?.updates ?? true
                },
                sms: {
                    enabled: settings.notifications?.sms?.enabled ?? false,
                    security: settings.notifications?.sms?.security ?? false,
                    marketing: settings.notifications?.sms?.marketing ?? false
                }
            },
            privacy: {
                profileVisibility: settings.privacy?.profileVisibility || 'public',
                locationSharing: settings.privacy?.locationSharing ?? false,
                dataCollection: {
                    analytics: settings.privacy?.dataCollection?.analytics ?? true,
                    marketing: settings.privacy?.dataCollection?.marketing ?? false,
                    personalization: settings.privacy?.dataCollection?.personalization ?? true
                }
            }
        };
    }

    async markAsTrusted(deviceId) {
        try {
            await this.makeRequest(`/devices/${deviceId}/trust`, {
                method: 'PATCH'
            });
            this.showToast('success', 'Success', 'Device marked as trusted');
            this.loadDevices(); // Refresh the list
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to mark device as trusted');
        }
    }

    // Devices
    async loadDevices() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/devices');
            const container = document.getElementById('devicesList');

            if (response.data.devices.length === 0) {
                container.innerHTML = '<p class="text-center">No devices found</p>';
                return;
            }

            const devicesHtml = response.data.devices.map(device => {
                const isTrustedLabel = device.isTrusted
                    ? '<span class="badge bg-success">Trusted</span>'
                    : '<span class="badge bg-secondary">Not Trusted</span>';

                const markTrustedButton = !device.isTrusted
                    ? `<button class="btn btn-primary btn-sm mark-trusted-btn" data-device-id="${device.deviceId}">
                        Mark as Trusted
                   </button>`
                    : '';

                return `
                <div class="device-item">
                    <div class="device-info">
                        <div class="device-icon">
                            <i class="${this.getDeviceIcon(device.platform)}"></i>
                        </div>
                        <div class="device-details">
                            <h4>${device.deviceName || device.platform} ${isTrustedLabel}</h4>
                            <p>${device.browser} • ${device.os}</p>
                            <p>Last used: ${new Date(device.lastUsed).toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="device-actions">
                        ${markTrustedButton}
                        <button class="btn btn-danger btn-sm remove-device-btn" data-device-id="${device.deviceId}">
                            Remove
                        </button>
                    </div>
                </div>
            `;
            }).join('');

            container.innerHTML = devicesHtml;

            // Attach event listeners AFTER rendering
            container.querySelectorAll('.remove-device-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const deviceId = e.currentTarget.getAttribute('data-device-id');
                    this.removeDevice(deviceId);
                });
            });

            container.querySelectorAll('.mark-trusted-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const deviceId = e.currentTarget.getAttribute('data-device-id');
                    this.markAsTrusted(deviceId);
                });
            });

        } catch (error) {
            document.getElementById('devicesList').innerHTML =
                '<p class="text-center">Error loading devices</p>';
            this.showToast('error', 'Error', 'Failed to load devices');
        } finally {
            this.showLoading(false);
        }
    }

    getDeviceIcon(platform) {
        const icons = {
            'mobile': 'fas fa-mobile-alt',
            'tablet': 'fas fa-tablet-alt',
            'desktop': 'fas fa-desktop',
            'default': 'fas fa-laptop'
        };
        return icons[platform?.toLowerCase()] || icons.default;
    }

    // Sessions
    async loadSessions() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/sessions');
            const container = document.getElementById('sessionsList');

            if (response.data.sessions.length === 0) {
                container.innerHTML = '<p class="text-center">No active sessions</p>';
                return;
            }

            const sessionsHtml = response.data.sessions.map(session => `
            <div class="session-item ${session.isCurrent ? 'current-session' : ''}" data-session-id="${session.sessionId}">
                <div class="session-info">
                    <div class="session-icon">
                        <i class="${this.getDeviceIcon(session.device.platform)}"></i>
                    </div>
                    <div class="session-details">
                        <h4>${session.device.deviceName || session.device.platform} ${session.isCurrent ? '(Current)' : ''}</h4>
                        <p>${session.device.browser} • ${session.device.os}</p>
                        <p>IP: ${session.ipAddress} • ${session.device.location}</p>
                        <p>Started: ${new Date(session.createdAt).toLocaleString()}</p>
                    </div>
                </div>
                ${!session.isCurrent ? `
                    <button class="btn btn-danger btn-sm session-revoke-btn" data-session-id="${session.sessionId}">
                        <i class="fas fa-times"></i> Revoke
                    </button>
                ` : '<span class="current-badge">Current</span>'}
            </div>
        `).join('');

            container.innerHTML = sessionsHtml;

            // Add event delegation for revoke buttons
            container.addEventListener('click', (e) => {
                if (e.target.closest('.session-revoke-btn')) {
                    const button = e.target.closest('.session-revoke-btn');
                    const sessionId = button.dataset.sessionId;
                    this.revokeSession(sessionId);
                }
            });

        } catch (error) {
            document.getElementById('sessionsList').innerHTML =
                '<p class="text-center">Error loading sessions</p>';
            this.showToast('error', 'Error', 'Failed to load sessions');
        } finally {
            this.showLoading(false);
        }
    }

    // Analytics
    async loadAnalytics() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/analytics');
            const analytics = response.data.analytics;
            const container = document.getElementById('analyticsGrid');

            // Add debugging to see what data we're getting
            const analyticsHtml = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="stat-info">
                    <h3>${analytics.accountAge || 0}</h3>
                    <p>Days Active</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-sign-in-alt"></i>
                </div>
                <div class="stat-info">
                    <h3>${analytics.totalLogins || 0}</h3>
                    <p>Total Logins</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>${analytics.avgSessionsPerDay || 0}</h3>
                    <p>Avg Sessions/Day</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-info">
                    <h3>${analytics.totalSessions || 0}</h3>
                    <p>Total Sessions</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <div class="stat-info">
                    <h3>${analytics.uniqueDevices || analytics.deviceCount || 0}</h3>
                    <p>Unique Devices</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-globe"></i>
                </div>
                <div class="stat-info">
                    <h3>${analytics.uniqueLocations || 0}</h3>
                    <p>Unique Locations</p>
                </div>
            </div>
        `;

            container.innerHTML = analyticsHtml;

        } catch (error) {
            container.innerHTML = '<p class="text-center">Error loading analytics</p>';
            this.showToast('error', 'Error', 'Failed to load analytics');
            document.getElementById('analyticsGrid').innerHTML =
                '<p class="text-center">Error loading analytics</p>';
        } finally {
            this.showLoading(false);
        }
    }

    // Audit Logs
    async loadAuditLogs() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/audit-logs');
            const container = document.getElementById('auditLogsList');

            if (response.data.auditLogs.length === 0) {
                container.innerHTML = '<p class="text-center">No audit logs</p>';
                return;
            }

            const logsHtml = response.data.auditLogs.map(log => {
                let formattedDetails = 'No details available';

                if (typeof log.details === 'object' && log.details !== null) {
                    const { userType, deviceInfo } = log.details;
                    const lines = [];

                    if (userType) lines.push(`<p>User Type: ${userType}</p>`);
                    if (deviceInfo?.deviceName) lines.push(`<p>Device: ${deviceInfo.deviceName}</p>`);
                    if (deviceInfo?.location && deviceInfo.location !== 'Unknown Location') {
                        lines.push(`<p>Location: ${deviceInfo.location}</p>`);
                    }
                    if (deviceInfo?.ipAddress && deviceInfo.ipAddress !== '::1') {
                        lines.push(`<p>IP: ${deviceInfo.ipAddress}</p>`);
                    }

                    formattedDetails = lines.join('');
                } else if (typeof log.details === 'string') {
                    formattedDetails = log.details;
                }

                return `
                <div class="audit-log-item">
                    <div class="audit-action">${this.formatActionName(log.action)}</div>
                    <div class="audit-details">${formattedDetails}</div>
                    <div class="audit-time">${new Date(log.timestamp).toLocaleString()}</div>
                </div>
            `;
            }).join('');

            container.innerHTML = logsHtml;

        } catch (error) {
            document.getElementById('auditLogsList').innerHTML =
                '<p class="text-center">Error loading audit logs</p>';
            this.showToast('error', 'Error', 'Failed to load audit logs');
        } finally {
            this.showLoading(false);
        }
    }



    // Admin Panel
    async loadAdminData() {
        if (!this.currentUser || !['admin', 'superadmin'].includes(this.currentUser.role)) {
            this.showSection('dashboard');
            this.showToast('error', 'Access Denied', 'You do not have admin privileges');
            return;
        }

        try {
            const response = await this.makeRequest('/admin/users');
            const container = document.getElementById('adminUsersList');

            if (response.data.users.length === 0) {
                container.innerHTML = '<p class="text-center">No users found</p>';
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Create elements programmatically
            response.data.users.forEach(user => {
                const userItem = this.createUserElement(user);
                container.appendChild(userItem);
            });

        } catch (error) {
            document.getElementById('adminUsersList').innerHTML =
                '<p class="text-center">Error loading users</p>';
        }
    }

    createUserElement(user) {
        const userItem = document.createElement('div');
        userItem.className = 'admin-user-item';

        // Create user info section
        const userInfo = document.createElement('div');
        userInfo.className = 'admin-user-info';

        const avatar = document.createElement('img');
        avatar.src = user.profilePicture || 'https://spotless-orange-flea.myfilebase.com/ipfs/QmSaqA9tpYReUdr4Xw3uyvsCts5xTeHKsfdiHDiDjTUN4W';
        avatar.alt = user.username;
        avatar.className = 'admin-user-avatar';

        const userDetails = document.createElement('div');
        userDetails.className = 'admin-user-details';

        const h4 = document.createElement('h4');
        h4.textContent = user.fullName || user.username;

        const roleBadge = document.createElement('span');
        roleBadge.className = `role-badge ${user.role}`;
        roleBadge.textContent = user.role;

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${user.isActive ? 'active' : 'inactive'}`;
        statusBadge.textContent = user.isActive ? 'Active' : 'Inactive';

        h4.appendChild(roleBadge);
        h4.appendChild(statusBadge);

        const p = document.createElement('p');
        p.textContent = `${user.email} • Joined ${new Date(user.createdAt).toLocaleDateString()}`;

        userDetails.appendChild(h4);
        userDetails.appendChild(p);
        userInfo.appendChild(avatar);
        userInfo.appendChild(userDetails);

        // Create actions section
        const userActions = document.createElement('div');
        userActions.className = 'admin-user-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-secondary';
        editBtn.textContent = 'Edit Role';
        editBtn.addEventListener('click', () => this.editUserRole(user._id));

        const toggleBtn = document.createElement('button');
        toggleBtn.className = `btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`;
        toggleBtn.textContent = user.isActive ? 'Deactivate' : 'Activate';
        toggleBtn.addEventListener('click', () => this.toggleUserStatus(user._id, !user.isActive));

        userActions.appendChild(editBtn);
        userActions.appendChild(toggleBtn);

        userItem.appendChild(userInfo);
        userItem.appendChild(userActions);

        return userItem;
    }

    // Form Management
    initForms() {
        // Profile form
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateProfileDetails(new FormData(e.target));
        });

        // Password form
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.changePassword(new FormData(e.target));
        });

        // Location form
        document.getElementById('locationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateLocation(new FormData(e.target));
        });

        // Settings form
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateGeneralSettings(new FormData(e.target));
        });

        // Avatar upload
        document.getElementById('avatarUploadBtn').addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });

        document.getElementById('avatarInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.uploadAvatar(e.target.files[0]);
            }
        });

        // Get current location
        document.getElementById('getCurrentLocation').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // Remove location
        document.getElementById('removeLocation').addEventListener('click', () => {
            this.removeLocation();
        });

        // Mark all notifications as read
        document.getElementById('markAllRead').addEventListener('click', () => {
            this.markAllNotificationsRead();
        });

        // Logout all devices
        document.getElementById('logoutAllDevices').addEventListener('click', () => {
            this.logoutAllDevices();
        });
    }

    initQuickActions() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'change-password':
                this.showSection('security');
                break;
            case 'setup-2fa':
                this.setup2FA();
                break;
            case 'export-data':
                this.exportData();
                break;
            case 'update-location':
                this.showSection('profile');
                break;
        }
    }

    // Profile Operations
    async updateProfileDetails(formData) {
        try {
            this.showLoading(true);

            const updateData = {};
            for (let [key, value] of formData.entries()) {
                if (value.trim()) {
                    if (value.trim().length < 2) {
                        this.showToast('error', 'Error', `${key} must be at least 2 characters long`);
                        return;
                    }
                    updateData[key] = value;
                }
            }

            const response = await this.makeRequest('/profile', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.currentUser = response.data.user;
            this.updateUserDisplay();

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to update profile');
        } finally {
            this.showLoading(false);
        }
    }

    async uploadAvatar(file) {
        try {
            this.showPictureLoading(true);

            const formData = new FormData();
            formData.append('avatar', file);

            const response = await this.makeRequest('/profile/avatar', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type header for FormData
            });

            // Update profile pictures
            document.getElementById('profilePicture').src = response.data.avatar;
            document.getElementById('userAvatar').src = response.data.avatar;

            // Update current user data
            this.currentUser.avatar = response.data.avatar;

            // Update favicon with new profile picture
            this.updateUserDisplay();

        } catch (error) {
            console.error('Error in uploadAvatar:', error);
            this.showToast('error', 'Error', 'Failed to upload profile picture');
        } finally {
            this.showPictureLoading(false);
        }
    }

    async changePassword(formData) {
        try {
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            if (newPassword !== confirmPassword) {
                this.showToast('error', 'Error', 'Passwords do not match');
                return;
            }

            this.showLoading(true);

            await this.makeRequest('/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            document.getElementById('passwordForm').reset();
            this.showToast('success', 'Success', 'Password changed successfully');

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to change password');
        } finally {
            this.showLoading(false);
        }
    }

    async updateLocation(formData) {
        try {
            const latitude = parseFloat(formData.get('latitude'));
            const longitude = parseFloat(formData.get('longitude'));
            const address = formData.get('address');
            const landmark = formData.get('landmark');

            if (!latitude || !longitude || !address) {
                this.showToast('error', 'Error', 'Please provide latitude, longitude, and address');
                return;
            }

            this.showLoading(true);

            await this.makeRequest('/location', {
                method: 'PUT',
                body: JSON.stringify({
                    latitude,
                    longitude,
                    address,
                    landmark
                })
            });

            this.showToast('success', 'Success', 'Location updated successfully');

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to update location');
        } finally {
            this.showLoading(false);
        }
    }

    getCurrentLocation() {
        const btn = document.getElementById('getCurrentLocation');
        const icon = btn.querySelector('i');

        if (!navigator.geolocation) {
            this.showToast('error', 'Error', 'Geolocation is not supported by this browser');
            return;
        }

        // Update button state
        icon.className = 'fas fa-spinner fa-spin';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    // Update coordinate fields
                    document.getElementById('latitude').value = latitude;
                    document.getElementById('longitude').value = longitude;

                    // Get address using reverse geocoding
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`
                    );

                    if (response.ok) {
                        const data = await response.json();

                        if (data && data.display_name) {
                            // Update address field
                            document.getElementById('address').value = data.display_name;
                            this.showToast('success', 'Success', 'Current location and address retrieved');
                        } else {
                            // Coordinates retrieved but no address found
                            this.showToast('warning', 'Partial Success', 'Location coordinates retrieved, but address could not be determined');
                        }
                    } else {
                        // Coordinates retrieved but geocoding failed
                        this.showToast('warning', 'Partial Success', 'Location coordinates retrieved, but address lookup failed');
                    }

                } catch (error) {
                    this.showToast('warning', 'Partial Success', 'Location coordinates retrieved, but address lookup failed');
                } finally {
                    // Reset button state
                    icon.className = 'fas fa-location-arrow';
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';
                }
            },
            (error) => {
                // Reset button state
                icon.className = 'fas fa-location-arrow';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';

                let errorMessage = 'Unable to retrieve location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }

                this.showToast('error', 'Error', errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    async removeLocation() {
        try {
            await this.makeRequest('/location', { method: 'DELETE' });
            document.getElementById('locationForm').reset();
            this.showToast('success', 'Success', 'Location removed successfully');
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to remove location');
        }
    }

    // Security Operations
    async setup2FA() {
        try {
            const response = await this.makeRequest('/2fa/setup', { method: 'POST' });
            this.show2FASetupModal(response.data);
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to setup 2FA');
        }
    }

    show2FASetupModal(setupData) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
        <div class="two-factor-setup">
            <div class="text-center mb-4">
                <h3>Setup Two-Factor Authentication</h3>
                <p>Scan this QR code with your authenticator app:</p>
                <div class="qr-code-container text-center mb-3">
                    <img src="${setupData.qrCodeUrl}" alt="QR Code" class="qr-code">
                </div>
                <p class="p-of-secret-key"><strong>Secret Key:Click to copy key</strong> <code id="secretKey" class="secret-key-copy" title="Click to copy">${setupData.secret}</code></p>
            </div>
            
            <div class="verification-section mb-3">
                <label for="verificationCode" class="form-label">Enter verification code:</label>
                <input type="text" id="twoFAToken" class="form-control" maxlength="6" placeholder="xxxxxx" required>
            </div>
            
            <div class="modal-buttons d-flex justify-content-end gap-2 mb-4">
                <button type="button" id="cancel2FA" class="btn btn-secondary">Cancel</button>
                <button type="button" id="verify2FA" class="btn btn-primary">Verify & Enable</button>
            </div>
            
            <div class="backup-codes-section">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h4 class="mb-0">Backup Codes</h4>
                    <div class="backup-actions">
                        <button type="button" id="copyAllCodes" class="btn btn-sm btn-outline-primary me-2" title="Copy all codes">
                            <i class="fas fa-copy"></i> Copy All
                        </button>
                        <button type="button" id="downloadCodes" class="btn btn-sm btn-outline-secondary" title="Download codes as file">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
                <p>Save these backup codes in a safe place:</p>
                <div class="backup-codes row">
                    ${setupData.backupCodes.map((code, index) => `
                        <div class="col-6 mb-2">
                            <code class="backup-code" data-code="${code}" title="Click to copy">${code}</code>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

        // Add event listeners after DOM is updated
        const cancelBtn = document.getElementById('cancel2FA');
        const verifyBtn = document.getElementById('verify2FA');
        const verificationInput = document.getElementById('twoFAToken');
        const secretKey = document.getElementById('secretKey');
        const copyAllBtn = document.getElementById('copyAllCodes');
        const downloadBtn = document.getElementById('downloadCodes');
        const backupCodeElements = document.querySelectorAll('.backup-code');

        // Secret key copy handler
        secretKey.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(setupData.secret);

                // Visual feedback
                const originalText = secretKey.textContent;
                secretKey.textContent = 'Copied!';
                secretKey.style.backgroundColor = '#d4edda';
                secretKey.style.color = '#155724';

                setTimeout(() => {
                    secretKey.textContent = originalText;
                    secretKey.style.backgroundColor = '';
                    secretKey.style.color = '';
                }, 2000);

            } catch (err) {
                // Fallback for older browsers
                this.fallbackCopyToClipboard(setupData.secret);

                // Visual feedback for fallback
                const originalText = secretKey.textContent;
                secretKey.textContent = 'Copied!';
                setTimeout(() => {
                    secretKey.textContent = originalText;
                }, 2000);
            }
        });

        // Individual backup code copy handlers
        backupCodeElements.forEach(codeElement => {
            codeElement.style.cursor = 'pointer';
            codeElement.addEventListener('click', () => {
                const code = codeElement.getAttribute('data-code');
                this.copyToClipboard(code);

                // Visual feedback
                const originalText = codeElement.textContent;
                const originalBg = codeElement.style.backgroundColor;
                const originalColor = codeElement.style.color;

                codeElement.textContent = 'Copied!';
                codeElement.style.backgroundColor = '#d4edda';
                codeElement.style.color = '#155724';

                setTimeout(() => {
                    codeElement.textContent = originalText;
                    codeElement.style.backgroundColor = originalBg;
                    codeElement.style.color = originalColor;
                }, 1500);
            });
        });

        // Copy all backup codes handler
        copyAllBtn.addEventListener('click', () => {
            const codesText = setupData.backupCodes.join('\n');
            this.copyAllBackupCodes(codesText);
        });

        // Download backup codes handler
        downloadBtn.addEventListener('click', () => {
            const codesString = setupData.backupCodes.join(',');
            this.downloadBackupCodes(codesString);
        });

        // Add cursor pointer style
        secretKey.style.cursor = 'pointer';

        // Cancel button handler
        cancelBtn.addEventListener('click', () => {
            this.hideModal();
        });

        // Verify button handler
        verifyBtn.addEventListener('click', () => {
            const code = verificationInput.value.trim();
            if (!code) {
                this.showToast('error', 'Invalid Code', 'Please enter a verification code');
                return;
            } else if (code.length === 6) {
                this.verify2FASetup(code);
            } else {
                this.showToast('error', 'Invalid Code', 'Please enter a 6-digit verification code');
            }
        });

        // Allow Enter key to submit
        verificationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyBtn.click();
            }
        });

        // Auto-focus the input
        setTimeout(() => {
            verificationInput.focus();
        }, 100);

        this.showModal('Setup 2FA');
    }


    async verify2FASetup() {
        try {
            const token = document.getElementById('twoFAToken').value;
            if (!token || token.length !== 6) {
                this.showToast('error', 'Invalid Token', 'Please enter a valid 6-digit token');
                return;
            }
            await this.makeRequest('/2fa/verify-setup', {
                method: 'POST',
                body: JSON.stringify({ token })
            });

            this.hideModal();
            await this.load2FAStatus();
            this.showToast('success', 'Success', '2FA enabled successfully');

        } catch (error) {
            console.error('Error verifying 2FA setup:', error);
            this.showToast('error', 'Error', 'Failed to verify 2FA setup');
        }
    }

    async disable2FA() {
        const password = await this.getPasswordFor2FA();
        if (!password) return;

        try {
            await this.makeRequest('/2fa/disable', {
                method: 'DELETE',
                body: JSON.stringify({ password })
            });

            await this.load2FAStatus();
            this.showToast('success', 'Success', '2FA disabled successfully');

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to disable 2FA');
        }
    }

    async unlinkSocial(provider) {
        if (!await this.showConfirm(`Are you sure you want to unlink your ${provider} account?`)) {
            return;
        }

        try {
            await this.makeRequest(`/social-accounts/${provider}`, { method: 'DELETE' });
            await this.loadSocialAccounts();
            this.showToast('success', 'Success', `${provider} account unlinked`);
        } catch (error) {
            this.showToast('error', 'Error', `Failed to unlink ${provider} account`);
        }
    }

    // Settings Operations
    async updateGeneralSettings(formData) {
        try {
            this.showLoading(true);

            const updateData = {};
            for (let [key, value] of formData.entries()) {
                updateData[key] = value;
            }

            // If theme is being updated, apply it immediately
            if (updateData.theme) {
                await this.applyTheme(updateData.theme);
            }

            const response = await this.makeRequest('/settings', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            return response;

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to update settings');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }


    // Notification Operations
    async markAllNotificationsRead() {
        try {
            await this.makeRequest('/notifications/read-all', { method: 'PUT' });
            await this.loadNotifications();
            this.showToast('success', 'Success', 'All notifications marked as read');
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to mark notifications as read');
        }
    }

    // Device & Session Operations
    async removeDevice(deviceId) {
        if (!await this.showConfirm('Are you sure you want to remove this device?')) {
            return;
        }

        try {
            await this.makeRequest(`/devices/${deviceId}`, { method: 'DELETE' });
            await this.loadDevices();
            this.showToast('success', 'Success', 'Device removed successfully');
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to remove device');
        }
    }

    async revokeSession(sessionId) {
        if (!await this.showConfirm('Are you sure you want to revoke this session? You will be logged out from that device.')) {
            return;
        }

        try {
            // Show loading state
            const button = document.querySelector(`[data-session-id="${sessionId}"].session-revoke-btn`);
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Revoking...';
            }

            await this.makeRequest(`/sessions/${sessionId}`, {
                method: 'DELETE'
            });

            // Remove the session from DOM
            const sessionItem = document.querySelector(`[data-session-id="${sessionId}"].session-item`);
            if (sessionItem) {
                sessionItem.remove();
            }

            // Check if no sessions left
            const remainingSessions = document.querySelectorAll('.session-item').length;
            if (remainingSessions === 0) {
                document.getElementById('sessionsList').innerHTML = '<p class="text-center">No active sessions</p>';
            }

            this.showToast('success', 'Success', 'Session revoked successfully');

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to revoke session');

            // Reset button state on error
            const button = document.querySelector(`[data-session-id="${sessionId}"].session-revoke-btn`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-times"></i> Revoke';
            }
        }
    }

    async logoutAllDevices() {
        if (!await this.showConfirm('Are you sure you want to logout from all devices? You will need to login again.')) {
            return;
        }

        try {
            await this.makeRequest('/logout-all', { method: 'POST' });
            this.showToast('success', 'Success', 'Logged out from all devices');
            // Redirect to login after a delay
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to logout from all devices');
        }
    }

    // Admin Operations
    async editUserRole(userId) {
        const newRole = await this.getNewRole();

        if (!newRole) {
            return;
        }
        if (!['user', 'moderator', 'admin', 'superadmin'].includes(newRole)) {
            this.showToast('error', 'Error', 'Invalid role');
            return;
        }

        try {
            await this.makeRequest(`/admin/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });

            await this.loadAdminData();

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to update user role');
        }
    }

    async toggleUserStatus(userId, activate) {
        const action = activate ? 'activate' : 'deactivate';
        const reason = await this.getReason(action);
        try {
            await this.makeRequest(`/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: activate ? 'active' : 'inactive',
                    reason
                })
            });

            await this.loadAdminData();

        } catch (error) {
            this.showToast('error', 'Error', `Failed to ${action} user`);
        }
    }

    // Data Export
    async exportData() {
        try {
            const response = await fetch(`${this.apiBase}/export`);
            this.showLoading(true);
            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showToast('success', 'Success', 'Data export started');

        } catch (error) {
            this.showToast('error', 'Error', 'Failed to start data export');
        } finally {
            this.showLoading(false);
        }

    }

    // Authentication
    async logout() {
        try {
            await this.makeRequest('/logout', { method: 'POST' });
        } catch (error) {
            this.showToast('error', 'Error', 'Failed to logout');
        }

        localStorage.removeItem('token');
        this.showToast('success', 'Success', 'Logged out successfully');

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }

    // Modal Management
    initModals() {
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.hideModal();
            }
        });
    }

    showModal(title, content = '') {
        document.getElementById('modalTitle').textContent = title;
        if (content) {
            document.getElementById('modalBody').innerHTML = content;
        }
        document.getElementById('modal').classList.add('show');
    }

    hideModal() {
        document.getElementById('modal').classList.remove('show');
    }

    // Modal management functions (if not already present)
    showModaldeletion(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    hideModaldeletion(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');

            // Reset form if it's the deletion modal
            if (modalId === 'accountDeletionModal') {
                const form = document.getElementById('accountDeletionForm');
                if (form) {
                    form.reset();
                    document.getElementById('confirmDeletionBtn').disabled = true;
                }
            }
        }
    }
    // Toast Notifications
    showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${iconMap[type]} ${type}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        const container = document.getElementById('toastContainer');
        container.appendChild(toast);

        // Auto remove after 5 seconds
        const autoRemove = setTimeout(() => {
            this.removeToast(toast);
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });
    }

    removeToast(toast) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Loading Management
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    showPictureLoading(show) {
        const overlay = document.getElementById('loaderpic');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    async showConfirm(message) {
        return new Promise((resolve) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0,0,0,0.4)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '9999';

            // Create modal
            const modal = document.createElement('div');
            modal.style.background = 'var(--bg-secondary)';
            modal.style.padding = '20px';
            modal.style.borderRadius = '8px';
            modal.style.maxWidth = '320px';
            modal.style.width = '100%';
            modal.style.textAlign = 'center';
            modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            modal.style.fontFamily = 'sans-serif';

            // Message
            const msg = document.createElement('p');
            msg.textContent = message;
            msg.style.marginBottom = '15px';
            msg.style.color = 'var(--text-primary)'
            msg.style.fontSize = '14px';
            msg.style.lineHeight = '1.4';

            // Buttons container
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.justifyContent = 'center';
            btnContainer.style.gap = '10px';

            const yesBtn = document.createElement('button');
            yesBtn.textContent = 'Yes';
            yesBtn.style.padding = '6px 14px';
            yesBtn.style.background = '#4CAF50';
            yesBtn.style.color = '#fff';
            yesBtn.style.border = 'none';
            yesBtn.style.borderRadius = '4px';
            yesBtn.style.cursor = 'pointer';

            const noBtn = document.createElement('button');
            noBtn.textContent = 'No';
            noBtn.style.padding = '6px 14px';
            noBtn.style.background = '#f44336';
            noBtn.style.color = '#fff';
            noBtn.style.border = 'none';
            noBtn.style.borderRadius = '4px';
            noBtn.style.cursor = 'pointer';

            // Close helper
            const close = (value) => {
                document.removeEventListener('keydown', keyHandler);
                overlay.removeEventListener('click', overlayClick);
                overlay.remove();
                resolve(value);
            };

            // Event: Click outside
            const overlayClick = (e) => {
                if (e.target === overlay) close(false);
            };

            // Event: Escape key
            const keyHandler = (e) => {
                if (e.key === 'Escape') close(false);
            };

            // Button actions
            yesBtn.onclick = () => close(true);
            noBtn.onclick = () => close(false);

            // Attach listeners
            overlay.addEventListener('click', overlayClick);
            document.addEventListener('keydown', keyHandler);

            // Build modal
            btnContainer.appendChild(yesBtn);
            btnContainer.appendChild(noBtn);
            modal.appendChild(msg);
            modal.appendChild(btnContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        });
    }

}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Add toast slide out animation
const style = document.createElement('style');
style.textContent = `
@keyframes toastSlideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}
`;
document.head.appendChild(style);