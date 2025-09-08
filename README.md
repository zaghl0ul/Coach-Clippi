# Coach Clippi - Advanced Slippi Melee Analysis & Coaching System

A high-performance native Windows application that provides real-time commentary and coaching for Super Smash Bros. Melee matches using AI models. Features direct game integration with zero-latency data access and comprehensive AI-powered analysis.

## 🏗️ Architecture Overview

Coach Clippi is built around a native C++ application that provides the ultimate Melee coaching experience:


<img width="1729" height="1104" alt="Screenshot 2025-09-08 121333" src="https://github.com/user-attachments/assets/3f0c5cc5-0165-4a36-9b8b-cc11cb946b45" />

### 🖥️ Native Windows Application (Primary)
- **C++ Native Application**: High-performance desktop application with embedded game window
- **DLL Injection**: Direct memory access to game data via `overlay.dll`
- **ImGui Interface**: Modern native UI with customizable panels and themes
- **Zero-Latency**: Direct game data access without file monitoring overhead
- **AI Integration**: Seamless integration with multiple AI providers for real-time commentary

### 🔧 Node.js Backend (Supporting)
- **AI Processing Engine**: Handles AI provider communication and processing
- **Configuration Management**: Manages settings and API keys
- **Data Processing**: Processes game events and generates insights
- **Local Server**: Provides AI services to the native application

## ✨ Key Features

### 🎮 Zero-Latency Game Integration
- **Direct Memory Access**: Real-time game data via DLL injection
- **Automatic Window Detection**: Finds and embeds Slippi/Dolphin windows seamlessly
- **Event Recognition**: Instant detection of combos, kills, techs, edgeguards, stock changes
- **Frame-Perfect Analysis**: Access to precise frame data and game state

### 🤖 AI-Powered Commentary
- **Multiple Providers**: OpenAI, Anthropic Claude, Google Gemini, Local LLM (LM Studio)
- **Configurable Detail**: Basic to professional commentary levels
- **Context-Aware**: Analyzes frame data, matchups, and game state in real-time
- **Live Generation**: Instant commentary as matches progress

### 🎯 Advanced Coaching
- **Character Matchups**: Personalized advice based on character selection
- **Focus Areas**: Neutral game, combo execution, edge guarding, recovery
- **Performance Metrics**: Real-time APM, combo tracking, damage analysis
- **Improvement Suggestions**: Specific recommendations for skill development

### 📊 Comprehensive Analysis
- **Live Statistics**: Real-time performance tracking with zero delay
- **Frame Data**: Technical analysis of move execution and timing
- **Match Insights**: Detailed breakdowns of gameplay decisions
- **Replay Analysis**: Upload and analyze existing .slp files

### 🎨 Native Interface
- **High-Performance UI**: ImGui-based desktop application with 90% less CPU usage
- **Embedded Game Window**: Seamless integration with Slippi/Dolphin
- **Customizable Panels**: Adjustable layout with stats, commentary, and tips
- **Modern Themes**: Dark theme with professional styling

## 🚀 Quick Start

### Prerequisites

- **Windows 10/11**
- **Visual Studio 2022** or **MinGW-w64** (for building)
- **Slippi Dolphin** or **Project Slippi**
- **Node.js 18+** (for AI backend services)
- **API Key** for your chosen AI provider (optional - can use local LLM)

### 🖥️ Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd Coach-Clippi
   npm install --legacy-peer-deps
   ```

2. **Configure AI services:**
   - Create `config.json` in the root directory
   - Add your configuration:
   ```json
   {
     "ai": {
       "apiKey": "your_api_key_here",
       "provider": "openai",
       "model": "gpt-4",
       "maxTokens": 1024,
       "temperature": 0.7
     },
     "slippi": {
       "replayPath": "auto-detect",
       "address": "127.0.0.1",
       "port": 2626
     }
   }
   ```

3. **Build the native application:**
   ```bash
   cd src/native-wrapper
   
   # Option 1: Using Visual Studio (Recommended)
   .\build.bat
   
   # Option 2: Using MinGW
   .\build-mingw.bat
   ```

4. **Start the AI backend:**
   ```bash
   # Start the AI processing server
   npm run start:webserver
   ```

5. **Launch the native application:**
   - Start Slippi Dolphin first
   - Run `build/bin/Release/CoachClippiWrapper.exe`
   - The application will automatically detect and embed the game window

### 🎮 Usage

1. **Launch Slippi Dolphin** and start a match
2. **Run CoachClippiWrapper.exe** - it will automatically:
   - Detect the Slippi window
   - Embed it in the center of the interface
   - Start monitoring game data via DLL injection
   - Display real-time stats and AI commentary

### 🔧 Alternative Start Methods

```bash
# Start AI backend only (for development)
npm run start:webserver

