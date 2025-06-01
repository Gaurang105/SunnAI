const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const OpenAI = require('openai');
const SettingsService = require('./settingsService');

class AudioService {
    constructor() {
        this.settingsService = new SettingsService();
        
        // Initialize OpenAI with API key from settings
        const apiKey = this.settingsService.getApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please set up your API key in settings.');
        }
        
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        
        this.isRecording = false;
        this.recordingProcess = null;
        
        // Use OS temp directory instead of trying to create inside app bundle
        this.tempDir = path.join(os.tmpdir(), 'sunnai');
        this.audioFile = path.join(this.tempDir, 'recording.wav');
        
        // Get models from settings
        const models = this.settingsService.getModels();
        this.assistantModel = models.assistant;
        this.whisperModel = models.whisper;
        
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(this.tempDir)) {
            try {
                fs.mkdirSync(this.tempDir, { recursive: true });
            } catch (error) {
                console.error('Failed to create temp directory:', error);
                throw new Error(`Failed to create temp directory: ${error.message}`);
            }
        }
    }

    // Method to update API key dynamically
    updateApiKey() {
        const apiKey = this.settingsService.getApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please set up your API key in settings.');
        }
        
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        
        // Update models as well
        const models = this.settingsService.getModels();
        this.assistantModel = models.assistant;
        this.whisperModel = models.whisper;
    }

    async startRecording() {
        if (this.isRecording) {
            throw new Error('Already recording');
        }

        return new Promise((resolve, reject) => {
            try {
                let command, args;
                
                if (process.platform === 'darwin') {
                    // macOS - use sox (try full paths for packaged app)
                    // Common paths where sox might be installed
                    const soxPaths = [
                        '/opt/homebrew/bin/sox',  // Apple Silicon Homebrew
                        '/usr/local/bin/sox',     // Intel Homebrew
                        'sox'                     // PATH fallback
                    ];
                    
                    command = soxPaths[0]; // Start with most likely path
                    for (const soxPath of soxPaths) {
                        try {
                            // Check if this path exists
                            if (soxPath !== 'sox') {
                                require('fs').accessSync(soxPath, require('fs').constants.F_OK);
                            }
                            command = soxPath;
                            break;
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    args = ['-d', '-r', '16000', '-c', '1', '-b', '16', this.audioFile];
                } else if (process.platform === 'win32') {
                    command = 'ffmpeg';
                    args = ['-f', 'dshow', '-i', 'audio="Microphone"', '-ar', '16000', '-ac', '1', this.audioFile];
                } else {
                    command = 'arecord';
                    args = ['-r', '16000', '-c', '1', '-f', 'S16_LE', this.audioFile];
                }

                this.recordingProcess = spawn(command, args);
                
                this.isRecording = true;

                this.recordingProcess.on('error', (error) => {
                    this.isRecording = false;
                    reject(new Error(`Recording failed: ${error.message}`));
                });

                this.recordingProcess.on('spawn', () => {
                });

                resolve();

            } catch (error) {
                reject(error);
            }
        });
    }

    async stopRecording() {
        if (!this.isRecording || !this.recordingProcess) {
            throw new Error('Not currently recording');
        }

        return new Promise((resolve, reject) => {
            this.recordingProcess.on('close', (code) => {
                this.isRecording = false;
                this.recordingProcess = null;
                
                if (code === 0 || code === null) {
                    resolve(this.audioFile);
                } else {
                    reject(new Error(`Recording process exited with code ${code}`));
                }
            });

            this.recordingProcess.kill('SIGTERM');
            
            setTimeout(() => {
                if (this.recordingProcess) {
                    this.recordingProcess.kill('SIGKILL');
                }
            }, 5000);
        });
    }

    async transcribeAudio(audioFilePath) {
        try {
            if (!fs.existsSync(audioFilePath)) {
                throw new Error('Audio file not found');
            }

            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(audioFilePath),
                model: this.whisperModel,
                language: 'en', // Can be made configurable
                response_format: 'text'
            });

            try {
                fs.unlinkSync(audioFilePath);
            } catch (cleanupError) {
                console.warn('Failed to clean up audio file:', cleanupError);
            }

            return transcription.trim();

        } catch (error) {
            try {
                if (fs.existsSync(audioFilePath)) {
                    fs.unlinkSync(audioFilePath);
                }
            } catch (cleanupError) {
                console.warn('Failed to clean up audio file after error:', cleanupError);
            }
            
            throw new Error(`Transcription failed: ${error.message}`);
        }
    }

    async recordAndTranscribe() {
        try {
            await this.startRecording();
            
            return new Promise((resolve, reject) => {
                this.transcribeCallback = { resolve, reject };
            });
            
        } catch (error) {
            throw error;
        }
    }

    async finishRecordingAndTranscribe() {
        try {
            const audioFilePath = await this.stopRecording();
            
            const transcribedText = await this.transcribeAudio(audioFilePath);

            // Check for activation phrase "Hey Sun" or "Hey Son"
            const lowerTranscribedText = transcribedText ? transcribedText.toLowerCase() : "";
            const isHeySun = lowerTranscribedText.startsWith('hey sun');
            const isHeySon = lowerTranscribedText.startsWith('hey son');

            if (transcribedText && (isHeySun || isHeySon)) {
                let command = "";
                if (isHeySun) {
                    command = transcribedText.substring('hey sun'.length).trim();
                } else if (isHeySon) {
                    command = transcribedText.substring('hey son'.length).trim();
                }
                
                if (command) {
                    const assistantResponse = await this.processAssistantCommand(command);
                    if (this.transcribeCallback) {
                        this.transcribeCallback.resolve({ type: 'assistant', content: assistantResponse });
                        this.transcribeCallback = null;
                    }
                    return { type: 'assistant', content: assistantResponse };
                } else {
                    if (this.transcribeCallback) {
                        this.transcribeCallback.resolve(transcribedText); 
                        this.transcribeCallback = null;
                    }
                    return transcribedText; 
                }
            } else {
                // Normal dictation
                if (this.transcribeCallback) {
                    this.transcribeCallback.resolve(transcribedText);
                    this.transcribeCallback = null;
                }
                return transcribedText;
            }
            
        } catch (error) {
            if (this.transcribeCallback) {
                this.transcribeCallback.reject(error);
                this.transcribeCallback = null;
            }
            throw error;
        } finally {
            if (this.recordingProcess) {
                this.recordingProcess.kill('SIGKILL');
            }
            this.isRecording = false;
        }
    }

    async processAssistantCommand(command) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: this.assistantModel,
                messages: [
                    { role: 'system', content: 'You are a helpful AI assistant integrated into a dictation tool. The user activated you with "Hey Sun". Provide only the specific content requested without any introductory text, explanations, or additional suggestions. For example, if asked to write an email, provide only the email content itself.' },
                    { role: 'user', content: command }
                ],
                max_tokens: 8000,
            });

            const response = completion.choices[0].message.content.trim();
            return response;

        } catch (error) {
            throw new Error(`Assistant command failed: ${error.message}`);
        }
    }

    cleanup() {
        if (this.isRecording && this.recordingProcess) {
            this.recordingProcess.kill('SIGKILL');
            this.isRecording = false;
        }
        
        // Clean up any remaining temp files
        try {
            if (fs.existsSync(this.audioFile)) {
                fs.unlinkSync(this.audioFile);
            }
        } catch (error) {
            console.warn('Failed to clean up audio file:', error);
        }
    }
}

module.exports = AudioService; 