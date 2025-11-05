class Authn {
    constructor() {
        this.currentStep = 'login-form';
        this.tempSessionId = null;
        this.rememberMe = false;
        this.userEmail = null;
        this.tempUserData = null;
        this.debounceTimers = {};
        this.isOnline = navigator.onLine;
        this.offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        this.retryQueue = [];

        // Configuration
        this.config = {
            apiBaseUrl: '/api/auth',
            debounceDelay: 500,
            maxRetries: 3,
            retryDelay: 1000,
            tokenKey: 'authToken',
            userKey: 'userData',
            themeKey: 'theme',
            offlineQueueKey: 'offlineQueue',
            offlineDataKey: 'offlineData'
        };

        // Initialize the application
        this.init();
    }

    async init() {
        try {
            this.initializeTheme();
            this.bindEvents();
            this.setupFormValidation();
            this.setupNetworkMonitoring();
            this.checkAuthStatus();
            this.processOfflineQueue();

            // Auto-focus first input
            this.focusFirstInput();
        } catch (error) {
            console.error('Failed to initialize auth system:', error);
            this.showToast('Failed to initialize. Please refresh the page.', 'error');
        }
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.hideOfflineMessage();
            this.processOfflineQueue();
            this.showToast('Connection restored! Processing pending requests...', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineMessage();
            this.showToast('Connection lost. Data will be saved locally.', 'warning');
        });
    }

    showOfflineMessage() {
        let offlineOverlay = document.getElementById('offlineOverlay');
        if (!offlineOverlay) {
            offlineOverlay = document.createElement('div');
            offlineOverlay.id = 'offlineOverlay';
            offlineOverlay.className = 'offline-overlay';
            offlineOverlay.innerHTML = `
                <div class="offline-content">
                    <i class="bx bx-wifi-off"></i>
                    <h3>No Internet Connection</h3>
                    <p>Your data will be saved locally and synced when connection is restored.</p>
                    <div class="offline-status">
                        <div class="pulse-dot"></div>
                        <span>Waiting for connection...</span>
                    </div>
                </div>
            `;
            document.body.appendChild(offlineOverlay);
        }
        offlineOverlay.style.display = 'flex';
    }

    hideOfflineMessage() {
        const offlineOverlay = document.getElementById('offlineOverlay');
        if (offlineOverlay) {
            offlineOverlay.style.display = 'none';
        }
    }

    showTopLoader() {
        let loader = document.getElementById('topLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'topLoader';
            loader.className = 'top-loader';
            loader.innerHTML = '<div class="top-loader-bar"></div>';
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
        loader.querySelector('.top-loader-bar').style.width = '0%';

        // Animate the loading bar
        setTimeout(() => {
            loader.querySelector('.top-loader-bar').style.width = '70%';
        }, 100);
    }

    hideTopLoader() {
        const loader = document.getElementById('topLoader');
        if (loader) {
            loader.querySelector('.top-loader-bar').style.width = '100%';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 200);
        }
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    async checkAuthStatus() {
        if (!this.authToken) {
            this.hideLoadingOverlay();
            return;
        }

        try {
            this.showLoadingOverlay();
            const response = await this.apiCall('/me', 'GET', null, true);
            if (response.success) {
                this.currentUser = response.data.user;
                this.showToast('Welcome back!', 'success');
                this.redirectToDashboard();
            }
        } catch (error) {
            this.showToast('Session expired. Please log in again.', 'warning');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    /**
     * Enhanced Toast Notifications
     */
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = this.getOrCreateToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-enter`;

        const iconMap = {
            success: 'bx-check-circle',
            error: 'bx-error-circle',
            warning: 'bx-error',
            info: 'bx-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <i class="bx ${iconMap[type]} toast-icon"></i>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="bx bx-x"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('toast-show'), 10);

        // Auto remove
        const autoRemove = setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });

        // Remove on click (except close button)
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.toast-close')) {
                clearTimeout(autoRemove);
                this.removeToast(toast);
            }
        });

        return toast;
    }

    /**
     * Get or create toast container
     */
    getOrCreateToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Remove toast with animation
     */
    removeToast(toast) {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem(this.config.themeKey) || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        this.bindNavigationEvents();
        this.bindFormEvents();
        this.bindSpecialInputs();

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showToast('An unexpected error occurred. Please try again.', 'error');
        });
    }

    /**
     * Bind navigation events
     */
    bindNavigationEvents() {
        const navigationEvents = {
            'show-register': () => this.showStep('register-form'),
            'back-to-login': () => this.showStep('login-form'),
            'show-forgot-password': () => this.showStep('forgot-password-form'),
            'back-to-login-from-2fa': () => this.showStep('login-form'),
            'back-to-login-from-verification': () => this.showStep('login-form'),
            'back-to-login-from-forgot': () => this.showStep('login-form'),
            'show-backup-code': () => this.showStep('backup-code-form'),
            'back-to-2fa': () => this.showStep('two-factor-form'),
            'skip-2fa-setup': () => this.redirectToDashboard()
        };

        Object.entries(navigationEvents).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        });
    }

    bindFormEvents() {
        const formEvents = {
            'loginForm': (e) => this.handleLogin(e),
            'registerForm': (e) => this.handleRegister(e),
            'twoFactorForm': (e) => this.handleTwoFactor(e),
            'backupCodeForm': (e) => this.handleBackupCode(e),
            'emailVerificationForm': (e) => this.handleEmailVerification(e),
            'forgotPasswordForm': (e) => this.handleForgotPassword(e),
            'twoFactorSetupForm': (e) => this.handleTwoFactorSetup(e)
        };

        Object.entries(formEvents).forEach(([formId, handler]) => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', handler);
            }
        });

        const resendVerification = document.getElementById('resend-verification');
        if (resendVerification) {
            resendVerification.addEventListener('click', (e) => this.handleResendVerification(e));
        }
    }

    bindSpecialInputs() {
        ['login-password-toggle', 'password-toggle'].forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('click', () => this.togglePasswordVisibility(id));
            }
        });

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('input', () => this.checkUsernameAvailability());
            usernameInput.addEventListener('blur', () => this.checkUsernameAvailability());
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', () => this.checkEmailAvailability());
        }

        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.checkPasswordStrength());
        }

        const twoFactorInputs = document.querySelectorAll('.two-factor-input');
        twoFactorInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => this.handle2FAInput(e, index));
            input.addEventListener('keydown', (e) => this.handle2FAKeyDown(e, index));
            input.addEventListener('paste', (e) => this.handle2FAPaste(e));
        });

        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', () => this.formatPhoneNumber());
        }
    }

    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
            });
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(this.config.themeKey, newTheme);

        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
        }
    }

    showStep(stepId) {
        const allSteps = document.querySelectorAll('.auth-step');
        allSteps.forEach(step => step.classList.add('hidden'));

        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.classList.remove('hidden');
            this.currentStep = stepId;
            setTimeout(() => this.focusFirstInput(), 100);
        }
    }

    focusFirstInput() {
        const currentStepElement = document.getElementById(this.currentStep);
        if (currentStepElement) {
            const firstInput = currentStepElement.querySelector('input:not([readonly]):not([type="checkbox"])');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const loginData = Object.fromEntries(formData);
        loginData.rememberMe = formData.has('rememberMe');

        // Basic validation
        if (!loginData.identifier || !loginData.password) {
            this.showToast('Please enter both email/username and password', 'error');
            return;
        }

        if (!this.isOnline) {
            this.saveOfflineData('login', loginData);
            this.showToast('No internet connection. Data saved locally and will be processed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            const response = await this.apiCall('/login', 'POST', loginData);

            if (response.success) {
                if (response.data.requires2FA) {
                    // Store the tempSessionId for 2FA verification
                    this.tempSessionId = response.data.tempSessionId;

                    this.showStep('two-factor-form');
                    this.showToast('Please enter your 2FA code', 'info');
                } else {
                    // Regular login success
                    this.authToken = response.data.token;

                    if (response.data.requiresEmailVerification) {
                        this.userEmail = loginData.identifier;
                        this.showStep('email-verification-form');
                        this.showToast('Please verify your email address', 'info');
                    } else {
                        this.showToast('Login successful! Redirecting...', 'success');
                        setTimeout(() => this.redirectToDashboard(), 1500);
                    }
                }
            }
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(e.target, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        if (!this.validateForm(e.target)) {
            return;
        }

        const formData = new FormData(e.target);
        const registerData = Object.fromEntries(formData);

        const cleanedData = {
            firstName: registerData.firstName?.trim() || null,
            lastName: registerData.lastName?.trim() || null,
            username: registerData.username?.trim().toLowerCase(),
            email: registerData.email?.trim().toLowerCase(),
            
            password: registerData.password,
            
        };

        // Remove null/empty values except for required fields
        Object.keys(cleanedData).forEach(key => {
            if (cleanedData[key] === null || cleanedData[key] === '') {
                if (!['username', 'email', 'password', 'userType'].includes(key)) {
                    delete cleanedData[key];
                }
            }
        });

        if (!this.isOnline) {
            this.saveOfflineData('register', cleanedData);
            this.showToast('No internet connection. Registration data saved locally and will be processed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            // Clear any existing field errors before making the request
            this.clearAllFieldErrors();

            const response = await this.apiCall('/register', 'POST', cleanedData);

            if (response.success) {
                this.userEmail = cleanedData.email;
                this.tempUserData = response.data.user;
                this.showToast(response.message || 'Account created! Please check your email for verification code.', 'success');
                this.showStep('email-verification-form');
            } else {
                // This shouldn't happen if apiCall throws on !success, but just in case
                this.handleRegistrationError(response);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.handleRegistrationError(error);
        } finally {
            this.setLoading(e.target, false);
        }
    }

    /**
     * Save data for offline processing
     */
    saveOfflineData(action, data) {
        const offlineItem = {
            id: Date.now().toString(),
            action,
            data,
            timestamp: new Date().toISOString()
        };

        this.offlineQueue.push(offlineItem);
        localStorage.setItem(this.config.offlineQueueKey, JSON.stringify(this.offlineQueue));
    }

    /**
     * Process offline queue when online
     */
    async processOfflineQueue() {
        if (!this.isOnline || this.offlineQueue.length === 0) {
            return;
        }

        this.showToast(`Processing ${this.offlineQueue.length} pending request(s)...`, 'info');

        const processedItems = [];

        for (const item of this.offlineQueue) {
            try {
                let response;
                switch (item.action) {
                    case 'login':
                        response = await this.apiCall('/login', 'POST', item.data);
                        if (response.success) {
                            this.authToken = response.data.token;
                            this.showToast('Login completed successfully!', 'success');
                        }
                        break;
                    case 'register':
                        response = await this.apiCall('/register', 'POST', item.data);
                        if (response.success) {
                            this.userEmail = item.data.email;
                            this.tempUserData = response.data.user;
                            this.showToast('Registration completed! Please verify your email.', 'success');
                            this.showStep('email-verification-form');
                        }
                        break;
                }
                processedItems.push(item);
            } catch (error) {
                console.error('Failed to process offline item:', error);
                this.showToast(`Failed to process ${item.action}: ${this.getErrorMessage(error)}`, 'error');
            }
        }

        // Remove processed items
        this.offlineQueue = this.offlineQueue.filter(item => !processedItems.includes(item));
        localStorage.setItem(this.config.offlineQueueKey, JSON.stringify(this.offlineQueue));

        if (processedItems.length > 0) {
            this.showToast(`Successfully processed ${processedItems.length} request(s)!`, 'success');
        }
    }

    /**
     * Enhanced error handling with user-friendly messages
     */
    getErrorMessage(error) {
        const errorMessages = {
            400: 'Invalid information provided. Please check your input.',
            401: 'Invalid credentials. Please check your email/username and password.',
            403: 'Account access denied. Please contact support if this continues.',
            404: 'Service not found. Please try again later.',
            409: 'This information is already registered. Please use different details.',
            422: 'The information provided is not valid. Please check and try again.',
            429: 'Too many attempts. Please wait a few minutes before trying again.',
            500: 'Server is temporarily unavailable. Please try again later.',
            502: 'Service temporarily unavailable. Please try again in a few moments.',
            503: 'Service is under maintenance. Please try again later.',
            504: 'Request timed out. Please check your connection and try again.'
        };

        // Check if it's a network error
        if (!navigator.onLine) {
            return 'No internet connection. Please check your network.';
        }

        // Check for specific error messages from server
        if (error.message && !error.message.startsWith('HTTP')) {
            return error.message;
        }

        // Return user-friendly message based on status code
        return errorMessages[error.status] || 'An unexpected error occurred. Please try again.';
    }

    handleAuthError(error) {
        console.error('Auth error:', error);

        // Handle different error types - check both error structures
        const status = error.status || error.response?.status;
        const data = error.response || error;
        const message = error.message || data?.message;

        if (status) {
            switch (status) {
                case 400:
                    if (message) {
                        this.showToast(message, 'error');
                    } else {
                        this.showToast('Please check your input and try again', 'error');
                    }
                    break;
                case 401:
                    if (message && message.includes('2FA')) {
                        this.showToast('Invalid 2FA code. Please try again.', 'error');
                    } else if (message && message.includes('credential')) {
                        this.showToast('Invalid email/username or password', 'error');
                    } else if (message && message.includes('session')) {
                        this.showToast('Session expired. Please login again.', 'error');
                        this.showStep('login-form');
                        this.tempSessionId = null;
                    } else if (message && message.includes('expired')) {
                        this.showToast('Verification session expired. Please login again.', 'error');
                        this.showStep('login-form');
                        this.tempSessionId = null;
                    } else {
                        this.showToast(message || 'Invalid credentials', 'error');
                    }
                    break;
                case 403:
                    this.showToast(message || 'Account has been deactivated. Please contact support.', 'error');
                    break;
                case 423:
                    this.showToast(message || 'Account is temporarily locked', 'error');
                    break;
                case 429:
                    this.showToast(message || 'Too many attempts. Please try again later.', 'error');
                    break;
                case 500:
                    this.showToast('Server error. Please try again later.', 'error');
                    break;
                default:
                    this.showToast(message || 'An error occurred. Please try again.', 'error');
            }
        } else if (message) {
            this.showToast(message, 'error');
        } else {
            this.showToast('Network error. Please check your connection.', 'error');
        }
    }

    handleRegistrationError(error) {
        console.log('Handling registration error:', error);

        // Extract the main error message
        let message = 'An error occurred during registration. Please try again.';

        if (error.message) {
            message = error.message;
        } else if (error.error && error.error.message) {
            message = error.error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        // Show the main error message as toast
        this.showToast(message, 'error');

        // Handle field-specific errors
        let fieldErrors = {};

        // Extract field errors from different possible structures
        if (error.error && error.error.details) {
            // Backend sends structured field errors
            fieldErrors = error.error.details;
        } else if (error.details) {
            // Alternative structure
            fieldErrors = error.details;
        } else if (error.field && error.message) {
            // Single field error
            fieldErrors[error.field] = error.message;
        } else if (error.validationErrors) {
            // Validation errors
            fieldErrors = error.validationErrors;
        }

        // Display field-specific errors
        Object.keys(fieldErrors).forEach(fieldName => {
            const errorMessage = fieldErrors[fieldName];
            if (errorMessage && errorMessage !== null) {
                const input = document.getElementById(fieldName) ||
                    document.querySelector(`[name="${fieldName}"]`) ||
                    document.querySelector(`input[name="${fieldName}"]`) ||
                    document.querySelector(`select[name="${fieldName}"]`);

                if (input) {
                    this.setFieldError(input, errorMessage);
                } else {
                    console.warn(`Field not found for error: ${fieldName}`, errorMessage);
                }
            }
        });
    }

    // Helper method to extract field name from error message
    extractFieldFromError(errorMessage) {
        const fieldPatterns = {
            'email': /email/i,
            'username': /username/i,
            'password': /password/i,
            'firstName': /first.*name/i,
            'lastName': /last.*name/i,
            'phone': /phone/i,
            'dateOfBirth': /date.*birth|age/i
        };

        for (const [field, pattern] of Object.entries(fieldPatterns)) {
            if (pattern.test(errorMessage)) {
                return field;
            }
        }
        return null;
    }

    // Clear all field errors
    clearAllFieldErrors() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            this.clearFieldError(input);
        });
    }

    // Set field error using existing <span class="form-error">
    setFieldError(input, message) {
        // Clear any existing error
        this.clearFieldError(input);

        // Add error styling to input
        input.classList.add('error', 'is-invalid');

        // Find the span.form-error for this input
        let errorElement = input.closest('.form-group')?.querySelector('.form-error');
        if (!errorElement) return; // No error span found → do nothing

        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = '#c33'; // Optional styling
    }

    // Clear field error
    clearFieldError(input) {
        input.classList.remove('error', 'is-invalid');

        const errorElement = input.closest('.form-group')?.querySelector('.form-error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }


    /**
     * Handle validation errors
     */
    handleValidationErrors(errors) {
        errors.forEach(error => {
            const field = this.extractFieldFromError(error);
            if (field) {
                const input = document.getElementById(field) ||
                    document.querySelector(`[name="${field}"]`);
                if (input) {
                    this.setFieldError(input, error);
                }
            }
        });
    }

async apiCall(endpoint, method = 'GET', data = null, requiresAuth = false, retryCount = 0) {
        if (!this.isOnline) {
            const error = new Error('No internet connection');
            error.type = 'NETWORK_ERROR';
            throw error;
        }

        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            credentials: 'include'
        };

        if (requiresAuth && this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(data);
        }

        this.showTopLoader();

        try {
            const response = await fetch(url, options);
            let responseData = null;

            const contentType = response.headers.get('content-type');
            try {
                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    const text = await response.text();
                    try {
                        responseData = JSON.parse(text);
                    } catch {
                        responseData = { 
                            success: false,
                            error: text || 'Server returned invalid response format' 
                        };
                    }
                }
            } catch (parseError) {
                responseData = {
                    success: false,
                    error: 'Invalid server response',
                    message: 'Server returned malformed data',
                    status: response.status,
                    statusText: response.statusText
                };
            }

            if (!response.ok) {
                const error = new Error();
                
                // Enhanced error message extraction from your backend structure
                error.message = responseData?.error ||
                    responseData?.message ||
                    responseData?.data?.message ||
                    `HTTP ${response.status}: ${response.statusText}`;

                // Add comprehensive error properties
                error.status = response.status;
                error.statusText = response.statusText;
                error.response = responseData;
                error.details = responseData?.data?.details || responseData?.details || [];
                error.field = responseData?.data?.field || responseData?.field;
                error.code = responseData?.code || responseData?.data?.code;
                error.timestamp = responseData?.timestamp;

                // Enhanced error type classification
                switch (response.status) {
                    case 400:
                        error.type = 'VALIDATION_ERROR';
                        break;
                    case 401:
                        error.type = 'UNAUTHORIZED';
                        this.authToken = null;
                        break;
                    case 403:
                        error.type = 'FORBIDDEN';
                        break;
                    case 404:
                        error.type = 'NOT_FOUND';
                        break;
                    case 409:
                        error.type = 'CONFLICT';
                        break;
                    case 422:
                        error.type = 'UNPROCESSABLE_ENTITY';
                        break;
                    case 423:
                        error.type = 'LOCKED';
                        break;
                    case 429:
                        error.type = 'RATE_LIMITED';
                        break;
                    case 500:
                        error.type = 'SERVER_ERROR';
                        break;
                    default:
                        error.type = 'HTTP_ERROR';
                }

                console.error('API Error:', {
                    endpoint,
                    method,
                    status: error.status,
                    message: error.message,
                    details: error.details,
                    response: responseData
                });

                throw error;
            }

            return responseData;

        } catch (error) {
            if (error.name === 'TypeError' || error.name === 'NetworkError' || !error.status) {
                if (retryCount < this.config.maxRetries) {
                    console.warn(`Network error, retrying... (${retryCount + 1}/${this.config.maxRetries})`);
                    await this.delay(this.config.retryDelay * (retryCount + 1));
                    return this.apiCall(endpoint, method, data, requiresAuth, retryCount + 1);
                } else {
                    error.message = 'Network error. Please check your connection and try again.';
                    error.type = 'NETWORK_ERROR';
                    error.retryCount = retryCount;
                }
            }

            console.error('API Call Failed:', {
                endpoint,
                method,
                error: error.message,
                type: error.type,
                status: error.status,
                retryCount
            });

            throw error;
        } finally {
            this.hideTopLoader();
        }
    }

    // Show error in existing .form-error span
    showErrorMessage(message, details = []) {
        this.clearErrorMessages();

        const errorElement = document.querySelector('.form-error');
        if (!errorElement) return;

        let finalMessage = message;
        if (details && details.length > 0) {
            finalMessage += '\n' + details.map(d => `• ${d}`).join('\n');
        }

        errorElement.textContent = finalMessage;

        setTimeout(() => {
            this.clearErrorMessages();
        }, 10000);
    }

    clearErrorMessages() {
        document.querySelectorAll('.form-error').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }


    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set loading state for form
     */
    setLoading(form, isLoading) {
        const submitButton = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, select, button');

        if (isLoading) {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.setAttribute('data-original-text', submitButton.textContent);
                submitButton.innerHTML = '<i class="bx bx-loader-alt rotating"></i> Processing...';
            }
            inputs.forEach(input => input.disabled = true);
        } else {
            if (submitButton) {
                submitButton.disabled = false;
                const originalText = submitButton.getAttribute('data-original-text');
                if (originalText) {
                    submitButton.textContent = originalText;
                    submitButton.removeAttribute('data-original-text');
                }
            }
            inputs.forEach(input => input.disabled = false);
        }
    }

    isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
    isValidPassword(password) { return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[@$!%*?&#+\-=_~`|\\(){}\[\]:";'<>,.\/]/.test(password); }
    isValidUsername(username) { return /^[a-zA-Z0-9_]{3,30}$/.test(username); }
    isValidPhone(phone) { return /^[\+]?[1-9][\d]{9,15}$/.test(phone.replace(/\D/g, '')); }
    isValidName(name) { return /^[a-zA-Z\s'-]{1,50}$/.test(name); }

    redirectToDashboard() {
        const dashboardUrl = '/dashboard';
        window.location.href = dashboardUrl;
    }

    async handleTwoFactor(e) {
        e.preventDefault();

        const token = this.get2FACode();

        // Validation
        if (!token || token.length !== 6) {
            this.showToast('Please enter a valid 6-digit code', 'error');
            return;
        }

        if (!this.tempSessionId) {
            this.showToast('Session expired. Please login again.', 'error');
            this.showStep('login-form');
            return;
        }

        if (!this.isOnline) {
            this.saveOfflineData('2fa_verify', {
                tempSessionId: this.tempSessionId,
                twoFactorCode: token
            });
            this.showToast('No internet connection. Verification will be processed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            const response = await this.apiCall('/verify-2fa', 'POST', {
                tempSessionId: this.tempSessionId,
                twoFactorCode: token
            });

            if (response.success) {
                // Save auth data after successful 2FA verification
                this.authToken = response.data.token;

                // Clear temporary data
                this.tempSessionId = null;

                if (response.data.requiresEmailVerification) {
                    this.showStep('email-verification-form');
                    this.showToast('Please verify your email address', 'info');
                } else {
                    this.showToast('2FA verified! Redirecting...', 'success');
                    setTimeout(() => this.redirectToDashboard(), 1500);
                }
            }
        } catch (error) {
            this.handleAuthError(error);
            this.clear2FAInputs();
        } finally {
            this.setLoading(e.target, false);
        }
    }

    async handleBackupCode(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const backupCode = formData.get('backupCode');

        // Validation
        if (!backupCode || backupCode.length !== 8) {
            this.showToast('Please enter a valid 8-character backup code', 'error');
            return;
        }

        if (!this.tempSessionId) {
            this.showToast('Session expired. Please login again.', 'error');
            this.showStep('login-form');
            return;
        }

        if (!this.isOnline) {
            this.saveOfflineData('backup_code_verify', {
                tempSessionId: this.tempSessionId,
                twoFactorCode: backupCode
            });
            this.showToast('No internet connection. Verification will be processed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            const response = await this.apiCall('/verify-2fa', 'POST', {
                tempSessionId: this.tempSessionId,
                twoFactorCode: backupCode
            });

            if (response.success) {
                // Save auth data after successful backup code verification
                this.authToken = response.data.token;

                // Clear temporary data
                this.tempSessionId = null;

                if (response.data.requiresEmailVerification) {
                    this.showStep('email-verification-form');
                    this.showToast('Please verify your email address', 'info');
                } else {
                    this.showToast('Backup code verified! Redirecting...', 'success');
                    setTimeout(() => this.redirectToDashboard(), 1500);
                }
            }
        } catch (error) {
            this.handleAuthError(error);
            e.target.reset();
        } finally {
            this.setLoading(e.target, false);
        }
    }

    /**
     * Handle email verification
     */
    async handleEmailVerification(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const otp = formData.get('otp');

        if (!this.userEmail) {
            this.showToast('Session expired. Please try again.', 'error');
            this.showStep('login-form');
            return;
        }

        if (!this.isOnline) {
            this.saveOfflineData('email_verify', { email: this.userEmail, otp });
            this.showToast('No internet connection. Verification will be processed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            const response = await this.apiCall('/verify-email', 'POST', {
                email: this.userEmail,
                otp: otp
            });

            if (response.success) {
                this.showToast('Email verified successfully!', 'success');

                if (response.data.user) {
                    this.tempUserData = response.data.user;
                    setTimeout(() => this.redirectToDashboard(), 1500);
                } else {
                    setTimeout(() => this.showStep('login-form'), 1500);
                }
            }
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(e.target, false);
        }
    }

    /**
     * Handle resend verification
     */
    async handleResendVerification(e) {
        e.preventDefault();

        if (!this.userEmail) {
            this.showToast('Session expired. Please try again.', 'error');
            this.showStep('login-form');
            return;
        }

        if (!this.isOnline) {
            this.showToast('No internet connection. Please try again when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            await this.apiCall('/resend-verification', 'POST', { email: this.userEmail });
            this.showToast('Verification code sent!', 'success');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(e.target, false);
        }
    }

    /**
     * Handle forgot password
     */
    async handleForgotPassword(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const email = formData.get('email');

        if (!this.isOnline) {
            this.saveOfflineData('forgot_password', { email });
            this.showToast('No internet connection. Request will be processed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            await this.apiCall('/forgot-password', 'POST', { email });
            this.showToast('If an account exists, you will receive a password reset email.', 'success');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(e.target, false);
        }
    }

    /**
     * Handle 2FA setup
     */
    async handleTwoFactorSetup(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const token = formData.get('token');

        if (!this.isOnline) {
            this.saveOfflineData('2fa_setup', { token });
            this.showToast('No internet connection. Setup will be completed when online.', 'warning');
            return;
        }

        try {
            this.setLoading(e.target, true);
            const response = await this.apiCall('/2fa/verify-setup', 'POST', { token }, true);

            if (response.success && response.data.backupCodes) {
                this.displayBackupCodes(response.data.backupCodes);
                this.showToast('2FA enabled successfully!', 'success');

                document.getElementById('twoFactorSetupForm').style.display = 'none';
            }
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(e.target, false);
        }
    }

    /**
     * Check username availability with debouncing
     */
    checkUsernameAvailability() {
        const input = document.getElementById('username');
        const statusIcon = document.getElementById('username-status');
        const errorElement = document.getElementById('username-error');
        const suggestionsContainer = document.getElementById('username-suggestions');

        statusIcon.className = 'bx bx-loader-alt input-icon';
        statusIcon.style.display = 'block';
        if (!input || !statusIcon) return;

        const username = input.value.trim();

        if (this.debounceTimers.username) {
            clearTimeout(this.debounceTimers.username);
        }

        statusIcon.className = 'bx bx-loader-alt input-icon';
        statusIcon.style.display = 'none';
        if (errorElement) errorElement.textContent = '';
        if (suggestionsContainer) suggestionsContainer.classList.add('hidden'); // Hide suggestions on new input
        input.classList.remove('success', 'error');

        if (username.length < 3) {
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.setFieldError(input, 'Username can only contain letters, numbers, and underscores');
            return;
        }

        if (!this.isOnline) {
            this.showToast('Cannot check username availability while offline', 'warning');
            return;
        }

        statusIcon.style.display = 'block';
        statusIcon.classList.add('rotating');

        this.debounceTimers.username = setTimeout(async () => {
            try {
                const response = await this.apiCall(`/check-username/${encodeURIComponent(username)}`, 'GET');

                if (response.data.available) {
                    statusIcon.className = 'bx bx-check input-icon success';
                    input.classList.add('success');
                    // Username is available - make sure suggestions are hidden
                    if (suggestionsContainer) {
                        suggestionsContainer.classList.add('hidden');
                    }
                } else {
                    statusIcon.className = 'bx bx-x input-icon error';
                    input.classList.add('error');
                    this.setFieldError(input, 'Username is not available');
                    this.showUsernameSuggestions(username); // Only show suggestions when not available
                }
            } catch (error) {
                statusIcon.className = 'bx bx-error input-icon error';
                this.setFieldError(input, 'Unable to check availability');
                // Hide suggestions on error as well
                if (suggestionsContainer) {
                    suggestionsContainer.classList.add('hidden');
                }
            } finally {
                statusIcon.classList.remove('rotating');
            }
        }, this.config.debounceDelay);
    }

    /**
     * Show username suggestions
     */
    async showUsernameSuggestions(baseName) {
        const suggestionsContainer = document.getElementById('username-suggestions');
        if (!suggestionsContainer || !this.isOnline) return;

        try {
            const response = await this.apiCall(`/suggest-usernames?name=${encodeURIComponent(baseName)}`, 'GET');

            if (response.data.suggestions && response.data.suggestions.length > 0) {
                suggestionsContainer.innerHTML = `
                <div class="suggestions-header">Suggestions:</div>
                ${response.data.suggestions.map(suggestion =>
                    `<div class="suggestion-item" data-username="${suggestion}">${suggestion}</div>`
                ).join('')}
            `;

                suggestionsContainer.classList.remove('hidden');

                suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        document.getElementById('username').value = item.dataset.username;
                        suggestionsContainer.classList.add('hidden');
                        this.checkUsernameAvailability();
                    });
                });
            }
        } catch (error) {
            console.warn('Failed to get username suggestions:', error.message);
        }
    }

    /**
     * Check email availability
     */
    async checkEmailAvailability() {
        const input = document.getElementById('email');
        if (!input || !this.isOnline) return;

        const email = input.value.trim();
        if (!this.isValidEmail(email)) return;

        try {
            const response = await this.apiCall(`/check-email/${encodeURIComponent(email)}`, 'GET');

            if (!response.data.available) {
                this.setFieldError(input, 'Email is already registered');
            }
        } catch (error) {
            console.warn('Email availability check failed:', error.message);
        }
    }

    /**
     * Check password strength
     */
    checkPasswordStrength() {
        const input = document.getElementById('password');
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');

        if (!input || !strengthFill || !strengthText) return;

        const password = input.value;
        const strength = this.calculatePasswordStrength(password);

        strengthFill.style.width = `${strength.percentage}%`;
        strengthFill.className = `strength-fill ${strength.level}`;
        strengthText.textContent = strength.text;
        strengthText.className = `strength-text ${strength.level}`;
    }

    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password) {
        if (!password) return { percentage: 0, level: '', text: 'Enter a password' };

        let score = 0;
        let feedback = [];

        if (password.length >= 8) score += 2;
        else feedback.push('at least 8 characters');

        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('lowercase letters');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('uppercase letters');

        if (/\d/.test(password)) score += 1;
        else feedback.push('numbers');

        if (/[@$!%*?&]/.test(password)) score += 1;
        else feedback.push('special characters');

        if (password.length >= 12) score += 1;
        if (/[^A-Za-z0-9@$!%*?&]/.test(password)) score += 1;

        let level, text, percentage;

        if (score < 3) {
            level = 'weak';
            text = `Weak - Add ${feedback.join(', ')}`;
            percentage = 25;
        } else if (score < 5) {
            level = 'fair';
            text = 'Fair - Consider adding more complexity';
            percentage = 50;
        } else if (score < 7) {
            level = 'good';
            text = 'Good password strength';
            percentage = 75;
        } else {
            level = 'strong';
            text = 'Strong password';
            percentage = 100;
        }

        return { percentage, level, text };
    }

    /**
     * Format phone number
     */
    

    /**
     * Handle 2FA input navigation
     */
    handle2FAInput(e, index) {
        const input = e.target;
        const value = input.value;

        if (!/^\d?$/.test(value)) {
            input.value = '';
            return;
        }

        if (value && index < 5) {
            const nextInput = document.querySelector(`.two-factor-input[data-index="${index + 1}"]`);
            if (nextInput) {
                nextInput.focus();
            }
        }

        this.update2FASubmitButton();
    }

    /**
     * Handle 2FA keyboard navigation
     */
    handle2FAKeyDown(e, index) {
        const input = e.target;

        if (e.key === 'Backspace' && !input.value && index > 0) {
            const prevInput = document.querySelector(`.two-factor-input[data-index="${index - 1}"]`);
            if (prevInput) {
                prevInput.focus();
                prevInput.value = '';
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            const prevInput = document.querySelector(`.two-factor-input[data-index="${index - 1}"]`);
            if (prevInput) prevInput.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            const nextInput = document.querySelector(`.two-factor-input[data-index="${index + 1}"]`);
            if (nextInput) nextInput.focus();
        }
    }

    /**
     * Handle 2FA paste
     */
    handle2FAPaste(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').slice(0, 6);

        if (digits.length === 6) {
            const inputs = document.querySelectorAll('.two-factor-input');
            digits.split('').forEach((digit, index) => {
                if (inputs[index]) {
                    inputs[index].value = digit;
                }
            });
            this.update2FASubmitButton();
        }
    }

    /**
     * Get 2FA code from inputs
     */
    get2FACode() {
        const inputs = document.querySelectorAll('.two-factor-input');
        return Array.from(inputs).map(input => input.value).join('');
    }

    /**
     * Clear 2FA inputs
     */
    clear2FAInputs() {
        const inputs = document.querySelectorAll('.two-factor-input');
        inputs.forEach(input => {
            input.value = '';
        });
        if (inputs[0]) inputs[0].focus();
        this.update2FASubmitButton();
    }

    /**
     * Update 2FA submit button state
     */
    update2FASubmitButton() {
        const code = this.get2FACode();
        const submitButton = document.querySelector('#twoFactorForm button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = code.length !== 6;
        }
    }

    /**
     * Display backup codes
     */
    displayBackupCodes(codes) {
        const container = document.getElementById('backup-codes-display');
        const grid = document.getElementById('backup-codes-grid');

        if (container && grid) {
            grid.innerHTML = codes.map(code =>
                `<div class="backup-code">${code}</div>`
            ).join('');

            container.classList.remove('hidden');
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(toggleId) {
        const toggle = document.getElementById(toggleId);
        if (!toggle) return;

        const input = toggle.previousElementSibling;
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            toggle.className = 'bx bx-show input-icon';
        } else {
            input.type = 'password';
            toggle.className = 'bx bx-hide input-icon';
        }
    }

    /**
     * Validate form before submission
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(input) {
        const value = input.value.trim();
        const type = input.type;
        const name = input.name;

        let isValid = true;
        let errorMessage = '';

        if (input.required && !value) {
            errorMessage = 'This field is required';
            isValid = false;
        } else if (type === 'email' && value && !this.isValidEmail(value)) {
            errorMessage = 'Please enter a valid email address';
            isValid = false;
        } else if (name === 'password' && value && !this.isValidPassword(value)) {
            errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
            isValid = false;
        } else if (name === 'username' && value && !this.isValidUsername(value)) {
            errorMessage = 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
            isValid = false;
        } else if (name === 'phone' && value && !this.isValidPhone(value)) {
            errorMessage = 'Please enter a valid phone number';
            isValid = false;
        } else if ((name === 'firstName' || name === 'lastName') && value && !this.isValidName(value)) {
            errorMessage = 'Name can only contain letters, spaces, hyphens, and apostrophes';
            isValid = false;
        } else if (name === 'otp' && value && !/^\d{6}$/.test(value)) {
            errorMessage = 'Please enter a valid 6-digit code';
            isValid = false;
        } else if (name === 'token' && value && !/^\d{6}$/.test(value)) {
            errorMessage = 'Please enter a valid 6-digit code';
            isValid = false;
        } else if (name === 'backupCode' && value && !/^[A-Z0-9]{8}$/i.test(value)) {
            errorMessage = 'Please enter a valid backup code';
            isValid = false;
        }

        if (!isValid) {
            this.setFieldError(input, errorMessage);
        } else {
            this.clearFieldError(input);
        }

        return isValid;
    }
}

// Production-Ready Authn Authentication System Initialization
// Add this script after your main auth class and CSS

(function () {
    'use strict';

    // Inject required styles if not already present
    function injectStyles() {
        if (!document.getElementById('transitflow-auth-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'transitflow-auth-styles';
            styleSheet.textContent = `
                /* Add the CSS from the previous artifact here */
            `;
            document.head.appendChild(styleSheet);
        }
    }

    // Create required HTML elements if they don't exist
    function createRequiredElements() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            toastContainer.setAttribute('aria-live', 'polite');
            toastContainer.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(toastContainer);
        }

        // Create top loader if it doesn't exist
        if (!document.getElementById('topLoader')) {
            const topLoader = document.createElement('div');
            topLoader.id = 'topLoader';
            topLoader.className = 'top-loader';
            topLoader.innerHTML = '<div class="top-loader-bar"></div>';
            topLoader.setAttribute('aria-hidden', 'true');
            document.body.appendChild(topLoader);
        }
    }

    // Enhanced error handling for the auth system
    function setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (window.transitFlowAuth) {
                window.transitFlowAuth.showToast(
                    'An unexpected error occurred. Please refresh the page if the problem persists.',
                    'error'
                );
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (window.transitFlowAuth) {
                window.transitFlowAuth.showToast(
                    'A network error occurred. Please check your connection and try again.',
                    'error'
                );
            }
            event.preventDefault(); // Prevent the default browser behavior
        });

        // Handle network status changes
        window.addEventListener('online', () => {
            if (window.transitFlowAuth) {
                window.transitFlowAuth.showToast(
                    'Connection restored! 🎉',
                    'success'
                );
            }
        });

        window.addEventListener('offline', () => {
            if (window.transitFlowAuth) {
                window.transitFlowAuth.showToast(
                    'Connection lost. Working offline...',
                    'warning',
                    8000
                );
            }
        });
    }

    // Add keyboard shortcuts and accessibility improvements
    function setupAccessibilityFeatures() {
        document.addEventListener('keydown', (e) => {
            // ESC key to dismiss toasts
            if (e.key === 'Escape') {
                const toasts = document.querySelectorAll('.toast');
                toasts.forEach(toast => {
                    const closeButton = toast.querySelector('.toast-close');
                    if (closeButton) {
                        closeButton.click();
                    }
                });
            }

            // Alt + T to focus first visible input (accessibility shortcut)
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                const firstInput = document.querySelector('input:not([type="hidden"]):not([readonly]):not([disabled])');
                if (firstInput) {
                    firstInput.focus();
                }
            }

            // Ctrl/Cmd + Enter to submit current form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const focusedElement = document.activeElement;
                const form = focusedElement.closest('form');
                if (form) {
                    e.preventDefault();
                    const submitButton = form.querySelector('button[type="submit"]');
                    if (submitButton && !submitButton.disabled) {
                        submitButton.click();
                    }
                }
            }
        });

        // Add focus management for better keyboard navigation
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('.form-input, .two-factor-input')) {
                e.target.parentElement.classList.add('focused');
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.matches('.form-input, .two-factor-input')) {
                e.target.parentElement.classList.remove('focused');
            }
        });
    }

    // Performance monitoring
    function setupPerformanceMonitoring() {
        if ('performance' in window && 'mark' in performance) {
            // Mark key performance points
            performance.mark('auth-system-init-start');

            window.addEventListener('load', () => {
                performance.mark('auth-system-ready');

                // Measure initialization time
                try {
                    performance.measure(
                        'auth-system-init',
                        'auth-system-init-start',
                        'auth-system-ready'
                    );

                    const measure = performance.getEntriesByName('auth-system-init')[0];
                    console.log(`Auth system initialized in ${measure.duration.toFixed(2)}ms`);
                } catch (error) {
                    console.warn('Performance measurement failed:', error);
                }
            });
        }
    }

    // Service Worker registration for offline support (if available)
    function registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            navigator.serviceWorker.register('../public/js/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registered:', registration);

                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        // Show update available notification
                                        if (window.transitFlowAuth) {
                                            window.transitFlowAuth.showToast(
                                                'App update available. Refresh to get the latest version.',
                                                'info',
                                                10000
                                            );
                                        }
                                    }
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.warn('ServiceWorker registration failed:', error);
                });
        }
    }

    // Initialize the authentication system
    function initializeAuthSystem() {
        try {
            // Create and configure the auth instance
            window.authn = new Authn();

            // Add custom event listeners for auth state changes
            document.addEventListener('authStateChange', (e) => {
                const { state, user } = e.detail;
                console.log('Auth state changed:', state, user);

                // You can add custom logic here for auth state changes
                switch (state) {
                    case 'authenticated':
                        window.location.href = '/dashboard';
                        break;
                    case 'unauthenticated':
                        window.location.href = '/';
                        break;
                    case 'pending':
                        this.showLoadingOverlay();
                        break;
                }
            });

            // Add development mode helpers
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // Development mode
                console.log('🔧 TransitFLOW Auth running in development mode');
                window.authDebug = {
                    showAllToasts: () => {
                        window.transitFlowAuth.showToast('Success message example', 'success');
                        setTimeout(() => window.transitFlowAuth.showToast('Error message example', 'error'), 200);
                        setTimeout(() => window.transitFlowAuth.showToast('Warning message example', 'warning'), 400);
                        setTimeout(() => window.transitFlowAuth.showToast('Info message example', 'info'), 600);
                    },
                    testOfflineMode: () => {
                        window.transitFlowAuth.isOnline = false;
                        window.transitFlowAuth.showOfflineMessage();
                    },
                    testOnlineMode: () => {
                        window.transitFlowAuth.isOnline = true;
                        window.transitFlowAuth.hideOfflineMessage();
                        window.transitFlowAuth.processOfflineQueue();
                    },
                    clearStorage: () => {
                        localStorage.clear();
                        sessionStorage.clear();
                        location.reload();
                    }
                };
            }

        } catch (error) {
            console.error('Failed to initialize auth system:', error);

            // Show fallback error message
            const fallbackToast = document.createElement('div');
            fallbackToast.className = 'toast toast-error';
            fallbackToast.innerHTML = `
                <div class="toast-content">
                    <i class="bx bx-error-circle toast-icon"></i>
                    <span class="toast-message">Failed to initialize authentication system. Please refresh the page.</span>
                </div>
            `;

            const container = document.getElementById('toastContainer') || document.body;
            container.appendChild(fallbackToast);

            setTimeout(() => {
                if (fallbackToast.parentNode) {
                    fallbackToast.parentNode.removeChild(fallbackToast);
                }
            }, 8000);
        }
    }

    // Run initialization when DOM is ready
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                createRequiredElements();
                setupGlobalErrorHandling();
                setupAccessibilityFeatures();
                setupPerformanceMonitoring();
                initializeAuthSystem();
                registerServiceWorker();
            });
        } else {
            // DOM is already ready
            injectStyles();
            createRequiredElements();
            setupGlobalErrorHandling();
            setupAccessibilityFeatures();
            setupPerformanceMonitoring();
            initializeAuthSystem();
            registerServiceWorker();
        }
    }

    // Start initialization
    init();

    // Expose public API for external integration
    window.AuthnAPI = {
        getInstance: () => window.transitFlowAuth,
        showToast: (message, type, duration) => {
            if (window.transitFlowAuth) {
                return window.transitFlowAuth.showToast(message, type, duration);
            }
        },
        isOnline: () => window.transitFlowAuth ? window.transitFlowAuth.isOnline : navigator.onLine,
        getCurrentStep: () => window.transitFlowAuth ? window.transitFlowAuth.currentStep : null,
        getAuthToken: () => window.transitFlowAuth ? window.transitFlowAuth.authToken : null,
        logout: () => {
            if (window.transitFlowAuth) {
                window.transitFlowAuth.showStep('login-form');
                window.transitFlowAuth.showToast('You have been logged out', 'info');
            }
        }
    };

})();