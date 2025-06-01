const { ipcRenderer } = require('electron');

class OverlayUI {
    constructor() {
        this.compactState = document.getElementById('compact-state');
        this.expandedState = document.getElementById('expanded-state');
        this.micButton = document.getElementById('mic-button');
        this.statusMessage = document.getElementById('status-message');
        this.recordingIndicator = document.getElementById('recording-indicator');
        
        this.isRecording = false;
        this.isExpanded = false;
        
        this.initializeEventListeners();
        this.initializeIPC();
    }

    initializeEventListeners() {
        this.compactState.addEventListener('click', () => {
            this.expandOverlay();
        });

        this.micButton.addEventListener('click', () => {
            this.toggleRecording();
        });

        // Add right-click context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded && !this.isRecording) {
                this.collapseOverlay();
            }
        });

        document.addEventListener('click', (e) => {
            // Hide context menu if clicking elsewhere
            this.hideContextMenu();
            
            if (this.isExpanded && !this.isRecording && 
                !this.expandedState.contains(e.target)) {
                setTimeout(() => this.collapseOverlay(), 100);
            }
        });
    }

    initializeIPC() {
        ipcRenderer.on('recording-started', () => {
            this.setRecordingState(true);
        });

        ipcRenderer.on('recording-stopped', () => {
            this.setRecordingState(false);
        });

        ipcRenderer.on('transcription-complete', (event, text) => {
            this.showTranscriptionResult(text);
        });

        ipcRenderer.on('transcription-error', (event, error) => {
            this.showError(error);
        });
    }

    expandOverlay() {
        if (this.isExpanded) return;
        
        this.isExpanded = true;
        this.compactState.classList.remove('active');
        this.expandedState.classList.add('active');
        
        this.statusMessage.textContent = this.isRecording ? 'Recording...' : 'Click to start';
    }

    collapseOverlay() {
        if (!this.isExpanded || this.isRecording) return;
        
        this.isExpanded = false;
        this.expandedState.classList.remove('active');
        this.compactState.classList.add('active');
        
        this.micButton.classList.remove('processing', 'success');
        this.recordingIndicator.classList.remove('active');
    }

    async toggleRecording() {
        try {
            await ipcRenderer.invoke('toggle-recording');
        } catch (error) {
            console.error('Failed to toggle recording:', error);
            this.showError('Failed to toggle recording');
        }
    }

    setRecordingState(recording) {
        this.isRecording = recording;
        
        if (recording) {
            this.micButton.classList.add('recording');
            this.recordingIndicator.classList.add('active');
            this.statusMessage.textContent = 'Recording...';
            
            if (!this.isExpanded) {
                this.expandOverlay();
            }
        } else {
            this.micButton.classList.remove('recording');
            this.micButton.classList.add('processing');
            this.recordingIndicator.classList.remove('active');
            this.statusMessage.textContent = 'Processing...';
        }
    }

    showTranscriptionResult(text) {
        this.micButton.classList.remove('processing');
        this.micButton.classList.add('success');
        this.statusMessage.textContent = 'Text inserted!';
        
        setTimeout(() => {
            this.micButton.classList.remove('success');
            this.statusMessage.textContent = 'Click to start';
            
            setTimeout(() => {
                this.collapseOverlay();
            }, 500);
        }, 1000);
    }

    showError(error) {
        this.micButton.classList.remove('recording', 'processing');
        this.recordingIndicator.classList.remove('active');
        
        // Show more detailed error message for debugging
        const errorMsg = typeof error === 'string' ? error : error.message || 'Unknown error';
        this.statusMessage.textContent = `Error: ${errorMsg}`;
        
        console.error('Transcription error:', error);
        
        // Keep error message visible longer for debugging
        setTimeout(() => {
            this.statusMessage.textContent = 'Click to start';
        }, 5000);
    }

    showHoverEffect(element) {
        element.style.transform = 'scale(1.05)';
    }

    removeHoverEffect(element) {
        element.style.transform = 'scale(1)';
    }

    createContextMenu() {
        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 4px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 13px;
            min-width: 140px;
            display: none;
        `;

        const menuItems = [
            {
                label: 'Open Settings',
                action: () => this.openSettings()
            },
            {
                label: 'Show Recording Hotkey',
                action: () => this.showHotkeyInfo()
            },
            {
                label: 'Hide Overlay',
                action: () => this.hideOverlay()
            }
        ];

        menuItems.forEach((item, index) => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 6px 12px;
                cursor: pointer;
                transition: background-color 0.1s;
            `;
            menuItem.textContent = item.label;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideContextMenu();
                item.action();
            });
            
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);
        return menu;
    }

    showContextMenu(x, y) {
        this.hideContextMenu(); // Hide any existing menu
        
        const menu = this.createContextMenu();
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
        
        // Adjust position if menu would be off-screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (y - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        const existingMenu = document.getElementById('context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    async openSettings() {
        try {
            await ipcRenderer.invoke('open-settings');
        } catch (error) {
            console.error('Failed to open settings:', error);
        }
    }

    showHotkeyInfo() {
        const hotkey = process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H';
        const settingsHotkey = process.platform === 'darwin' ? 'Cmd+Shift+,' : 'Ctrl+Shift+,';
        this.statusMessage.textContent = `Hotkeys: ${hotkey} (record), ${settingsHotkey} (settings)`;
        
        setTimeout(() => {
            this.statusMessage.textContent = 'Click to start';
        }, 3000);
    }

    hideOverlay() {
        document.body.style.display = 'none';
        setTimeout(() => {
            document.body.style.display = 'block';
        }, 5000); // Show again after 5 seconds
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OverlayUI();
});

window.addEventListener('blur', () => {
    
});

window.addEventListener('focus', () => {
    
}); 