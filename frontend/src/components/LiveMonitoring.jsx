import React, { useState, useEffect } from 'react'
import { useSocket } from '../hooks/useSocket'
import { 
  Play, 
  Square, 
  Settings, 
  Activity, 
  MessageSquare,
  Wifi,
  WifiOff,
  AlertCircle,
  Folder,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

const LiveMonitoring = () => {
  const { 
    socket,
    isConnected, 
    connectionStatus, 
    startLiveMonitoring, 
    stopLiveMonitoring 
  } = useSocket()
  
  const [monitoringConfig, setMonitoringConfig] = useState({
    slippiPath: ''
  })
  
  const [gameEvents, setGameEvents] = useState([])
  const [commentary, setCommentary] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [monitoringStatus, setMonitoringStatus] = useState({
    isMonitoring: false,
    slippiPath: null,
    currentGame: null
  })

  useEffect(() => {
    if (!socket) return

    // Listen for monitoring status updates
    const handleMonitorStatus = (status) => {
      setMonitoringStatus(prev => ({
        ...prev,
        isMonitoring: status.isConnected,
        slippiPath: status.slippiPath,
        currentGame: status.currentGame
      }))
    }

    // Listen for Slippi game events
    const handleGameStart = (data) => {
      // Clear previous commentary when new game starts
      setCommentary([])
      
      const event = {
        type: 'gameStart',
        data,
        timestamp: new Date().toISOString()
      }
      setGameEvents(prev => [event, ...prev.slice(0, 99)])
      toast.success(`🎮 New game started: ${data.fileName}`)
    }

    const handleGameEnd = (data) => {
      const event = {
        type: 'gameEnd',
        data,
        timestamp: new Date().toISOString()
      }
      setGameEvents(prev => [event, ...prev.slice(0, 99)])
      toast.success('🏁 Game completed')
    }

    const handleHit = (data) => {
      // Only add to events if showing all events
      if (showAllEvents) {
        const event = {
          type: 'hit',
          data,
          timestamp: new Date().toISOString()
        }
        setGameEvents(prev => [event, ...prev.slice(0, 99)])
      }
    }

    const handleCombo = (data) => {
      // Only add to events if showing all events
      if (showAllEvents) {
        const event = {
          type: 'combo',
          data,
          timestamp: new Date().toISOString()
        }
        setGameEvents(prev => [event, ...prev.slice(0, 99)])
      }
    }

    const handleStockChange = (data) => {
      // Only add to events if showing all events
      if (showAllEvents) {
        const event = {
          type: 'stockChange',
          data,
          timestamp: new Date().toISOString()
        }
        setGameEvents(prev => [event, ...prev.slice(0, 99)])
      }
    }

    const handleLiveUpdate = (data) => {
      // Update current game info without adding to events feed
      setMonitoringStatus(prev => ({
        ...prev,
        currentGame: prev.currentGame ? {
          ...prev.currentGame,
          frameCount: data.frameCount,
          gameTime: data.gameTime
        } : null
      }))
    }

    const handleCommentary = (data) => {
      const commentaryEntry = {
        text: data.commentary,
        eventType: data.eventType,
        commentaryType: data.commentaryType || 'single', // 'fast', 'analytical', or 'single'
        timestamp: data.timestamp,
        id: Date.now() + Math.random()
      }
      setCommentary(prev => [commentaryEntry, ...prev.slice(0, 49)]) // Keep last 50 commentary entries
      
      // Also add to events if showing all events
      if (showAllEvents) {
        const event = {
          type: 'commentary',
          data: {
            commentary: data.commentary,
            eventType: data.eventType,
            commentaryType: data.commentaryType
          },
          timestamp: data.timestamp
        }
        setGameEvents(prev => [event, ...prev.slice(0, 99)])
      }
    }

    const handleError = (error) => {
      toast.error(error.message || 'Monitoring error occurred')
    }

    // Register event listeners
    socket.on('monitor:status', handleMonitorStatus)
    socket.on('slippi:gameStart', handleGameStart)
    socket.on('slippi:gameEnd', handleGameEnd)
    socket.on('slippi:hit', handleHit)
    socket.on('slippi:combo', handleCombo)
    socket.on('slippi:stockChange', handleStockChange)
    socket.on('slippi:liveUpdate', handleLiveUpdate)
    socket.on('commentary:generated', handleCommentary)
    socket.on('error', handleError)

    // Cleanup
    return () => {
      socket.off('monitor:status', handleMonitorStatus)
      socket.off('slippi:gameStart', handleGameStart)
      socket.off('slippi:gameEnd', handleGameEnd)
      socket.off('slippi:hit', handleHit)
      socket.off('slippi:combo', handleCombo)
      socket.off('slippi:stockChange', handleStockChange)
      socket.off('slippi:liveUpdate', handleLiveUpdate)
      socket.off('commentary:generated', handleCommentary)
      socket.off('error', handleError)
    }
  }, [socket])

  const handleStartMonitoring = async () => {
    setIsLoading(true)
    try {
      if (socket) {
        socket.emit('monitor:start', { 
          slippiPath: monitoringConfig.slippiPath || null 
        })
        toast.success('Starting live .slp monitoring...')
      }
    } catch (error) {
      toast.error('Failed to start monitoring')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopMonitoring = () => {
    if (socket) {
      socket.emit('monitor:stop')
      toast.success('Stopped live monitoring')
    }
  }

  const handlePathChange = (path) => {
    setMonitoringConfig(prev => ({ ...prev, slippiPath: path }))
    if (socket && path) {
      socket.emit('monitor:setPath', { slippiPath: path })
    }
  }

  const CommentaryCard = ({ comment, index }) => {
    const getEventTypeColor = (eventType, commentaryType) => {
      if (commentaryType === 'fast') {
        switch (eventType) {
          case 'hit':
            return 'border-l-yellow-400 bg-yellow-900/15'
          case 'combo':
            return 'border-l-orange-400 bg-orange-900/15'
          case 'stockChange':
            return 'border-l-red-400 bg-red-900/15'
          case 'gameStart':
            return 'border-l-green-400 bg-green-900/15'
          case 'gameEnd':
            return 'border-l-purple-400 bg-purple-900/15'
          default:
            return 'border-l-blue-400 bg-blue-900/15'
        }
      } else if (commentaryType === 'analytical') {
        switch (eventType) {
          case 'hit':
            return 'border-l-yellow-600 bg-yellow-900/20'
          case 'combo':
            return 'border-l-orange-600 bg-orange-900/20'
          case 'stockChange':
            return 'border-l-red-600 bg-red-900/20'
          case 'gameStart':
            return 'border-l-green-600 bg-green-900/20'
          case 'gameEnd':
            return 'border-l-purple-600 bg-purple-900/20'
          default:
            return 'border-l-indigo-600 bg-indigo-900/20'
        }
      } else {
        return 'border-l-blue-500 bg-blue-900/10'
      }
    }

    const getEventTypeIcon = (eventType) => {
      switch (eventType) {
        case 'hit':
          return '👊'
        case 'combo':
          return '🔥'
        case 'stockChange':
          return '💀'
        case 'gameStart':
          return '🎮'
        case 'gameEnd':
          return '🏁'
        default:
          return '🗣️'
      }
    }

    const getCommentaryTypeInfo = (commentaryType) => {
      switch (commentaryType) {
        case 'fast':
          return { name: 'Play-by-Play', icon: '⚡', bgColor: 'bg-blue-600' }
        case 'analytical':
          return { name: 'Analysis', icon: '🧠', bgColor: 'bg-indigo-600' }
        default:
          return { name: 'Commentary', icon: '🗣️', bgColor: 'bg-blue-600' }
      }
    }

    const typeInfo = getCommentaryTypeInfo(comment.commentaryType)

    return (
      <div className={`card border-l-4 ${getEventTypeColor(comment.eventType, comment.commentaryType)}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-full ${typeInfo.bgColor} flex items-center justify-center`}>
              <span className="text-lg">{typeInfo.icon}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getEventTypeIcon(comment.eventType)}</span>
                <p className="text-sm font-medium text-blue-400">
                  {typeInfo.name}
                </p>
                <span className="text-xs text-gray-500 capitalize">
                  {comment.eventType === 'stockChange' ? 'Stock Lost' : comment.eventType}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(comment.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <p className={`leading-relaxed ${
              comment.commentaryType === 'analytical' 
                ? 'text-gray-100 text-base' 
                : 'text-gray-200 text-lg font-medium'
            }`}>
              {comment.text}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const EventCard = ({ event, index }) => {
    const getEventIcon = (type) => {
      switch (type) {
        case 'combo':
          return '🔥'
        case 'hit':
          return '👊'
        case 'stockChange':
          return '💀'
        case 'gameStart':
          return '🎮'
        case 'gameEnd':
          return '🏁'
        case 'commentary':
          return '🗣️'
        default:
          return '📊'
      }
    }

    const getEventColor = (type) => {
      switch (type) {
        case 'combo':
          return 'border-orange-500 bg-orange-900/20'
        case 'hit':
          return 'border-yellow-500 bg-yellow-900/20'
        case 'stockChange':
          return 'border-red-500 bg-red-900/20'
        case 'gameStart':
          return 'border-green-500 bg-green-900/20'
        case 'gameEnd':
          return 'border-purple-500 bg-purple-900/20'
        case 'commentary':
          return 'border-blue-500 bg-blue-900/20'
        default:
          return 'border-gray-500 bg-gray-900/20'
      }
    }

    const getEventTitle = (type) => {
      switch (type) {
        case 'stockChange':
          return 'Stock Change'
        case 'gameStart':
          return 'Game Started'
        case 'gameEnd':
          return 'Game Ended'
        case 'commentary':
          return 'AI Commentary'
        default:
          return type.charAt(0).toUpperCase() + type.slice(1)
      }
    }

    if (event.type === 'commentary') {
      return (
        <div className={`card border-l-4 ${getEventColor(event.type)}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare size={20} className="text-blue-400" />
              <div>
                <h3 className="font-semibold text-white">AI Commentary</h3>
                <p className="text-sm text-gray-400">
                  {event.data?.eventType} • {new Date(event.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500">#{index + 1}</span>
          </div>
          
          <div className="mt-3 p-3 bg-gray-700 rounded-lg">
            <p className="text-gray-200">{event.data?.commentary}</p>
          </div>
        </div>
      )
    }

    return (
      <div className={`card border-l-4 ${getEventColor(event.type)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getEventIcon(event.type)}</span>
            <div>
              <h3 className="font-semibold text-white">
                {getEventTitle(event.type)}
              </h3>
              <p className="text-sm text-gray-400">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-500">#{index + 1}</span>
        </div>
        
        {event.data && Object.keys(event.data).length > 0 && (
          <div className="mt-3 p-3 bg-gray-700 rounded-lg">
            <pre className="text-xs text-gray-300 overflow-x-auto">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Monitoring</h1>
          <p className="text-gray-400 mt-2">
            Monitor live Slippi files and receive real-time commentary
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isConnected ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
          }`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Monitoring Control */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Live .slp Monitoring</h2>
            <p className="text-gray-400 mt-1">
              {monitoringStatus.isMonitoring 
                ? `Monitoring: ${monitoringStatus.slippiPath}` 
                : 'Start monitoring live .slp files'
              }
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="btn-secondary"
            >
              <Settings size={16} className="mr-2" />
              {showConfig ? 'Hide Config' : 'Show Config'}
            </button>
            
            {!monitoringStatus.isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                disabled={!isConnected || isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Play size={16} />
                    <span>Start Monitoring</span>
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={handleStopMonitoring}
                className="btn-danger"
              >
                <div className="flex items-center space-x-2">
                  <Square size={16} />
                  <span>Stop Monitoring</span>
                </div>
              </button>
            )}
          </div>
        </div>
        
        {/* Configuration Panel */}
        {showConfig && (
          <div className="p-4 bg-gray-700 rounded-lg space-y-4">
            <h3 className="text-lg font-medium text-white">Monitoring Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Folder size={16} className="inline mr-2" />
                Slippi Directory Path (Optional)
              </label>
              <input
                type="text"
                value={monitoringConfig.slippiPath}
                onChange={(e) => handlePathChange(e.target.value)}
                className="input-field w-full"
                placeholder="Leave empty for auto-detection"
              />
              <p className="text-xs text-gray-400 mt-1">
                Custom path to your Slippi replay directory. If empty, the system will auto-detect.
              </p>
            </div>
            
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <FileText size={16} className="text-green-400 mt-0.5" />
                <div className="text-sm text-green-300">
                  <p className="font-medium">How it works:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>System monitors your Slippi directory for new .slp files</li>
                    <li>When you start a match, a new .slp file is created</li>
                    <li>Real-time analysis begins immediately as frames are written</li>
                    <li>Works with online, offline, and training mode</li>
                  </ol>
                </div>
              </div>
            </div>
            
            {monitoringStatus.slippiPath && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  <strong>Current Directory:</strong> {monitoringStatus.slippiPath}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Current Status */}
        {monitoringStatus.currentGame && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Current Game</h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p><strong>File:</strong> {monitoringStatus.currentGame}</p>
              {monitoringStatus.currentGame.frameCount && (
                <p><strong>Frames:</strong> {monitoringStatus.currentGame.frameCount}</p>
              )}
              {monitoringStatus.currentGame.gameTime && (
                <p><strong>Game Time:</strong> {Math.floor(monitoringStatus.currentGame.gameTime / 1000)}s</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Commentary Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Live Commentary</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MessageSquare size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {commentary.length} comments
              </span>
            </div>
            <button
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="btn-secondary text-xs"
            >
              {showAllEvents ? 'Hide Technical' : 'Show Technical'}
            </button>
          </div>
        </div>
        
        {commentary.length > 0 ? (
          <div className="space-y-3">
            {commentary.map((comment, index) => (
              <CommentaryCard key={comment.id} comment={comment} index={index} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <MessageSquare size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No commentary yet</p>
            <p className="text-gray-500 text-sm">
              {monitoringStatus.isMonitoring 
                ? 'Waiting for gameplay events to generate commentary...' 
                : 'Start monitoring and play a match to see live commentary here'
              }
            </p>
          </div>
        )}
      </div>

      {/* Technical Events (Optional) */}
      {showAllEvents && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Technical Events</h2>
            <div className="flex items-center space-x-2">
              <Activity size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {gameEvents.length} events
              </span>
            </div>
          </div>
          
          {gameEvents.length > 0 ? (
            <div className="space-y-4">
              {gameEvents.map((event, index) => (
                <EventCard key={index} event={event} index={index} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Activity size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No technical events yet</p>
              <p className="text-gray-500 text-sm">
                Technical events will appear here when enabled
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LiveMonitoring
