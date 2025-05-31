const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const OpenAI = require('openai');

class AudioService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.isRecording = false;
        this.recordingProcess = null;
        this.tempDir = path.join(__dirname, '../../temp');
        this.audioFile = path.join(this.tempDir, 'recording.wav');
        this.assistantModel = process.env.ASSISTANT_MODEL || 'gpt-4o-mini';
        
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async startRecording() {
        if (this.isRecording) {
            throw new Error('Already recording');
        }

        return new Promise((resolve, reject) => {
            try {
                let command, args;
                
                if (process.platform === 'darwin') {
                    // macOS - use sox (install via brew install sox)
                    command = 'sox';
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

            // Gracefully terminate the recording
            this.recordingProcess.kill('SIGTERM');
            
            // Force kill after 5 seconds if it doesn't respond
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

            console.log('Transcribing audio with OpenAI Whisper...');
            
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(audioFilePath),
                model: process.env.WHISPER_MODEL || 'whisper-1',
                language: 'en', // Can be made configurable
                response_format: 'text'
            });

            // Clean up the temporary audio file
            try {
                fs.unlinkSync(audioFilePath);
            } catch (cleanupError) {
                console.warn('Failed to clean up audio file:', cleanupError);
            }

            return transcription.trim();

        } catch (error) {
            console.error('Transcription error:', error);
            
            // Clean up file even on error
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
            console.log('Recording started...');
            
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
            console.log('Recording stopped, starting transcription...');
            
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
                    console.log('Assistant command detected:', command);
                    const assistantResponse = await this.processAssistantCommand(command);
                    if (this.transcribeCallback) {
                        // Pass a special object or prefix to distinguish assistant responses
                        this.transcribeCallback.resolve({ type: 'assistant', content: assistantResponse });
                        this.transcribeCallback = null;
                    }
                    return { type: 'assistant', content: assistantResponse };
                } else {
                    console.warn("'Hey Sun' or 'Hey Son' detected but no command followed.");
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
            this.recordingProcess.kill('SIGKILL');
            this.isRecording = false;
        }
    }

    async processAssistantCommand(command) {
        try {
            console.log(`Sending command to assistant (${this.assistantModel}):`, command);
            const completion = await this.openai.chat.completions.create({
                model: this.assistantModel,
                messages: [
                    { role: 'system', content: 'You are a helpful AI assistant integrated into a dictation tool. The user activated you with "Hey Sun". Please process the following command.' },
                    { role: 'user', content: command }
                ],
                max_tokens: 150, 
            });

            const response = completion.choices[0].message.content.trim();
            console.log('Assistant response:', response);
            return response;

        } catch (error) {
            console.error('Error processing assistant command:', error);
            // Ensure this re-throws an error or returns a meaningful error object/string
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