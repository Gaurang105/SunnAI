const { ipcRenderer } = require('electron');

class SettingsManager {
    constructor() {
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSettings();
    }

    bindEvents() {
        // Form submission
        const form = document.getElementById('settingsForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        cancelBtn.addEventListener('click', () => this.handleCancel());

        // API key visibility toggle
        const toggleBtn = document.getElementById('toggleApiKey');
        toggleBtn.addEventListener('click', () => this.toggleApiKeyVisibility());

        // API key input validation
        const apiKeyInput = document.getElementById('apiKey');
        apiKeyInput.addEventListener('input', (e) => this.validateApiKey(e.target.value));
        apiKeyInput.addEventListener('paste', (e) => {
            setTimeout(() => this.validateApiKey(e.target.value), 10);
        });
    }

    async loadSettings() {
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            
            if (settings.apiKey) {
                document.getElementById('apiKey').value = settings.apiKey;
                this.validateApiKey(settings.apiKey);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showStatus('Failed to load settings', 'error');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('apiKey').value.trim();
        
        if (!this.isValidApiKey(apiKey)) {
            this.showStatus('Please enter a valid OpenAI API key', 'error');
            return;
        }

        try {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const result = await ipcRenderer.invoke('save-settings', { apiKey });
            
            this.showStatus('Settings saved successfully', 'success');
            
            // Close window after a short delay
            setTimeout(() => {
                ipcRenderer.invoke('close-settings');
            }, 1500);

        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showStatus('Failed to save settings: ' + error.message, 'error');
        } finally {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }

    handleCancel() {
        ipcRenderer.invoke('close-settings');
    }

    toggleApiKeyVisibility() {
        const input = document.getElementById('apiKey');
        const icon = document.querySelector('.toggle-visibility .icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '🙈';
        } else {
            input.type = 'password';
            icon.textContent = '👁';
        }
    }

    validateApiKey(apiKey) {
        const saveBtn = document.getElementById('saveBtn');
        const isValid = this.isValidApiKey(apiKey);
        
        saveBtn.disabled = !isValid;
        
        if (apiKey && !isValid) {
            this.showApiKeyError('Invalid API key format');
        } else {
            this.clearApiKeyError();
        }
        
        return isValid;
    }

    isValidApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') return false;
        
        // OpenAI API keys start with "sk-" and have specific length requirements
        return apiKey.startsWith('sk-') && apiKey.length >= 20;
    }

    showApiKeyError(message) {
        const existingError = document.querySelector('.api-key-error');
        if (existingError) {
            existingError.remove();
        }

        const formGroup = document.querySelector('.form-group');
        const errorElement = document.createElement('p');
        errorElement.className = 'help-text api-key-error';
        errorElement.style.color = '#721c24';
        errorElement.textContent = message;
        
        formGroup.appendChild(errorElement);
    }

    clearApiKeyError() {
        const errorElement = document.querySelector('.api-key-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type} show`;
        
        setTimeout(() => {
            statusEl.className = 'status-message';
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});

// Handle window close request from main process
ipcRenderer.on('request-close', () => {
    window.close();
}); 