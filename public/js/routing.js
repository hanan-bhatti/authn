class TransitFLOWAuthRouter {
    constructor(authInstance) {
        this.auth = authInstance;
        this.routes = {
            '/': 'login-form',
            '/login': 'login-form', 
            '/register': 'register-form',
            '/signup': 'register-form',
            '/forgot-password': 'forgot-password-form',
            '/reset-password': 'forgot-password-form',
            '/verify-email': 'email-verification-form',
            '/2fa': 'two-factor-form',
            '/backup-code': 'backup-code-form'
        };
        
        this.currentRoute = '';
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Handle initial page load
        this.handleRoute();

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.handleRoute();
        });

        // Setup navigation listeners - integrate with existing auth system
        this.setupNavigationListeners();
        
        // Handle URL query parameters (for error states, etc.)
        this.handleQueryParameters();
        
        this.isInitialized = true;
    }

    handleRoute() {
        const path = window.location.pathname;
        const targetForm = this.routes[path] || 'login-form';
        
        // Don't update if already on the same route
        if (this.currentRoute === targetForm) return;
        
        this.currentRoute = targetForm;
        
        // Use the auth instance's showStep method to maintain consistency
        if (this.auth && typeof this.auth.showStep === 'function') {
            this.auth.showStep(targetForm);
        } else {
            // Fallback if auth instance not available yet
            this.showForm(targetForm);
        }
        
        // Update page title
        this.updatePageTitle(targetForm);
    }

    showForm(formId) {
        // Hide all forms
        const allForms = document.querySelectorAll('.auth-step');
        allForms.forEach(form => {
            form.classList.add('hidden');
            form.classList.remove('active');
        });

        // Show target form
        const targetForm = document.getElementById(formId);
        if (targetForm) {
            targetForm.classList.remove('hidden');
            targetForm.classList.add('active');
            
            // Clear any existing alerts
            const alert = targetForm.querySelector('[id$="-alert"]');
            if (alert) alert.innerHTML = '';
            
            // Focus first input with delay to ensure form is visible
            setTimeout(() => {
                const firstInput = targetForm.querySelector('.form-input, input:not([type="hidden"]):not([readonly])');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    updatePageTitle(formId) {
        const titles = {
            'login-form': 'Sign In - TransitFLOW',
            'register-form': 'Sign Up - TransitFLOW', 
            'forgot-password-form': 'Reset Password - TransitFLOW',
            'email-verification-form': 'Verify Email - TransitFLOW',
            'two-factor-form': '2FA Verification - TransitFLOW',
            'backup-code-form': 'Backup Code - TransitFLOW'
        };
        
        document.title = titles[formId] || 'TransitFLOW - Authentication';
    }

    navigateTo(path, formId = null) {
        // Determine form ID from path if not provided
        if (!formId) {
            formId = this.routes[path] || 'login-form';
        }

        // Update URL without page reload
        const currentUrl = window.location.pathname;
        if (currentUrl !== path) {
            window.history.pushState({ formId, timestamp: Date.now() }, '', path);
        }
        
        // Update current route and show form
        this.currentRoute = formId;
        
        // Use auth instance's method if available
        if (this.auth && typeof this.auth.showStep === 'function') {
            this.auth.showStep(formId);
        } else {
            this.showForm(formId);
        }
        
        this.updatePageTitle(formId);
    }

    setupNavigationListeners() {
        // Remove any existing listeners to prevent conflicts
        this.removeExistingListeners();
        
        // Navigation event mapping
        const navigationEvents = {
            'show-register': '/register',
            'show-forgot-password': '/forgot-password', 
            'back-to-login': '/login',
            'back-to-login-from-forgot': '/login',
            'back-to-login-from-2fa': '/login',
            'back-to-login-from-verification': '/login',
            'show-backup-code': '/backup-code',
            'back-to-2fa': '/2fa'
        };

        // Setup click handlers for navigation
        Object.entries(navigationEvents).forEach(([elementId, path]) => {
            const element = document.getElementById(elementId);
            if (element) {
                const handler = (e) => {
                    e.preventDefault();
                    this.navigateTo(path);
                };
                
                element.addEventListener('click', handler);
                // Store handler reference for cleanup
                element._routerHandler = handler;
            }
        });

        // Special handlers that need auth integration
        this.setupSpecialHandlers();
    }

    setupSpecialHandlers() {
        // Skip 2FA setup handler
        const skip2FA = document.getElementById('skip-2fa-setup');
        if (skip2FA && !skip2FA._routerHandler) {
            const handler = (e) => {
                e.preventDefault();
                if (this.auth && typeof this.auth.redirectToDashboard === 'function') {
                    this.auth.redirectToDashboard();
                } else {
                    window.location.href = '/dashboard';
                }
            };
            skip2FA.addEventListener('click', handler);
            skip2FA._routerHandler = handler;
        }
    }

    removeExistingListeners() {
        const elementsWithHandlers = document.querySelectorAll('[id*="show-"], [id*="back-to-"]');
        elementsWithHandlers.forEach(element => {
            if (element._routerHandler) {
                element.removeEventListener('click', element._routerHandler);
                delete element._routerHandler;
            }
        });
    }

    handleQueryParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const success = urlParams.get('success');
        const message = urlParams.get('message');

        if (error || success || message) {
            setTimeout(() => {
                let alertMessage = '';
                let alertType = 'info';

                if (error) {
                    alertType = 'error';
                    switch (error) {
                        case 'missing-token':
                            alertMessage = 'Password reset link is missing required information. Please request a new reset link.';
                            break;
                        case 'invalid-token':
                            alertMessage = 'This password reset link is invalid or has expired. Please request a new reset link.';
                            break;
                        case 'server-error':
                            alertMessage = 'Server error occurred. Please try again later.';
                            break;
                        case 'session-expired':
                            alertMessage = 'Your session has expired. Please log in again.';
                            break;
                        case 'access-denied':
                            alertMessage = 'Access denied. Please check your credentials.';
                            break;
                        default:
                            alertMessage = decodeURIComponent(error);
                    }
                } else if (success) {
                    alertType = 'success';
                    switch (success) {
                        case 'password-reset':
                            alertMessage = 'Your password has been reset successfully. You can now log in.';
                            break;
                        case 'email-verified':
                            alertMessage = 'Your email has been verified successfully!';
                            break;
                        case 'account-created':
                            alertMessage = 'Account created successfully! Please check your email for verification.';
                            break;
                        default:
                            alertMessage = decodeURIComponent(success);
                    }
                } else if (message) {
                    alertMessage = decodeURIComponent(message);
                }

                // Show message using auth system's toast or fallback
                if (this.auth && typeof this.auth.showToast === 'function') {
                    this.auth.showToast(alertMessage, alertType);
                } else {
                    this.showAlert(alertMessage, alertType);
                }

                // Clean up URL parameters
                this.cleanUpUrl();
            }, 500);
        }
    }

    showAlert(message, type = 'info') {
        // Fallback alert system if auth toast isn't available
        const alertContainer = document.createElement('div');
        alertContainer.className = `router-alert router-alert-${type}`;
        alertContainer.innerHTML = `
            <div class="alert-content">
                <i class="bx ${this.getAlertIcon(type)}"></i>
                <span class="alert-message">${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="bx bx-x"></i>
                </button>
            </div>
        `;

        // Inject basic styles if needed
        this.injectAlertStyles();

        document.body.appendChild(alertContainer);

        // Auto remove after 8 seconds
        setTimeout(() => {
            if (alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, 8000);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'bx-check-circle',
            error: 'bx-error-circle', 
            warning: 'bx-error',
            info: 'bx-info-circle'
        };
        return icons[type] || icons.info;
    }

    injectAlertStyles() {
        if (!document.getElementById('router-alert-styles')) {
            const style = document.createElement('style');
            style.id = 'router-alert-styles';
            style.textContent = `
                .router-alert {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    min-width: 320px;
                    max-width: 500px;
                }
                .router-alert-success { border-left: 4px solid #10b981; }
                .router-alert-error { border-left: 4px solid #ef4444; }
                .router-alert-warning { border-left: 4px solid #f59e0b; }
                .router-alert-info { border-left: 4px solid #3b82f6; }
                .alert-content {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    gap: 12px;
                }
                .alert-message {
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .alert-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6b7280;
                }
                .router-alert i {
                    font-size: 20px;
                }
                .router-alert-success i { color: #10b981; }
                .router-alert-error i { color: #ef4444; }
                .router-alert-warning i { color: #f59e0b; }
                .router-alert-info i { color: #3b82f6; }
            `;
            document.head.appendChild(style);
        }
    }

    cleanUpUrl() {
        const currentPath = window.location.pathname;
        window.history.replaceState({ formId: this.currentRoute }, document.title, currentPath);
    }

    // Public methods for integration with auth system
    show2FA() {
        this.navigateTo('/2fa');
    }

    showEmailVerification() {
        this.navigateTo('/verify-email');
    }

    showLogin() {
        this.navigateTo('/login');
    }

    showRegister() {
        this.navigateTo('/register');
    }

    redirectAfterLogin(url = '/dashboard') {
        // Clean up any router state before redirect
        if (this.auth) {
            // Let auth system handle the redirect
            if (typeof this.auth.redirectToDashboard === 'function') {
                this.auth.redirectToDashboard();
            } else {
                window.location.href = url;
            }
        } else {
            window.location.href = url;
        }
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    getCurrentPath() {
        return window.location.pathname;
    }

    // Cleanup method
    destroy() {
        this.removeExistingListeners();
        window.removeEventListener('popstate', this.handleRoute);
        this.isInitialized = false;
    }
}

// Enhanced initialization that integrates with existing TransitFLOWAuth
(function() {
    'use strict';

    let routerInstance = null;
    let initializationAttempts = 0;
    const maxAttempts = 10;

    function initializeRouter() {
        initializationAttempts++;

        // Check if TransitFLOWAuth is available
        if (window.transitFlowAuth && window.transitFlowAuth instanceof TransitFLOWAuth) {
            if (!routerInstance) {
                routerInstance = new TransitFLOWAuthRouter(window.transitFlowAuth);
                
                // Extend the auth instance with router methods
                window.transitFlowAuth.router = routerInstance;
                window.transitFlowAuth.navigateTo = (path) => routerInstance.navigateTo(path);
                window.transitFlowAuth.show2FA = () => routerInstance.show2FA();
                window.transitFlowAuth.showEmailVerification = () => routerInstance.showEmailVerification();
                
                // Override the existing showStep to work with router
                const originalShowStep = window.transitFlowAuth.showStep.bind(window.transitFlowAuth);
                window.transitFlowAuth.showStep = function(stepId) {
                    // Find the route for this step
                    const routePath = Object.keys(routerInstance.routes).find(
                        path => routerInstance.routes[path] === stepId
                    ) || '/login';
                    
                    // Use router navigation if different from current route
                    if (routerInstance.currentRoute !== stepId) {
                        routerInstance.navigateTo(routePath);
                    } else {
                        originalShowStep(stepId);
                    }
                };
                
                // Expose router to global scope for debugging
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    window.authRouter = routerInstance;
                    window.routerDebug = {
                        getCurrentRoute: () => routerInstance.getCurrentRoute(),
                        navigateTo: (path) => routerInstance.navigateTo(path),
                        showAllRoutes: () => console.table(routerInstance.routes)
                    };
                }
            }
        } else if (initializationAttempts < maxAttempts) {
            // TransitFLOWAuth not ready yet, try again
            setTimeout(initializeRouter, 100);
        } else {
            console.warn('⚠️ TransitFLOW Router: Could not find TransitFLOWAuth instance after', maxAttempts, 'attempts');
            
            // Initialize standalone router as fallback
            if (!routerInstance) {
                routerInstance = new TransitFLOWAuthRouter(null);
                window.authRouter = routerInstance;
                console.log('📍 TransitFLOW Router initialized in standalone mode');
            }
        }
    }

    // Start initialization based on DOM state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRouter);
    } else {
        initializeRouter();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (routerInstance) {
            routerInstance.destroy();
        }
    });

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransitFLOWAuthRouter;
} else if (typeof define === 'function' && define.amd) {
    define([], function() {
        return TransitFLOWAuthRouter;
    });
}