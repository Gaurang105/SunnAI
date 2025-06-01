const Store = require('electron-store');
const path = require('path');

class SettingsService {
    constructor() {
        this.store = new Store({
            name: 'sunnai-settings',
            encryptionKey: 'sunnai-settings-key',
            schema: {
                apiKey: {
                    type: 'string',
                    default: ''
                },
                whisperModel: {
                    type: 'string',
                    default: 'whisper-1'
                },
                assistantModel: {
                    type: 'string',
                    default: 'gpt-4o-mini'
                },
                firstRun: {
                    type: 'boolean',
                    default: true
                }
            }
        });
    }

    // Get all settings
    getSettings() {
        return {
            apiKey: this.store.get('apiKey', ''),
            whisperModel: this.store.get('whisperModel', 'whisper-1'),
            assistantModel: this.store.get('assistantModel', 'gpt-4o-mini'),
            firstRun: this.store.get('firstRun', true)
        };
    }

    // Save settings
    saveSettings(settings) {
        if (settings.apiKey !== undefined) {
            this.store.set('apiKey', settings.apiKey);
        }
        if (settings.whisperModel !== undefined) {
            this.store.set('whisperModel', settings.whisperModel);
        }
        if (settings.assistantModel !== undefined) {
            this.store.set('assistantModel', settings.assistantModel);
        }
        if (settings.firstRun !== undefined) {
            this.store.set('firstRun', settings.firstRun);
        }
    }

    // Get API key for services
    getApiKey() {
        return this.store.get('apiKey', '');
    }

    // Check if API key is configured
    hasApiKey() {
        const apiKey = this.getApiKey();
        return apiKey && apiKey.length > 0 && apiKey.startsWith('sk-');
    }

    // Get model configurations
    getModels() {
        return {
            whisper: this.store.get('whisperModel', 'whisper-1'),
            assistant: this.store.get('assistantModel', 'gpt-4o-mini')
        };
    }

    // Check if this is the first run
    isFirstRun() {
        return this.store.get('firstRun', true);
    }

    // Mark as no longer first run
    setFirstRunComplete() {
        this.store.set('firstRun', false);
    }

    // Clear all settings (for testing or reset)
    clearSettings() {
        this.store.clear();
    }

    // Get the store path for debugging
    getStorePath() {
        return this.store.path;
    }
}

module.exports = SettingsService; 