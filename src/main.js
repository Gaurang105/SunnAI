const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
require('dotenv').config();

const AudioService = require('./services/audioService');
const TextInjectionService = require('./services/textInjectionService');

let overlayWindow;
let isRecording = false;
let isExpanded = false;
let audioService;
let textInjectionService;

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 42,
    height: 42,
    x: width - 62,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  overlayWindow.loadFile('src/renderer/overlay.html');
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools();
  }
}

function expandOverlay() {
  if (isExpanded) return;
  
  isExpanded = true;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  
  overlayWindow.setBounds({
    width: 300,
    height: 80,
    x: width - 320,
    y: 20
  }, true);
}

function collapseOverlay() {
  if (!isExpanded) return;
  
  isExpanded = false;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  
  overlayWindow.setBounds({
    width: 42,
    height: 42,
    x: width - 62,
    y: 20
  }, true);
}

app.whenReady().then(() => {
  audioService = new AudioService();
  textInjectionService = new TextInjectionService();
  
  createOverlayWindow();

  const hotkey = process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H';
  
  globalShortcut.register(hotkey, () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  app.on('window-all-closed', (e) => {
    e.preventDefault();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  
  if (audioService) {
    audioService.cleanup();
  }
});

ipcMain.handle('toggle-recording', async () => {
  if (isRecording) {
    await stopRecording();
  } else {
    await startRecording();
  }
});

ipcMain.handle('get-recording-state', () => {
  return isRecording;
});

async function startRecording() {
  if (isRecording) return;
  
  try {
    isRecording = true;
    expandOverlay();
    overlayWindow.webContents.send('recording-started');
    
    console.log('Starting audio recording...');
    await audioService.recordAndTranscribe();
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    isRecording = false;
    overlayWindow.webContents.send('recording-error', error.message);
  }
}

async function stopRecording() {
  if (!isRecording) return;
  
  try {
    console.log('Stopping recording and starting transcription...');
    overlayWindow.webContents.send('recording-stopped');
    
    const result = await audioService.finishRecordingAndTranscribe();
    
    let textToInject = null;
    let originalInputForDisplay = null;

    if (result && typeof result === 'object' && result.type === 'assistant') {
      console.log('Assistant response received in main.js:', result.content);
      textToInject = result.content;
      originalInputForDisplay = "Assistant: " + result.content;
    } else if (typeof result === 'string' && result.trim().length > 0) {
      console.log('Transcription completed:', result);
      textToInject = result;
      originalInputForDisplay = result;
    }

    if (textToInject) {
      setTimeout(async () => {
        try {
          await textInjectionService.injectText(textToInject);
          overlayWindow.webContents.send('transcription-complete', originalInputForDisplay);
          console.log('Text injected successfully');
        } catch (injectionError) {
          console.error('Text injection failed:', injectionError);
          overlayWindow.webContents.send('transcription-error', `Text injection failed: ${injectionError.message}`);
        }
      }, 1000);
      
    } else {
      console.warn('No text was transcribed or assistant returned empty');
      overlayWindow.webContents.send('transcription-error', 'No speech detected or transcription was empty');
    }
    
  } catch (error) {
    console.error('Recording/transcription failed:', error);
    overlayWindow.webContents.send('transcription-error', error.message);
  } finally {
    isRecording = false;
    
    setTimeout(() => {
      collapseOverlay();
    }, 2000);
  }
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createOverlayWindow();
  }
});

app.on('before-quit', () => {
  if (audioService) {
    audioService.cleanup();
  }
});

ipcMain.handle('test-text-injection', async () => {
  try {
    await textInjectionService.testInjection();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-audio-recording', async () => {
  try {
    return { success: true, message: 'Audio recording system is ready' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  if (audioService) {
    audioService.cleanup();
  }
  
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('system-error', error.message);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 