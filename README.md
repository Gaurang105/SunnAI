# SunnAI

AI-powered speech-to-text application with intelligent assistant capabilities.

## Features

- **🎤 Real-time Speech-to-Text**: Convert speech to text using OpenAI Whisper with high accuracy
- **🤖 AI Assistant Integration**: Activate with "Hey Sun" or "Hey Son" to get AI-generated responses using GPT-4o-mini  
- **🖥️ Dynamic Overlay Interface**: Seamless floating overlay that integrates with any application
- **⚙️ Persistent Settings**: Encrypted configuration storage with user-friendly settings interface
- **🔄 Cross-Platform Audio**: Optimized audio recording for macOS, Windows, and Linux
- **🎯 System Tray Integration**: Convenient system tray access and controls
- **⌨️ Global Hotkey**: Quick activation with customizable keyboard shortcuts
- **🎨 Modern UI**: Clean, minimal interface with smooth animations

## How It Works

### 📝 Dictation Mode
Simply press the global hotkey (`Cmd+H` on Mac, `Ctrl+H` on Windows/Linux) and speak normally. Your words will be transcribed and typed where your cursor is located.

### 🤖 Assistant Mode  
Press the hotkey and say "Hey Sun" or "Hey Son" followed by your request:
- "Hey Sun, write an email about the meeting tomorrow"
- "Hey Son, explain quantum computing in simple terms"
- "Hey Sun, create a shopping list for a dinner party"

The AI assistant will generate appropriate content and type it for you.

### 🎛️ Interface Elements
- **Floating Overlay**: Compact circular button that expands during use
- **System Tray**: Right-click for settings and controls
- **Settings Panel**: Configure API keys, models, and preferences

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Audio Recording Dependencies**:
  - macOS: `sox` (install via `brew install sox`)
  - Windows: `ffmpeg`
  - Linux: `arecord` (usually pre-installed)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd SunnAI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   npx electron-rebuild
   ```

3. **Configure your OpenAI API key:**
   - Start the application (it will prompt for API key on first run)
   - Or manually create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   WHISPER_MODEL=whisper-1
   ASSISTANT_MODEL=gpt-4o-mini
   ```

## Usage

### Starting the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### Using SunnAI

1. **First Time Setup**: The app will guide you through API key configuration
2. **Access Settings**: Right-click the system tray icon or double-click it
3. **Start Dictating**: Use the global hotkey (`Cmd+H` or `Ctrl+H`) and speak
4. **AI Assistant**: Use hotkey + "Hey Sun/Son + your command"

### Global Shortcuts

- **macOS**: `Cmd+H` - Start/stop recording
- **Windows/Linux**: `Ctrl+H` - Start/stop recording

## Building for Distribution

Build the application for distribution:

```bash
# Build for current platform
npm run build

# Platform-specific builds
npm run build:mac    # macOS (.dmg, .app)
npm run build:win    # Windows (.exe)
npm run build:linux  # Linux (.AppImage, .deb)
```

Built applications will be available in the `dist/` directory.

## Project Structure

```
SunnAI/
├── src/
│   ├── main.js                 # Electron main process
│   ├── services/
│   │   ├── audioService.js     # Speech recording & OpenAI integration
│   │   ├── settingsService.js  # Configuration management
│   │   └── textInjectionService.js # Text input automation
│   └── renderer/
│       ├── overlay.html        # Floating overlay interface
│       ├── overlay.js          # Overlay functionality
│       ├── settings.html       # Settings panel
│       └── settings.js         # Settings management
├── assets/                     # Icons and resources
├── temp/                       # Temporary audio files
└── dist/                       # Built applications
```

## Technologies

- **Electron** - Cross-platform desktop framework
- **OpenAI API** - Whisper (speech-to-text) & GPT-4o-mini (AI assistant)
- **RobotJS** - System-level text injection
- **Electron Store** - Encrypted settings persistence
- **Platform Audio Tools** - sox (macOS), ffmpeg (Windows), arecord (Linux)

## Configuration Options

Access these through the Settings panel:

- **OpenAI API Key**: Your personal API key for OpenAI services
- **Whisper Model**: Speech recognition model (default: whisper-1)
- **Assistant Model**: AI assistant model (default: gpt-4o-mini)

## Troubleshooting

### Audio Recording Issues
- **macOS**: Install sox with `brew install sox`
- **Windows**: Ensure ffmpeg is installed and in PATH
- **Linux**: Install arecord with your package manager

### API Key Issues
- Ensure your OpenAI API key starts with `sk-`
- Check your OpenAI account has sufficient credits
- Verify internet connectivity

### Permission Issues
- **macOS**: Grant microphone and accessibility permissions when prompted
- **Windows**: Run as administrator if needed for global hotkeys

## License

MIT License - see LICENSE file for details