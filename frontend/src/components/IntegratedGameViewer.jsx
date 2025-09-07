import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { 
  Monitor,
  Maximize2,
  Minimize2,
  Settings,
  Camera,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Circle,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const IntegratedGameViewer = () => {
  const { socket, isConnected } = useSocket()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  
  const [viewerState, setViewerState] = useState({
    isCapturing: false,
    isFullscreen: false,
    isMuted: true,
    captureSource: null,
    availableSources: []
  })
  
  const [gameState, setGameState] = useState({
    player1: {
      character: 'Fox',
      stocks: 4,
      damage: 0,
      color: 'default'
    },
    player2: {
      character: 'Falco', 
      stocks: 4,
      damage: 0,
      color: 'default'
    },
    gameTime: 0,
    stage: 'Battlefield'
  })
  
  const [stats, setStats] = useState({
    apm: 0,
    combos: 0,
    edgeguards: 0,
    conversions: 0,
    model: 'GPT-4',
    sessionTime: '0:00'
  })
  
  const [commentary, setCommentary] = useState([])
  const [showSettings, setShowSettings] = useState(false)

  // Listen for game updates
  useEffect(() => {
    if (!socket) return

    const handleGameUpdate = (data) => {
      if (data.players) {
        setGameState(prev => ({
          ...prev,
          player1: {
            ...prev.player1,
            damage: Math.round(data.players[0]?.percent || 0),
            stocks: data.players[0]?.stocks || prev.player1.stocks
          },
          player2: {
            ...prev.player2,
            damage: Math.round(data.players[1]?.percent || 0),
            stocks: data.players[1]?.stocks || prev.player2.stocks
          }
        }))
      }
    }

    const handleCommentary = (data) => {
      const newComment = {
        id: Date.now() + Math.random(),
        text: data.commentary,
        type: data.eventType,
        timestamp: Date.now()
      }
      
      setCommentary(prev => {
        const updated = [newComment, ...prev].slice(0, 4) // Keep only 4 latest
        return updated
      })
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        setCommentary(prev => prev.filter(c => c.id !== newComment.id))
      }, 10000)
    }

    socket.on('slippi:liveUpdate', handleGameUpdate)
    socket.on('commentary:generated', handleCommentary)
    socket.on('slippi:gameStart', (data) => {
      setCommentary([]) // Clear old commentary
      toast.success('New game started!')
    })

    return () => {
      socket.off('slippi:liveUpdate', handleGameUpdate)
      socket.off('commentary:generated', handleCommentary)
      socket.off('slippi:gameStart')
    }
  }, [socket])

  // Request screen capture sources
  const getScreenSources = async () => {
    try {
      if (window.electron?.desktopCapturer) {
        const sources = await window.electron.desktopCapturer.getSources({
          types: ['window', 'screen'],
          fetchWindowIcons: true
        })
        
        const filteredSources = sources.filter(source => 
          source.name.toLowerCase().includes('dolphin') ||
          source.name.toLowerCase().includes('slippi') ||
          source.name.toLowerCase().includes('screen')
        )
        
        setViewerState(prev => ({ ...prev, availableSources: filteredSources }))
        return filteredSources
      }
    } catch (error) {
      console.error('Failed to get screen sources:', error)
      toast.error('Screen capture not available')
    }
  }

  // Start capturing selected window
  const startCapture = async (sourceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        },
        audio: false
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      setViewerState(prev => ({ 
        ...prev, 
        isCapturing: true,
        captureSource: sourceId 
      }))
      
      toast.success('Game capture started!')
    } catch (error) {
      console.error('Failed to start capture:', error)
      toast.error('Failed to start screen capture')
    }
  }

  // Stop capture
  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setViewerState(prev => ({ 
      ...prev, 
      isCapturing: false,
      captureSource: null 
    }))
    
    toast.success('Capture stopped')
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.getElementById('game-viewer-container')?.requestFullscreen()
      setViewerState(prev => ({ ...prev, isFullscreen: true }))
    } else {
      document.exitFullscreen()
      setViewerState(prev => ({ ...prev, isFullscreen: false }))
    }
  }

  // Stock display component
  const StockDisplay = ({ stocks, maxStocks = 4 }) => {
    return (
      <div className="flex space-x-1">
        {[...Array(maxStocks)].map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 ${
              i < stocks 
                ? 'bg-yellow-400 border-yellow-500' 
                : 'bg-gray-700 border-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  // Commentary bubble component
  const CommentaryBubble = ({ comment }) => {
    const getTypeColor = (type) => {
      switch(type) {
        case 'combo': return 'from-orange-500 to-red-500'
        case 'kill': return 'from-red-500 to-pink-500'
        case 'edgeguard': return 'from-blue-500 to-cyan-500'
        case 'tech': return 'from-green-500 to-emerald-500'
        default: return 'from-purple-500 to-indigo-500'
      }
    }

    return (
      <div className="commentary-bubble animate-slide-up">
        <div className={`bg-gradient-to-r ${getTypeColor(comment.type)} p-3 rounded-lg shadow-lg`}>
          <p className="text-white font-medium text-sm">{comment.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div id="game-viewer-container" className="bg-gray-900 min-h-screen flex flex-col">
      {/* Top Stats Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Monitor className="text-blue-400" size={20} />
              <span className="text-white font-bold">Game Viewer</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-gray-400">
                <span className="text-gray-500">Model:</span>
                <span className="text-blue-400 ml-1 font-medium">{stats.model}</span>
              </div>
              <div className="text-gray-400">
                <span className="text-gray-500">APM:</span>
                <span className="text-green-400 ml-1 font-medium">{stats.apm}</span>
              </div>
              <div className="text-gray-400">
                <span className="text-gray-500">Session:</span>
                <span className="text-yellow-400 ml-1 font-medium">{stats.sessionTime}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <Settings size={18} className="text-gray-400" />
            </button>
            
            <button
              onClick={() => setViewerState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {viewerState.isMuted ? 
                <VolumeX size={18} className="text-gray-400" /> : 
                <Volume2 size={18} className="text-gray-400" />
              }
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {viewerState.isFullscreen ? 
                <Minimize2 size={18} className="text-gray-400" /> : 
                <Maximize2 size={18} className="text-gray-400" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="space-y-3">
            <h3 className="text-white font-medium mb-2">Capture Settings</h3>
            
            {!viewerState.isCapturing ? (
              <div>
                <button
                  onClick={getScreenSources}
                  className="btn-primary mb-3"
                >
                  <Camera size={16} className="mr-2 inline" />
                  Scan for Game Windows
                </button>
                
                {viewerState.availableSources.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {viewerState.availableSources.map(source => (
                      <button
                        key={source.id}
                        onClick={() => startCapture(source.id)}
                        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors"
                      >
                        <p className="text-white font-medium truncate">{source.name}</p>
                        <p className="text-gray-400 text-xs">Click to capture</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={stopCapture}
                className="btn-danger"
              >
                <Square size={16} className="mr-2 inline" />
                Stop Capture
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Game Display Area */}
      <div className="flex-1 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {viewerState.isCapturing ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              muted={viewerState.isMuted}
              playsInline
            />
          ) : (
            <div className="text-center">
              <Monitor size={64} className="text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl text-gray-400 mb-2">No Game Capture Active</h2>
              <p className="text-gray-500 mb-4">Click settings to select a game window</p>
              <button
                onClick={() => setShowSettings(true)}
                className="btn-primary"
              >
                Start Capture
              </button>
            </div>
          )}
        </div>
        
        {/* Overlay canvas for future drawing features */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ display: 'none' }}
        />
      </div>

      {/* Player Stats Bar */}
      <div className="bg-gray-800 border-t border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase">Player 1</p>
              <p className="text-white font-bold">{gameState.player1.character}</p>
            </div>
            <div className="text-4xl font-bold text-white">
              {gameState.player1.damage}%
            </div>
            <StockDisplay stocks={gameState.player1.stocks} />
          </div>

          {/* VS indicator */}
          <div className="text-gray-500 font-bold text-xl">VS</div>

          {/* Player 2 */}
          <div className="flex items-center space-x-4">
            <StockDisplay stocks={gameState.player2.stocks} />
            <div className="text-4xl font-bold text-white">
              {gameState.player2.damage}%
            </div>
            <div className="text-left">
              <p className="text-gray-400 text-xs uppercase">Player 2</p>
              <p className="text-white font-bold">{gameState.player2.character}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commentary Section */}
      <div className="bg-gray-900 px-6 py-4 min-h-[120px]">
        <div className="flex flex-wrap gap-3 justify-center">
          {commentary.length > 0 ? (
            commentary.map(comment => (
              <CommentaryBubble key={comment.id} comment={comment} />
            ))
          ) : (
            <div className="text-center text-gray-500">
              <p className="text-sm">Commentary will appear here during gameplay</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IntegratedGameViewer
