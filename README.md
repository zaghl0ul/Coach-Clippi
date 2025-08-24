# Slippi Coach - Real-time Melee Analysis & Coaching

A comprehensive application that provides real-time commentary and coaching for Super Smash Bros. Melee matches using AI models. Features include live monitoring, AI-powered commentary, personalized coaching advice, and replay analysis.

## Features

### 🎮 Live Monitoring
- Real-time connection to Slippi Dolphin for live match data
- Automatic event detection (combos, stock changes, game starts)
- Real-time AI commentary generation

### 🤖 AI Commentary
- Multiple AI providers: OpenAI, Anthropic Claude, Google Gemini, Local LLM
- Configurable detail levels (basic to professional)
- Context-aware commentary for gameplay events

### 🎯 AI Coaching
- Personalized coaching advice based on character matchups
- Focus area selection (neutral game, combo execution, edge guarding, etc.)
- Match-specific recommendations and improvement areas

### 📹 Replay Analysis
- Upload and analyze Slippi (.slp) replay files
- Detailed match statistics and insights
- Performance analysis and improvement suggestions

### ⚙️ Modern Web UI
- Responsive React-based frontend
- Real-time updates via WebSocket
- Dark theme with intuitive navigation
- Mobile-friendly design

## Quick Start

### Prerequisites
- Node.js 18+ 
- Slippi Dolphin with Netplay Setup
- API key for your chosen AI provider (optional - can use local LLM)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd slippi-coach
   npm install --legacy-peer-deps
   cd frontend && npm install
   ```

2. **Configure your API key:**
   - Copy `.env.example` to `.env`
   - Add your API key: `API_KEY=your_api_key_here`
   - Or set `API_KEY=local` for local LLM usage

3. **Start the application:**
   ```bash
   # Terminal 1: Start backend server
   npm run start:backend
   
   # Terminal 2: Start frontend (in frontend directory)
   cd frontend && npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - WebSocket: ws://localhost:3001

### Alternative: Combined Start
```bash
npm run dev  # Starts both backend and frontend simultaneously
```

## Usage

### Live Monitoring Setup
1. Open Slippi Dolphin and go to Netplay Setup
2. Select "Direct Connection" 
3. Enter address: `127.0.0.1` and port: `2626`
4. Click "Connect" in Dolphin
5. In the web UI, go to "Live Monitoring" and click "Start Monitoring"

### AI Commentary
1. Navigate to "Commentary" in the web UI
2. Enter gameplay events or scenarios to analyze
3. Select detail level and AI parameters
4. Generate commentary with AI insights

### AI Coaching
1. Go to "Coaching" section
2. Select your character and opponent character
3. Choose focus areas for improvement
4. Describe your match performance
5. Receive personalized coaching advice

### Replay Analysis
1. Navigate to "Replay Analysis"
2. Drag & drop .slp files or click to browse
3. Wait for analysis to complete
4. Review insights and recommendations

## Configuration

### AI Providers

#### OpenAI
```bash
API_KEY=sk-your-openai-key-here
```

#### Anthropic Claude
```bash
API_KEY=sk-ant-your-claude-key-here
```

#### Google Gemini
```bash
API_KEY=your-gemini-api-key-here
```

#### Local LLM (LM Studio)
```bash
API_KEY=local
LM_STUDIO_ENDPOINT=http://localhost:1234/v1
```

### Environment Variables
- `PORT`: Backend server port (default: 3001)
- `API_KEY`: Your AI provider API key
- `LM_STUDIO_ENDPOINT`: Local LLM endpoint (if using local LLM)

## API Endpoints

- `GET /api/status` - Server status and monitoring state
- `GET /api/commentary` - Commentary history
- `POST /api/commentary` - Generate new commentary
- `GET /api/coaching` - Coaching history
- `POST /api/coaching` - Generate coaching advice
- `POST /api/upload` - Upload replay files

## WebSocket Events

- `connectionStatus` - Connection status updates
- `liveMonitoringStatus` - Monitoring state changes
- `gameEvent` - Real-time game events
- `newCommentary` - New commentary generated
- `newCoaching` - New coaching advice

## Development

### Project Structure
```
├── src/                    # Backend source code
│   ├── webServer.js       # Express server with Socket.IO
│   ├── liveMonitor.js     # Slippi live monitoring
│   ├── enhancedCommentary.js # AI commentary generation
│   └── utils/             # Utility functions
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API services
│   └── dist/              # Built frontend files
└── package.json           # Backend dependencies
```

### Available Scripts
- `npm start` - Start backend server
- `npm run dev` - Start both backend and frontend
- `npm run start:backend` - Start only backend
- `npm run start:frontend` - Start only frontend
- `npm run build:frontend` - Build frontend for production

## Troubleshooting

### Common Issues

1. **Port already in use:**
   - Change port in `src/webServer.js` or kill existing processes

2. **API key not configured:**
   - Check `.env` file and ensure `API_KEY` is set

3. **Frontend build fails:**
   - Ensure all dependencies are installed: `cd frontend && npm install`

4. **Live monitoring not connecting:**
   - Verify Slippi Dolphin is running with correct netplay settings
   - Check firewall settings

5. **Socket.IO connection issues:**
   - Ensure backend is running on the port specified in frontend config
   - Check CORS settings if accessing from different domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section
- Review the AI integration documentation
- Open an issue on GitHub

---

**Note:** This application requires Slippi Dolphin to be running with netplay enabled for live monitoring features. Make sure you have the latest version of Slippi installed and configured properly."# Coach-Clippi" 