# Start with file monitoring (legacy)
npm start

# Enhanced coaching mode
npm run coach
```

## 📖 Usage Guide

### 🖥️ Native Application Usage

#### Starting the Application
1. **Launch Slippi Dolphin first**
2. **Start the AI backend:**
   ```bash
   npm run start:webserver
   ```

3. **Run the native application:**
   ```bash
   # From the build directory
   ./build/bin/Release/CoachClippiWrapper.exe
   ```

4. **Automatic Integration:**
   - App detects and embeds the game window
   - Real-time data access via DLL injection
   - Coaching panels surround the game

#### Interface Layout
- **Left Panel**: Live statistics (APM, combos, damage, stocks)
- **Right Panel**: AI commentary and contextual tips
- **Bottom Panel**: Controls, settings, and game information
- **Game Area**: Embedded Slippi window (center)

#### Real-Time Features
- **Instant Event Detection**: Combos, kills, techs, edgeguards
- **Live Statistics**: APM, damage dealt/taken, stock counts
- **AI Commentary**: Context-aware analysis of gameplay
- **Performance Metrics**: Frame data and timing analysis

#### Performance Benefits
- **90% less CPU usage** compared to browser-based solutions
- **Zero latency** game data access via direct memory
- **Better responsiveness** with native UI rendering
- **Lower memory footprint** without browser overhead

### 🔧 AI Backend Services

#### Configuration Management
- **Setup Wizard**: Web-based configuration at http://localhost:3000
- **API Key Management**: Secure storage and validation
- **Provider Selection**: Choose from multiple AI providers
- **Model Configuration**: Customize AI behavior and responses

#### AI Processing
- **Real-Time Analysis**: Process game events as they happen
- **Context-Aware Commentary**: Understands matchups and game state
- **Coaching Suggestions**: Personalized improvement recommendations
- **Frame Data Integration**: Technical analysis of move execution

## ⚙️ Configuration

### 🤖 AI Provider Setup

#### OpenAI
```json
{
  "ai": {
    "apiKey": "sk-your-openai-key-here",
    "provider": "openai",
    "model": "gpt-4",
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

#### Anthropic Claude
```json
{
  "ai": {
    "apiKey": "sk-ant-your-claude-key-here",
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229",
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

#### Google Gemini
```json
{
  "ai": {
    "apiKey": "your-gemini-api-key-here",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

#### Local LLM (LM Studio)
```json
{
  "ai": {
    "apiKey": "local",
    "provider": "lmstudio",
    "endpoint": "http://localhost:1234/v1",
    "model": "local-model",
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

### 🔧 Configuration Options

#### Complete Configuration Example
```json
{
  "ai": {
    "apiKey": "your-api-key-here",
    "provider": "openai",
    "model": "gpt-4",
    "maxTokens": 1024,
    "temperature": 0.7
  },
  "slippi": {
    "replayPath": "auto-detect",
    "address": "127.0.0.1",
    "port": 2626,
    "autoRetry": true,
    "maxRetries": 5
  },
  "logging": {
    "level": "info",
    "file": "slippi-coach.log",
    "console": true
  }
}
```

#### Environment Variables (Alternative)
```bash
# Server Configuration
PORT=3000

# AI Configuration
API_KEY=your-api-key-here
AI_PROVIDER=openai
AI_MODEL=gpt-4

# Slippi Configuration
SLIPPI_REPLAY_PATH=auto-detect
SLIPPI_ADDRESS=127.0.0.1
SLIPPI_PORT=2626
```

## 🔌 API Reference

### 🖥️ Native Application Communication

#### Named Pipes
- `\\.\pipe\CoachClippiOverlay` - Game data communication
- Real-time game state updates
- Event notifications (combos, kills, techs)

#### DLL Integration
- `overlay.dll` - Injected into game process
- Direct memory access to game data
- Zero-latency data transmission

### 🔧 AI Backend API Endpoints

#### Configuration
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration
- `POST /api/validate` - Validate configuration

#### AI Services
- `GET /api/commentary` - Commentary history
- `POST /api/commentary` - Generate new commentary
- `GET /api/coaching` - Coaching history
- `POST /api/coaching` - Generate coaching advice

#### File Management
- `POST /api/upload` - Upload replay files
- `GET /api/replays` - List available replays

### 🔌 WebSocket Events (AI Backend)

#### Connection Events
- `connection` - Client connected
- `disconnect` - Client disconnected

#### AI Events
- `commentary` - New commentary generated
- `coaching` - New coaching advice
- `newCommentary` - Commentary update
- `newCoaching` - Coaching update

### 🎮 Game Data Events

#### Real-Time Events
- `combo_start` - Combo sequence begins
- `combo_end` - Combo sequence ends
- `kill` - Stock taken
- `tech` - Tech situation detected
- `edgeguard` - Edgeguarding opportunity
- `stock_change` - Stock count changes
- `damage_update` - Damage percentage changes

## 🛠️ Development

### 📁 Project Structure
```
Coach-Clippi/
├── src/                           # Main source code
│   ├── native-wrapper/            # Native Windows application (PRIMARY)
│   │   ├── main.cpp               # Native app entry point
│   │   ├── CoachingInterface.cpp  # UI rendering and layout
│   │   ├── GameDataInterface.cpp  # DLL injection & communication
│   │   ├── WindowManager.cpp      # Window management
│   │   ├── CMakeLists.txt         # Build configuration
│   │   └── build.bat              # Build script
│   ├── webServer.js               # AI backend server
│   ├── enhancedCommentary.js      # AI commentary generation
│   ├── enhancedcoach.js           # AI coaching system
│   ├── liveCommentary.js          # Live commentary processing
│   ├── utils/                     # Utility modules
│   │   ├── configManager.js       # Configuration management
│   │   ├── llmProviders.js        # AI provider abstraction
│   │   ├── frameDataAnalyzer.js   # Frame data analysis
│   │   └── api/                   # API handlers
│   └── overlay/                   # Overlay integration
├── imgui-docking/                 # ImGui library (native UI)
├── build/                         # Build artifacts
├── bin/                           # Compiled executables
└── package.json                   # Node.js dependencies
```

### 🚀 Available Scripts

#### AI Backend Services
```bash
npm run start:webserver      # Start AI backend server
npm run coach               # Start enhanced coaching mode
npm run offline-coach       # Start offline coaching (no AI)
```

#### Native Application
```bash
# Build native application
cd src/native-wrapper
.\build.bat                  # Build with Visual Studio
.\build-mingw.bat           # Build with MinGW
```

### 🔧 Development Setup

#### Prerequisites
- **Node.js 18+**
- **Visual Studio 2022** or **MinGW-w64** (for native app)
- **Git**

#### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Coach-Clippi
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure development environment:**
   ```bash
   # Create development config
   cp config.example.json config.json
   # Edit config.json with your settings
   ```

4. **Build native components:**
   ```bash
   cd src/native-wrapper
   .\build.bat
   ```

### 🧪 Testing

#### AI Backend Testing
```bash
# Test AI backend server
npm run start:webserver

# Test coaching system
npm run coach

# Test offline mode
npm run offline-coach
```

#### Native App Testing
```bash
# Run debug build
cd src/native-wrapper/build/bin/Debug
./CoachClippiWrapper_d.exe

# Run release build
cd src/native-wrapper/build/bin/Release
./CoachClippiWrapper.exe
```

## 🔧 Troubleshooting

### 🔧 AI Backend Issues

#### Configuration Problems
1. **API key not configured:**
   - Check `config.json` file and ensure `ai.apiKey` is set
   - Verify API key is valid for your chosen provider
   - Test with `API_KEY=local` for local LLM usage

2. **Port already in use:**
   - Change port in `src/webServer.js` or kill existing processes
   - Use `netstat -ano | findstr :3000` to find processes using the port

3. **Configuration validation fails:**
   - Run `npm run start:webserver` and check the setup wizard
   - Verify all required fields are filled in `config.json`

#### AI Service Issues
4. **AI commentary not generating:**
   - Verify API key is valid and has sufficient credits
   - Check internet connection for external AI providers
   - Test with local LLM (LM Studio) as fallback

5. **Backend not responding:**
   - Ensure AI backend is running: `npm run start:webserver`
   - Check that the native app can connect to the backend
   - Verify the backend is accessible at http://localhost:3000

### 🖥️ Native Application Issues

#### Build Problems
6. **Visual Studio not found:**
   - Install Visual Studio Community 2022 (free)
   - Or use MinGW alternative: `.\build-mingw.bat`
   - Ensure C++ build tools are installed

7. **CMake not found:**
   - Install CMake from https://cmake.org/download/
   - Add CMake to your system PATH
   - Restart command prompt after installation

8. **Build errors:**
    - Clean build directory: `rmdir /s build`
    - Rebuild: `.\build.bat`
    - Check that all source files are present

#### Runtime Issues
9. **Game window not detected:**
    - Ensure Slippi Dolphin is running and visible
    - Check that window title contains "Slippi" or "Dolphin"
    - Verify window is not minimized

10. **DLL injection failed:**
    - Ensure `overlay.dll` is in the same directory as executable
    - Run as Administrator if needed
    - Check antivirus isn't blocking the DLL

11. **Communication issues:**
    - Verify named pipe `\\.\pipe\CoachClippiOverlay` is available
    - Check Windows Firewall settings
    - Ensure no other applications are using the same pipe

12. **AI backend connection failed:**
    - Ensure AI backend is running: `npm run start:webserver`
    - Check that both applications can communicate
    - Verify network connectivity between native app and backend

#### Performance Issues
13. **High CPU usage:**
    - Use Release build instead of Debug
    - Close unnecessary applications
    - Ensure adequate RAM (8GB+ recommended)

14. **Memory issues:**
    - Monitor memory usage in Task Manager
    - Restart application if memory usage grows too high
    - Check for memory leaks in development builds

### 🔍 Debugging Tips

#### Enable Debug Logging
```json
{
  "logging": {
    "level": "debug",
    "file": "slippi-coach.log",
    "console": true
  }
}
```

#### Check Log Files
- Web system: Check `slippi-coach.log` in project root
- Native app: Check console output and Windows Event Viewer

#### Test Individual Components
```bash
# Test AI backend server
npm run start:webserver

# Test coaching without AI
npm run offline-coach

# Test native application
cd src/native-wrapper/build/bin/Release
./CoachClippiWrapper.exe
```

## 🤝 Contributing

We welcome contributions to Coach Clippi! Here's how you can help:

### 🚀 Getting Started
1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly** (both web and native systems)
5. **Submit a pull request**

### 🎯 Areas for Contribution
- **AI Integration**: Add support for new AI providers
- **Game Analysis**: Improve frame data analysis and event detection
- **UI/UX**: Enhance the web interface or native UI
- **Performance**: Optimize monitoring and data processing
- **Documentation**: Improve setup guides and API documentation
- **Bug Fixes**: Fix issues and improve stability

### 🧪 Testing Your Changes
```bash
# Test AI backend
npm run start:webserver
npm run coach

# Test native application
cd src/native-wrapper
.\build.bat
.\build\bin\Release\CoachClippiWrapper.exe
```

### 📝 Code Style
- Follow existing code patterns
- Add comments for complex logic
- Update documentation for new features
- Ensure both native application and AI backend work together

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Getting Help
- **Check the troubleshooting section** above
- **Review the setup guides** in `src/native-wrapper/`
- **Open an issue** on GitHub with:
  - System information (OS, Node.js version)
  - Error messages and logs
  - Steps to reproduce the issue

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and community support
- **Wiki**: Additional documentation and guides

## 🎮 System Requirements

### Native Application (Primary)
- **Windows 10/11**
- **Visual Studio 2022** or **MinGW-w64** (for building)
- **8GB RAM** (recommended)
- **Slippi Dolphin** or **Project Slippi**
- **Administrator privileges** (for DLL injection)

### AI Backend Services
- **Node.js 18+**
- **8GB RAM** (recommended)
- **Internet connection** (for AI providers)
- **API key** for chosen AI provider

---

**Note:** This application requires Slippi Dolphin to be running for live monitoring features. Make sure you have the latest version of Slippi installed and configured properly. The native application provides superior performance with zero-latency game data access via DLL injection, while the AI backend handles all AI processing and commentary generation. 
