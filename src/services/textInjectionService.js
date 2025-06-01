const robot = require('@hurdlegroup/robotjs');
const { clipboard } = require('electron');

class TextInjectionService {
    constructor() {
        // setXDisplayName is only needed on Linux
        if (process.platform === 'linux') {
            robot.setXDisplayName(process.env.DISPLAY || ':0.0');
        }
        robot.setKeyboardDelay(1);
    }

    async injectText(text) {
        if (!text || text.trim().length === 0) {
            throw new Error('No text to inject');
        }

        try {
            console.log('Injecting text:', text);
            
            await this.injectViaClipboard(text);
            
        } catch (clipboardError) {
            console.warn('Clipboard method failed, trying direct typing:', clipboardError);
            
            try {
                await this.injectViaTyping(text);
            } catch (typingError) {
                console.error('Both injection methods failed');
                throw new Error(`Text injection failed: ${typingError.message}`);
            }
        }
    }

    async injectViaClipboard(text) {
        return new Promise((resolve, reject) => {
            try {
                const previousClipboard = clipboard.readText();
                
                clipboard.writeText(text);
                
                setTimeout(() => {
                    try {
                        const modifier = process.platform === 'darwin' ? 'command' : 'control';
                        robot.keyTap('v', [modifier]);
                        
                        setTimeout(() => {
                            try {
                                clipboard.writeText(previousClipboard);
                                resolve();
                            } catch (restoreError) {
                                console.warn('Failed to restore clipboard:', restoreError);
                                resolve();
                            }
                        }, 500);
                        
                    } catch (pasteError) {
                        reject(pasteError);
                    }
                }, 100);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async injectViaTyping(text) {
        return new Promise((resolve, reject) => {
            try {
                const cleanText = this.cleanTextForTyping(text);
                
                const typeDelay = 10;
                
                let i = 0;
                const typeNextChar = () => {
                    if (i >= cleanText.length) {
                        resolve();
                        return;
                    }
                    
                    try {
                        const char = cleanText[i];
                        if (char === '\n') {
                            robot.keyTap('enter');
                        } else {
                            robot.typeString(char);
                        }
                        i++;
                        
                        if (i < cleanText.length) {
                            setTimeout(typeNextChar, typeDelay);
                        } else {
                            resolve();
                        }
                    } catch (charError) {
                        reject(charError);
                    }
                };
                
                typeNextChar();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    cleanTextForTyping(text) {
        // Remove or replace characters that might cause issues
        return text
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n')   // Convert Mac line endings
            .trim();
    }

    async simulateKeyPress(key, modifiers = []) {
        try {
            robot.keyTap(key, modifiers);
            return true;
        } catch (error) {
            console.error('Failed to simulate key press:', error);
            return false;
        }
    }

    async focusActiveApplication() {
        // This is a placeholder - getting the active application is platform-specific
        // For now, we'll assume the text field is already focused
        
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            return true;
        } catch (error) {
            console.error('Failed to focus active application:', error);
            return false;
        }
    }

    // Utility method to test if text injection is working
    async testInjection() {
        try {
            await this.injectText('Test message from SunnAI Dictation');
            return true;
        } catch (error) {
            console.error('Text injection test failed:', error);
            return false;
        }
    }

    // Method to inject text with cursor positioning
    async injectTextAtCursor(text, cursorPosition = 'end') {
        try {
            await this.injectText(text);
            
            if (cursorPosition === 'start') {
                for (let i = 0; i < text.length; i++) {
                    robot.keyTap('left');
                }
            } else if (cursorPosition === 'select') {
                for (let i = 0; i < text.length; i++) {
                    robot.keyTap('left', ['shift']);
                }
            }
            
        } catch (error) {
            throw error;
        }
    }

    // Method to replace selected text
    async replaceSelectedText(text) {
        try {
            robot.keyTap('delete');
            
            await this.injectText(text);
            
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TextInjectionService; 