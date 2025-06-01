const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, dialog } = require('electron');
const path = require('path');
require('dotenv').config();

const AudioService = require('./services/audioService');
const TextInjectionService = require('./services/textInjectionService');
const SettingsService = require('./services/settingsService');

let overlayWindow;
let settingsWindow;
let tray;
let isRecording = false;
let isExpanded = false;
let audioService;
let textInjectionService;
let settingsService;

function createTray() {
  try {
    // Use different icon paths for different platforms
    let iconPath;
    if (process.platform === 'darwin') {
      // On macOS, use a smaller icon for the menu bar
      iconPath = path.join(__dirname, '../assets/tray-icon.png');
    } else {
      iconPath = path.join(__dirname, '../assets/tray-icon.png');
    }
    
    console.log('Creating tray with icon:', iconPath);
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Settings',
        click: () => openSettings()
      },
      {
        type: 'separator'
      },
      {
        label: 'Show Overlay',
        click: () => {
          if (overlayWindow) {
            overlayWindow.show();
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit SunnAI Dictation',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('SunnAI Dictation - Right-click for menu');
    tray.setContextMenu(contextMenu);
    
    // Handle click events
    tray.on('click', () => {
      // On Windows/Linux, left click opens settings
      if (process.platform !== 'darwin') {
        openSettings();
      }
    });
    
    // Open settings on double click (works on all platforms)
    tray.on('double-click', () => {
      openSettings();
    });
    
    // On macOS, make sure the app doesn't show in dock if user doesn't want it
    if (process.platform === 'darwin') {
      // Hide dock icon but keep tray icon
      app.dock.hide();
    }
    
    console.log('Tray created successfully');
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  settingsWindow.loadFile('src/renderer/settings.html');
  
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  
  // Dev tools completely removed for clean user experience
}

async function checkApiKeyAndShowSettings() {
  if (!settingsService.hasApiKey() || settingsService.isFirstRun()) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Welcome to SunnAI Dictation',
      message: 'API Key Required',
      detail: 'Please configure your OpenAI API key to start using SunnAI Dictation.',
      buttons: ['Open Settings', 'Quit'],
      defaultId: 0
    });
    
    if (result.response === 0) {
      openSettings();
      settingsService.setFirstRunComplete();
    } else {
      app.quit();
      return false;
    }
  }
  return true;
}

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

  // Dev tools removed from overlay to keep it clean and minimal
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

app.whenReady().then(async () => {
  settingsService = new SettingsService();
  textInjectionService = new TextInjectionService();
  
  // Create tray first
  createTray();
  
  // Check if API key is configured
  const hasValidSetup = await checkApiKeyAndShowSettings();
  
  if (hasValidSetup && settingsService.hasApiKey()) {
    try {
      audioService = new AudioService();
    } catch (error) {
      console.error('Failed to initialize AudioService:', error);
      // If API key is invalid, show settings again
      openSettings();
    }
  }
  
  createOverlayWindow();

  const hotkey = process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H';
  const settingsHotkey = process.platform === 'darwin' ? 'Cmd+Shift+,' : 'Ctrl+Shift+,';
  
  globalShortcut.register(hotkey, () => {
    if (!audioService) {
      dialog.showErrorBox('Configuration Required', 'Please configure your API key in settings first.');
      openSettings();
      return;
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  // Register settings shortcut
  globalShortcut.register(settingsHotkey, () => {
    openSettings();
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

// IPC Handlers for Settings
ipcMain.handle('get-settings', () => {
  return settingsService.getSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    settingsService.saveSettings(settings);
    
    // Reinitialize audio service with new settings
    if (settings.apiKey && audioService) {
      audioService.updateApiKey();
    } else if (settings.apiKey && !audioService) {
      audioService = new AudioService();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
});

ipcMain.handle('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

// Handler for overlay to open settings
ipcMain.handle('open-settings', () => {
  openSettings();
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