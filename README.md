# SunnAI

AI-powered speech-to-text application with intelligent assistant capabilities.

## ⚠️ Platform Requirements

**Currently supports ARM-based macOS only** (Apple Silicon M1/M2/M3 processors)

The application is optimized for Apple Silicon Macs using Homebrew paths specific to ARM architecture. Support for Intel Macs, Windows, and Linux will be added in future releases.

## Features

- **🎤 Real-time Speech-to-Text**: Convert speech to text using OpenAI Whisper with high accuracy
- **🤖 AI Assistant Integration**: Activate with "Hey Sun" or "Hey Son" to get AI-generated responses using GPT-4o-mini  
- **🖥️ Dynamic Overlay Interface**: Seamless floating overlay that integrates with any application
- **⚙️ Persistent Settings**: Encrypted configuration storage with user-friendly settings interface
- **🔄 Optimized Audio Recording**: Native audio recording for ARM-based macOS systems
- **🎯 System Tray Integration**: Convenient system tray access and controls
- **⌨️ Global Hotkey**: Quick activation with customizable keyboard shortcuts (`Cmd+H`)
- **🎨 Modern UI**: Clean, minimal interface with smooth animations and custom styling

## How It Works

### 📝 Dictation Mode
Simply press the global hotkey (`Cmd+H`) and speak normally. Your words will be transcribed and typed where your cursor is located.

### 🤖 Assistant Mode  
Press the hotkey and say "Hey Sun" or "Hey Son" followed by your request:
- "Hey Sun, write an email about the meeting tomorrow"
- "Hey Son, explain quantum computing in simple terms"
- "Hey Sun, create a shopping list for a dinner party"

The AI assistant will generate appropriate content and type it for you.

### 🎛️ Interface Elements
- **Floating Overlay**: Compact circular button that expands during use with visual feedback
- **System Tray**: Right-click for settings and controls
- **Settings Panel**: Configure API keys, models, and preferences with modern UI

## Prerequisites

- **ARM-based macOS** (Apple Silicon M1/M2/M3 processors)
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Audio Recording Dependencies**:
  - **sox**: Install via Homebrew: `brew install sox`
    - The app specifically looks for sox at `/opt/homebrew/bin/sox` (ARM Homebrew path)

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

3. **Install sox for audio recording:**
   ```bash
   brew install sox
   ```

4. **Configure your OpenAI API key:**
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
3. **Start Dictating**: Use the global hotkey (`Cmd+H`) and speak
4. **AI Assistant**: Use hotkey + "Hey Sun/Son + your command"

### Global Shortcuts

- **macOS**: `Cmd+H` - Start/stop recording

## Building for Distribution

Build the application for distribution:

```bash
# Build for current platform (ARM macOS)
npm run build

# ARM macOS specific build
npm run build:mac
```

Built applications will be available in the `dist/` directory.

## Project Structure

```
SunnAI/
├── src/
│   ├── main.js                    # Electron main process
│   ├── services/
│   │   ├── audioService.js        # Speech recording & OpenAI integration
│   │   ├── settingsService.js     # Configuration management
│   │   └── textInjectionService.js # Text input automation
│   └── renderer/
│       ├── overlay.html           # Floating overlay interface
│       ├── overlay.js             # Overlay functionality
│       ├── overlay.css            # Overlay styling
│       ├── settings.html          # Settings panel
│       ├── settings.js            # Settings management
│       └── settings.css           # Settings panel styling
├── assets/                        # Icons and resources
├── temp/                          # Temporary audio files (auto-created)
└── dist/                          # Built applications
```

## Technologies

- **Electron** - Cross-platform desktop framework
- **OpenAI API** - Whisper (speech-to-text) & GPT-4o-mini (AI assistant)
- **@hurdlegroup/robotjs** - System-level text injection for macOS
- **Electron Store** - Encrypted settings persistence
- **sox** - High-quality audio recording for ARM macOS

## Configuration Options

Access these through the Settings panel:

- **OpenAI API Key**: Your personal API key for OpenAI services
- **Whisper Model**: Speech recognition model (default: whisper-1)
- **Assistant Model**: AI assistant model (default: gpt-4o-mini)

## Audio Recording Details

The application uses `sox` for high-quality audio recording on ARM macOS:
- **Sample Rate**: 16kHz
- **Channels**: Mono (1 channel)
- **Bit Depth**: 16-bit
- **Format**: WAV
- **Path**: Uses system temp directory for audio files

## Troubleshooting

### Audio Recording Issues
- **Install sox**: Make sure sox is installed via Homebrew: `brew install sox`
- **ARM Homebrew Path**: The app looks for sox at `/opt/homebrew/bin/sox`
- **Microphone Permissions**: Grant microphone permissions when prompted by macOS

### API Key Issues
- Ensure your OpenAI API key starts with `sk-`
- Check your OpenAI account has sufficient credits
- Verify internet connectivity

### Permission Issues
- **macOS**: Grant microphone and accessibility permissions when prompted
- **Accessibility**: Required for global hotkeys and text injection

### Platform Compatibility
- **Current Support**: ARM-based macOS only (Apple Silicon M1/M2/M3)
- **Future Support**: Intel macOS, Windows, and Linux support planned

## Development Roadmap

- [ ] Intel macOS support
- [ ] Windows support  
- [ ] Linux support
- [ ] Additional audio input formats
- [ ] Customizable hotkeys
- [ ] Multiple language support

## License

MIT License - see LICENSE file for details