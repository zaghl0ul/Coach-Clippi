import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({
    liveMonitoring: false,
    currentGame: null,
    lastEvent: null,
    commentary: []
  })
  const socketRef = useRef(null)

  useEffect(() => {
    // Connect to backend Socket.IO server
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000'
    
    socketRef.current = io(serverUrl)

    // Connection event handlers
    socketRef.current.on('connect', () => {
      setIsConnected(true)
      console.log('✅ Connected to Slippi Coach backend')
    })

    socketRef.current.on('disconnect', () => {
      setIsConnected(false)
      console.log('❌ Disconnected from backend')
    })

    // Live monitoring events
    socketRef.current.on('slippi:gameStart', (data) => {
      setConnectionStatus(prev => ({
        ...prev,
        liveMonitoring: true,
        currentGame: data,
        lastEvent: { type: 'gameStart', data, timestamp: Date.now() }
      }))
    })

    socketRef.current.on('slippi:gameEnd', (data) => {
      setConnectionStatus(prev => ({
        ...prev,
        liveMonitoring: false,
        currentGame: null,
        lastEvent: { type: 'gameEnd', data, timestamp: Date.now() }
      }))
    })

    socketRef.current.on('slippi:combo', (data) => {
      setConnectionStatus(prev => ({
        ...prev,
        lastEvent: { type: 'combo', data, timestamp: Date.now() }
      }))
    })

    socketRef.current.on('slippi:death', (data) => {
      setConnectionStatus(prev => ({
        ...prev,
        lastEvent: { type: 'death', data, timestamp: Date.now() }
      }))
    })

    socketRef.current.on('slippi:stockChange', (data) => {
      setConnectionStatus(prev => ({
        ...prev,
        lastEvent: { type: 'stockChange', data, timestamp: Date.now() }
      }))
    })

    socketRef.current.on('commentary:generated', (data) => {
      setConnectionStatus(prev => ({
        ...prev,
        commentary: [...prev.commentary.slice(-9), {
          text: data.commentary,
          eventType: data.eventType,
          timestamp: Date.now()
        }]
      }))
    })

    // Connection status updates
    socketRef.current.on('monitor:status', (status) => {
      setConnectionStatus(prev => ({
        ...prev,
        liveMonitoring: status.isConnected
      }))
    })

    // Cleanup on unmount
    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  const startLiveMonitoring = () => {
    if (socketRef.current) {
      socketRef.current.emit('monitor:start')
      console.log('🚀 Requesting live monitoring start')
    }
  }

  const stopLiveMonitoring = () => {
    if (socketRef.current) {
      socketRef.current.emit('monitor:stop')
      console.log('🛑 Requesting live monitoring stop')
    }
  }

  const uploadReplay = (file) => {
    if (socketRef.current && file) {
      const formData = new FormData()
      formData.append('replay', file)
      
      // For file upload, we'll use a regular HTTP request to the backend
      fetch('/api/replay/upload', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        console.log('✅ Replay uploaded:', data)
        // Emit event to notify about successful upload
        socketRef.current.emit('replay:uploaded', data)
      })
      .catch(error => {
        console.error('❌ Replay upload failed:', error)
      })
    }
  }

  const value = {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    startLiveMonitoring,
    stopLiveMonitoring,
    uploadReplay
  }

  return React.createElement(SocketContext.Provider, { value }, children)
}
