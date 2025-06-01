const { ipcRenderer } = require('electron');

class OverlayUI {
    constructor() {
        this.compactState = document.getElementById('compact-state');
        this.expandedState = document.getElementById('expanded-state');
        this.micButton = document.getElementById('mic-button');
        this.statusMessage = document.getElementById('status-message');
        
        this.isRecording = false;
        this.isExpanded = false;
        
        this.initializeEventListeners();
        this.initializeIPC();
    }

    initializeEventListeners() {
        // Remove all click handlers - only hotkey functionality

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded && !this.isRecording) {
                this.collapseOverlay();
            }
        });

        document.addEventListener('click', (e) => {
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
            this.showError();
        });
    }

    expandOverlay() {
        if (this.isExpanded) return;
        
        this.isExpanded = true;
        this.compactState.classList.remove('active');
        this.expandedState.classList.add('active');
        
        this.statusMessage.textContent = this.isRecording ? 'Recording...' : 'Press ⌘H to start';
    }

    collapseOverlay() {
        if (!this.isExpanded || this.isRecording) return;
        
        this.isExpanded = false;
        this.expandedState.classList.remove('active');
        this.compactState.classList.add('active');
        
        this.micButton.classList.remove('processing', 'success');
    }

    setRecordingState(recording) {
        this.isRecording = recording;
        
        if (recording) {
            this.micButton.classList.add('recording');
            this.statusMessage.textContent = 'Recording...';
            
            if (!this.isExpanded) {
                this.expandOverlay();
            }
        } else {
            this.micButton.classList.remove('recording');
            this.micButton.classList.add('processing');
            this.statusMessage.textContent = 'Processing...';
        }
    }

    showTranscriptionResult(text) {
        this.micButton.classList.remove('processing');
        this.micButton.classList.add('success');
        this.statusMessage.textContent = 'Text inserted!';
        
        setTimeout(() => {
            this.micButton.classList.remove('success');
            this.statusMessage.textContent = 'Press ⌘H to start';
            
            setTimeout(() => {
                this.collapseOverlay();
            }, 500);
        }, 1000);
    }

    showError() {
        this.micButton.classList.remove('recording', 'processing');
        this.statusMessage.textContent = 'Error';
        
        setTimeout(() => {
            this.statusMessage.textContent = 'Press ⌘H to start';
            setTimeout(() => {
                this.collapseOverlay();
            }, 100);
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OverlayUI();
});

window.addEventListener('blur', () => {
    // Request position update when window loses focus (might indicate space change)
    setTimeout(() => {
        ipcRenderer.invoke('update-overlay-position').catch(console.error);
    }, 200);
});

window.addEventListener('focus', () => {
    // Request position update when window gains focus (might indicate space change)
    setTimeout(() => {
        ipcRenderer.invoke('update-overlay-position').catch(console.error);
    }, 200);
});

// Add visibility change listener for better space change detection
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // When the document becomes visible again, update position
        setTimeout(() => {
            ipcRenderer.invoke('update-overlay-position').catch(console.error);
        }, 300);
    }
});

// Add periodic position update for development mode
setInterval(() => {
    ipcRenderer.invoke('update-overlay-position').catch(console.error);
}, 2000); // Every 2 seconds 