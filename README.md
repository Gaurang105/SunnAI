# SunnAI Dictation

AI-powered dictation tool with intelligent assistant capabilities.

## Features

- **Real-time dictation**: Convert speech to text using OpenAI Whisper
- **AI Assistant**: Activate with "Hey Sun" or "Hey Son" to get AI-generated responses using GPT-4o-mini
- **Dynamic overlay**: Seamless integration with other applications
- **Dual functionality**: 
  - Normal speech → Direct transcription
  - "Hey Sun/Son + command" → AI-generated content

## How It Works

### Dictation Mode
Simply speak normally and your words will be transcribed and typed where your cursor is located.

### Assistant Mode  
Say "Hey Sun" or "Hey Son" followed by your request:
- "Hey Sun, write an email about the meeting tomorrow"
- "Hey Son, explain quantum computing in simple terms"
- "Hey Sun, create a shopping list for a dinner party"

The AI will generate appropriate content and type it for you.

## Prerequisites

- Node.js
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd sunn-ai-dictation
   ```
3. Install dependencies:
   ```bash
   npm install
   npx electron-rebuild
   ```

## Configuration

Create a `.env` file in the root of the project and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key
WHISPER_MODEL=whisper-1
ASSISTANT_MODEL=gpt-4o-mini
```

## Usage

To start the application:

```bash
npm start
```

To start in development mode:

```bash
npm run dev
```

## Building the Application

To build the application for your current platform:

```bash
npm run build
```

To build for specific platforms:

- macOS: `npm run build:mac`
- Windows: `npm run build:win`
- Linux: `npm run build:linux`

The built application will be located in the `dist` directory.

## Key Technologies

- Electron
- OpenAI (Whisper)
- RobotJS

## License

MIT 