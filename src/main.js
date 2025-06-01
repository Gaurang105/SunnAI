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

// Development mode detection
const isDev = process.argv.includes('--dev') || !app.isPackaged;

if (isDev) {
  console.log('Running in development mode');
}

function createDockMenu() {
  if (process.platform === 'darwin') {
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'Settings',
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
      }
    ]);
    app.dock.setMenu(dockMenu);
  }
}

function createTray() {
  try {
    // Use different icon paths for different platforms and environments
    let iconPath;
    
    if (app.isPackaged) {
      // In production (packaged app)
      iconPath = path.join(process.resourcesPath, 'assets', 'tray-icon.png');
    } else {
      // In development
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
    
    // On macOS, show both dock and tray icon for better accessibility
    if (process.platform === 'darwin') {
      // Show dock icon so users can right-click it for settings
      app.dock.show();
      // Create dock context menu
      createDockMenu();
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

  // Ensure correct position after creation
  overlayWindow.once('ready-to-show', () => {
    updateOverlayPosition();
  });

  // Add event listeners for position updates
  addOverlayEventListeners();

  // Dev tools removed from overlay to keep it clean and minimal
}

function expandOverlay() {
  if (isExpanded) return;
  
  isExpanded = true;
  updateOverlayPosition();
}

function collapseOverlay() {
  if (!isExpanded) return;
  
  isExpanded = false;
  updateOverlayPosition();
}

// Add screen change tracking
function updateOverlayPosition() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    if (isDev) console.log('Cannot update overlay position: window not available');
    return;
  }
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  
  const newBounds = isExpanded ? {
    width: 300,
    height: 80,
    x: width - 320,
    y: 20
  } : {
    width: 42,
    height: 42,
    x: width - 62,
    y: 20
  };
  
  if (isDev) {
    console.log('Updating overlay position:', {
      isExpanded,
      displayWidth: width,
      newBounds,
      currentBounds: overlayWindow.getBounds()
    });
  }
  
  overlayWindow.setBounds(newBounds, true);
  
  if (isDev) {
    console.log('Overlay position updated for display change');
  } else {
    console.log('Overlay position updated for display change');
  }
}

function setupScreenListeners() {
  console.log(`Setting up screen listeners (${isDev ? 'development' : 'production'} mode)`);
  
  // Listen for display changes
  screen.on('display-added', () => {
    console.log('Display added, updating overlay position');
    setTimeout(() => updateOverlayPosition(), isDev ? 200 : 100);
  });
  
  screen.on('display-removed', () => {
    console.log('Display removed, updating overlay position');
    setTimeout(() => updateOverlayPosition(), isDev ? 200 : 100);
  });
  
  screen.on('display-metrics-changed', () => {
    console.log('Display metrics changed, updating overlay position');
    setTimeout(() => updateOverlayPosition(), isDev ? 200 : 100);
  });
  
  // Enhanced tracking for primary display changes
  let lastPrimaryDisplay = screen.getPrimaryDisplay();
  let lastOverlayBounds = null;
  
  const checkDisplayAndPosition = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    
    const currentPrimaryDisplay = screen.getPrimaryDisplay();
    const currentBounds = overlayWindow.getBounds();
    
    // Check if primary display changed
    const displayChanged = currentPrimaryDisplay.id !== lastPrimaryDisplay.id || 
                          currentPrimaryDisplay.workAreaSize.width !== lastPrimaryDisplay.workAreaSize.width ||
                          currentPrimaryDisplay.workAreaSize.height !== lastPrimaryDisplay.workAreaSize.height;
    
    // Check if overlay position is outside current display bounds
    const { width: displayWidth, height: displayHeight } = currentPrimaryDisplay.workAreaSize;
    const isOutOfBounds = currentBounds.x > displayWidth || 
                         currentBounds.y > displayHeight ||
                         currentBounds.x < -currentBounds.width;
    
    // Check if overlay hasn't moved at all (might indicate it's stuck)
    const boundsUnchanged = lastOverlayBounds && 
                           currentBounds.x === lastOverlayBounds.x && 
                           currentBounds.y === lastOverlayBounds.y &&
                           displayChanged;
    
    if (displayChanged || isOutOfBounds || boundsUnchanged) {
      if (isDev) {
        console.log('Display or position change detected:', {
          displayChanged,
          isOutOfBounds,
          boundsUnchanged,
          currentBounds,
          displayWidth,
          displayHeight
        });
      } else {
        console.log('Display or position change detected, updating overlay position');
      }
      updateOverlayPosition();
      lastPrimaryDisplay = currentPrimaryDisplay;
    }
    
    lastOverlayBounds = { ...currentBounds };
  };
  
  // Check more frequently in development mode for better responsiveness
  const checkInterval = isDev ? 250 : 500;
  setInterval(checkDisplayAndPosition, checkInterval);
  
  // Also add app focus/blur listeners for macOS space changes
  app.on('browser-window-focus', () => {
    if (isDev) console.log('Browser window focused, updating overlay position');
    setTimeout(() => updateOverlayPosition(), isDev ? 150 : 100);
  });
  
  app.on('browser-window-blur', () => {
    if (isDev) console.log('Browser window blurred, updating overlay position');
    setTimeout(() => updateOverlayPosition(), isDev ? 150 : 100);
  });
  
  // Additional listener for app activation (important for dev mode)
  app.on('activate', () => {
    if (isDev) console.log('App activated, updating overlay position');
    setTimeout(() => updateOverlayPosition(), isDev ? 200 : 100);
  });
  
  console.log(`Screen listeners setup complete (check interval: ${checkInterval}ms)`);
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

  // Setup screen listeners with delay in development mode
  if (isDev) {
    console.log('Setting up screen listeners with development mode delay...');
    setTimeout(() => {
      setupScreenListeners();
    }, 1000);
  } else {
    setupScreenListeners();
  }
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

// Handler for overlay position update requests
ipcMain.handle('update-overlay-position', () => {
  updateOverlayPosition();
});

// Add focus event handling for the overlay to detect space changes
function addOverlayEventListeners() {
  if (overlayWindow) {
    overlayWindow.on('focus', () => {
      if (isDev) console.log('Overlay focused, updating position');
      setTimeout(() => updateOverlayPosition(), isDev ? 100 : 50);
    });
    
    overlayWindow.on('blur', () => {
      if (isDev) console.log('Overlay blurred');
    });
    
    overlayWindow.on('show', () => {
      if (isDev) console.log('Overlay shown, updating position');
      setTimeout(() => updateOverlayPosition(), isDev ? 100 : 50);
    });
    
    // Add move event listener for development debugging
    if (isDev) {
      overlayWindow.on('moved', () => {
        const bounds = overlayWindow.getBounds();
        console.log('Overlay moved to:', bounds);
      });
    }
  }
}

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