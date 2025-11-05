class SocialAccountsManager {
    constructor(containerId = 'socialAccountsContainer') {
        this.baseURL = '/api';
        this.containerId = containerId;
        this.supportedProviders = [
            { id: 'google', name: 'Google', icon: 'fab fa-google', color: '#ea4335' },
            { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2' },
            { id: 'github', name: 'GitHub', icon: 'fab fa-github', color: '#333' },
            { id: 'twitter', name: 'Twitter', icon: 'fab fa-twitter', color: '#1da1f2' },
            { id: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin-in', color: '#0a66c2' }
        ];
        this.linkedAccounts = [];
        this.init();
    }

    init() {
        this.createSocialAccountsInterface();
        this.loadSocialAccounts();
        this.handleUrlParams();
    }

    createSocialAccountsInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID ${this.containerId} not found`);
            return;
        }

        container.innerHTML = `
            <div class="social-accounts-wrapper">
                <style>
                    .social-accounts-wrapper {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    
                    .social-section {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        margin-bottom: 2rem;
                        overflow: hidden;
                    }
                    
                    .section-header {
                        padding: 1.5rem;
                        border-bottom: 1px solid #e5e7eb;
                        background: #f9fafb;
                    }
                    
                    .section-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #111827;
                        margin-bottom: 0.5rem;
                    }
                    
                    .section-description {
                        color: #6b7280;
                        font-size: 0.9rem;
                    }
                    
                    .section-content {
                        padding: 1.5rem;
                    }
                    
                    .link-providers {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 1rem;
                        margin-bottom: 1rem;
                    }
                    
                    .social-link-btn {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 1rem;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        background: white;
                        color: #374151;
                        text-decoration: none;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        cursor: pointer;
                        position: relative;
                    }
                    
                    .social-link-btn:hover:not(.disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                    
                    .social-link-btn.disabled {
                        background: #f3f4f6;
                        color: #9ca3af;
                        cursor: not-allowed;
                        border-color: #d1d5db;
                    }
                    
                    .social-link-btn.linked {
                        background: #ecfdf5;
                        border-color: #10b981;
                        color: #047857;
                    }
                    
                    .social-icon-wrapper {
                        width: 40px;
                        height: 40px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 1.2rem;
                    }
                    
                    .social-text {
                        flex: 1;
                    }
                    
                    .social-text .provider-name {
                        font-weight: 600;
                        margin-bottom: 0.25rem;
                    }
                    
                    .social-text .provider-status {
                        font-size: 0.8rem;
                        opacity: 0.8;
                    }
                    
                    .linked-accounts-grid {
                        display: grid;
                        gap: 1rem;
                    }
                    
                    .linked-account-card {
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 1.5rem;
                        background: #fafbfc;
                        transition: all 0.2s ease;
                    }
                    
                    .linked-account-card:hover {
                        border-color: #d1d5db;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    
                    .account-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 1rem;
                    }
                    
                    .account-info {
                        display: flex;
                        gap: 1rem;
                        flex: 1;
                    }
                    
                    .account-details h4 {
                        color: #111827;
                        font-size: 1rem;
                        margin-bottom: 0.25rem;
                    }
                    
                    .account-details .email {
                        color: #6b7280;
                        font-size: 0.9rem;
                        margin-bottom: 0.25rem;
                    }
                    
                    .account-details .linked-date {
                        color: #9ca3af;
                        font-size: 0.8rem;
                    }
                    
                    .unlink-btn {
                        background: #fef2f2;
                        color: #dc2626;
                        border: 1px solid #fecaca;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    
                    .unlink-btn:hover {
                        background: #dc2626;
                        color: white;
                        border-color: #dc2626;
                    }
                    
                    .empty-state {
                        text-align: center;
                        padding: 3rem 1rem;
                        color: #6b7280;
                    }
                    
                    .empty-state i {
                        font-size: 3rem;
                        margin-bottom: 1rem;
                        opacity: 0.5;
                    }
                    
                    .loading-state {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 1rem;
                        padding: 2rem;
                        color: #6b7280;
                    }
                    
                    .spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid #e5e7eb;
                        border-top: 2px solid #3b82f6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    .refresh-btn {
                        background: #f3f4f6;
                        color: #6b7280;
                        border: 1px solid #d1d5db;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        transition: all 0.2s ease;
                    }
                    
                    .refresh-btn:hover {
                        background: #e5e7eb;
                        color: #374151;
                    }

                    @media (max-width: 768px) {
                        .link-providers {
                            grid-template-columns: 1fr;
                        }
                        
                        .account-header {
                            flex-direction: column;
                            gap: 1rem;
                        }
                        
                        .unlink-btn {
                            align-self: stretch;
                            justify-content: center;
                        }
                    }
                </style>

                <!-- Link New Accounts Section -->
                <div class="social-section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">Link Social Accounts</h2>
                            <p class="section-description">Connect your social media accounts for easier sign-in</p>
                        </div>
                    </div>
                    <div class="section-content">
                        <div class="link-providers" id="linkProvidersContainer">
                            ${this.generateLinkProvidersHTML()}
                        </div>
                    </div>
                </div>

                <!-- Linked Accounts Section -->
                <div class="social-section">
                    <div class="section-header">
                        <div>
                            <h2 class="section-title">Linked Accounts</h2>
                            <p class="section-description">Manage your connected social accounts</p>
                        </div>
                        <button class="refresh-btn" id="refreshAccountsBtn">
                            <i class="fas fa-sync-alt"></i>
                            Refresh
                        </button>
                    </div>
                    <div class="section-content">
                        <div id="linkedAccountsContainer">
                            ${this.generateLoadingHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachAllEventListeners();
    }

    generateLinkProvidersHTML() {
        return this.supportedProviders.map(provider => `
            <button class="social-link-btn" data-provider="${provider.id}">
                <div class="social-icon-wrapper" style="background-color: ${provider.color}">
                    <i class="${provider.icon}"></i>
                </div>
                <div class="social-text">
                    <div class="provider-name">Link ${provider.name}</div>
                    <div class="provider-status">Not connected</div>
                </div>
            </button>
        `).join('');
    }

    generateLoadingHTML() {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <span>Loading accounts...</span>
            </div>
        `;
    }

    generateEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-link"></i>
                <p>No social accounts linked</p>
                <small>Link your social accounts above for easier access</small>
            </div>
        `;
    }

    generateLinkedAccountHTML(account) {
        const provider = this.supportedProviders.find(p => p.id === account.provider);
        const linkedDate = new Date(account.linkedAt).toLocaleDateString();
        
        return `
            <div class="linked-account-card" data-provider="${account.provider}">
                <div class="account-header">
                    <div class="account-info">
                        <div class="social-icon-wrapper" style="background-color: ${provider?.color || '#6b7280'}">
                            <i class="${provider?.icon || 'fas fa-link'}"></i>
                        </div>
                        <div class="account-details">
                            <h4>${account.displayName || 'No name provided'}</h4>
                            <div class="email">${account.email || 'No email provided'}</div>
                            <div class="linked-date">Linked on ${linkedDate}</div>
                        </div>
                    </div>
                    <button class="unlink-btn" data-provider="${account.provider}">
                        <i class="fas fa-unlink"></i>
                        Unlink
                    </button>
                </div>
                ${account.profilePicture ? `
                    <div style="text-align: center; margin-top: 1rem;">
                        <img src="${account.profilePicture}" 
                             alt="${account.displayName}" 
                             style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #e5e7eb;"
                             onerror="this.style.display='none'">
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateErrorStateHTML(message = 'Error loading social accounts') {
        return `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i>
                <p>${message}</p>
                <button class="refresh-btn" style="margin-top: 1rem;" onclick="socialManager.loadSocialAccounts()">
                    <i class="fas fa-redo"></i>
                    Try Again
                </button>
            </div>
        `;
    }

    attachAllEventListeners() {
        // Link provider buttons
        this.attachLinkProviderListeners();
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshAccountsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadSocialAccounts();
            });
        }
    }

    attachLinkProviderListeners() {
        const container = document.getElementById('linkProvidersContainer');
        if (container) {
            container.addEventListener('click', (e) => {
                const button = e.target.closest('.social-link-btn');
                if (button && !button.classList.contains('disabled')) {
                    const provider = button.dataset.provider;
                    this.initiateSocialLink(provider);
                }
            });
        }
    }

    attachUnlinkListeners() {
        const container = document.getElementById('linkedAccountsContainer');
        if (container) {
            // Remove existing listeners to prevent duplicates
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
            
            // Add new listener
            newContainer.addEventListener('click', (e) => {
                const button = e.target.closest('.unlink-btn');
                if (button) {
                    const provider = button.dataset.provider;
                    this.unlinkSocial(provider);
                }
            });
        }
    }

    async makeRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken'); // Adjust based on your auth system
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            ...options
        };

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    async initiateSocialLink(provider) {
        const providerObj = this.supportedProviders.find(p => p.id === provider);
        if (!providerObj) {
            this.showToast('error', 'Error', 'Unsupported social provider');
            return;
        }

        try {
            this.updateLinkButtonState(provider, 'loading');
            
            const response = await this.makeRequest(`/users/oauth/${provider}`);
            
            if (response.data && response.data.authUrl) {
                // Redirect to OAuth URL
                window.location.href = response.data.authUrl;
            } else {
                throw new Error('No authorization URL received');
            }
        } catch (error) {
            this.updateLinkButtonState(provider, 'error');
            this.showToast('error', 'Error', `Failed to initiate ${providerObj.name} linking: ${error.message}`);
            
            // Reset button state after 3 seconds
            setTimeout(() => {
                this.updateLinkProviders();
            }, 3000);
        }
    }

    async loadSocialAccounts() {
        try {
            this.updateLinkedAccountsContainer(this.generateLoadingHTML());
            
            const response = await this.makeRequest('/users/social-accounts');
            this.linkedAccounts = response.data.socialAccounts || [];

            if (this.linkedAccounts.length === 0) {
                this.updateLinkedAccountsContainer(this.generateEmptyStateHTML());
            } else {
                const linkedAccountsHTML = this.linkedAccounts
                    .filter(account => account.isLinked)
                    .map(account => this.generateLinkedAccountHTML(account))
                    .join('');

                this.updateLinkedAccountsContainer(`
                    <div class="linked-accounts-grid">
                        ${linkedAccountsHTML}
                    </div>
                `);

                // Attach unlink event listeners
                this.attachUnlinkListeners();
            }

            // Update link provider buttons
            this.updateLinkProviders();

        } catch (error) {
            console.error('Error loading social accounts:', error);
            this.updateLinkedAccountsContainer(this.generateErrorStateHTML('Failed to load social accounts'));
            this.showToast('error', 'Error', 'Failed to load social accounts');
        }
    }

    updateLinkedAccountsContainer(html) {
        const container = document.getElementById('linkedAccountsContainer');
        if (container) {
            container.innerHTML = html;
        }
    }

    updateLinkProviders() {
        const container = document.getElementById('linkProvidersContainer');
        if (!container) return;

        const updatedHTML = this.supportedProviders.map(provider => {
            const isLinked = this.linkedAccounts.some(account => 
                account.provider === provider.id && account.isLinked
            );

            const buttonClass = isLinked ? 'social-link-btn linked disabled' : 'social-link-btn';
            const statusText = isLinked ? 'Already linked' : 'Click to link';
            const buttonText = isLinked ? `${provider.name} Linked` : `Link ${provider.name}`;

            return `
                <button class="${buttonClass}" data-provider="${provider.id}" ${isLinked ? 'disabled' : ''}>
                    <div class="social-icon-wrapper" style="background-color: ${provider.color}">
                        <i class="${provider.icon}"></i>
                    </div>
                    <div class="social-text">
                        <div class="provider-name">${buttonText}</div>
                        <div class="provider-status">${statusText}</div>
                    </div>
                    ${isLinked ? '<i class="fas fa-check" style="color: #10b981;"></i>' : '<i class="fas fa-arrow-right" style="color: #9ca3af;"></i>'}
                </button>
            `;
        }).join('');

        container.innerHTML = updatedHTML;
    }

    updateLinkButtonState(provider, state) {
        const button = document.querySelector(`[data-provider="${provider}"].social-link-btn`);
        if (!button) return;

        const providerObj = this.supportedProviders.find(p => p.id === provider);
        const textContainer = button.querySelector('.social-text');
        
        switch (state) {
            case 'loading':
                button.classList.add('disabled');
                button.disabled = true;
                textContainer.innerHTML = `
                    <div class="provider-name">Connecting...</div>
                    <div class="provider-status">Please wait</div>
                `;
                break;
            case 'error':
                button.classList.remove('disabled');
                button.disabled = false;
                textContainer.innerHTML = `
                    <div class="provider-name">Connection Failed</div>
                    <div class="provider-status">Click to retry</div>
                `;
                break;
        }
    }

    async unlinkSocial(provider) {
        const providerObj = this.supportedProviders.find(p => p.id === provider);
        const providerName = providerObj?.name || provider;

        if (!await this.showConfirm(
            `Unlink ${providerName} Account`, 
            `Are you sure you want to unlink your ${providerName} account? You can always link it again later.`
        )) {
            return;
        }

        try {
            // Update button state
            const unlinkBtn = document.querySelector(`[data-provider="${provider}"].unlink-btn`);
            if (unlinkBtn) {
                unlinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlinking...';
                unlinkBtn.disabled = true;
            }

            await this.makeRequest(`/users/social-accounts/${provider}`, { 
                method: 'DELETE' 
            });
            
            // Reload accounts
            await this.loadSocialAccounts();
            this.showToast('success', 'Success', `${providerName} account unlinked successfully`);
            
        } catch (error) {
            this.showToast('error', 'Error', `Failed to unlink ${providerName} account: ${error.message}`);
            // Reset button on error
            setTimeout(() => this.loadSocialAccounts(), 1000);
        }
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');
        const provider = urlParams.get('provider');

        if (success === 'account_linked' && provider) {
            const providerObj = this.supportedProviders.find(p => p.id === provider);
            this.showToast('success', 'Success', `${providerObj?.name || provider} account linked successfully!`);
            this.loadSocialAccounts();
        }

        if (error) {
            let errorMessage = 'Failed to link account';
            
            switch (error) {
                case 'account_already_linked':
                    errorMessage = 'This social account is already linked to another user';
                    break;
                case 'provider_already_linked':
                    errorMessage = 'You already have this provider linked';
                    break;
                case 'linking_failed':
                    errorMessage = 'Failed to link account. Please try again';
                    break;
                default:
                    errorMessage = error.replace(/_/g, ' ');
            }
            
            this.showToast('error', 'Linking Failed', errorMessage);
        }

        // Clean URL parameters
        if (success || error) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    async showConfirm(title, message) {
        // Simple confirm dialog - replace with your modal system
        return confirm(`${title}\n\n${message}`);
    }

    showToast(type, title, message) {
        // Simple toast notification - replace with your notification system
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        
        // Create toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid ${type === 'success' ? '#10b981' : '#dc2626'};
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            padding: 1rem;
            max-width: 350px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #111827;">${title}</strong>
                <button style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #9ca3af;" onclick="this.parentElement.parentElement.remove()">
                    &times;
                </button>
            </div>
            <div style="color: #6b7280; font-size: 0.9rem;">${message}</div>
        `;

        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // Public methods for manual refresh
    refresh() {
        this.loadSocialAccounts();
    }

    // Method to update specific provider button
    updateProviderButton(provider, isLinked) {
        const button = document.querySelector(`[data-provider="${provider}"].social-link-btn`);
        if (!button) return;

        if (isLinked) {
            button.classList.add('linked', 'disabled');
            button.disabled = true;
        } else {
            button.classList.remove('linked', 'disabled');
            button.disabled = false;
        }

        this.updateLinkProviders();
    }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the manager instance
    window.socialManager = new SocialAccountsManager();
});

// Utility function to manually create the interface in any container
function createSocialAccountsInterface(containerId) {
    return new SocialAccountsManager(containerId);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialAccountsManager;
}