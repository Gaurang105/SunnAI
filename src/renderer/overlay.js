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
        this.statusMessage.textContent = 'Error occurred';
        
        console.error('Transcription error:', error);
        
        setTimeout(() => {
            this.statusMessage.textContent = 'Click to start';
        }, 2000);
    }

    showHoverEffect(element) {
        element.style.transform = 'scale(1.05)';
    }

    removeHoverEffect(element) {
        element.style.transform = 'scale(1)';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OverlayUI();
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('blur', () => {
    
});

window.addEventListener('focus', () => {
    
}); 