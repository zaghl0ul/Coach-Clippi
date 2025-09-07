import React, { useState, useEffect } from 'react'
import { useSocket } from '../hooks/useSocket'
import { 
  Play, 
  Square, 
  MessageSquare, 
  GraduationCap, 
  FileVideo, 
  Activity,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { 
    socket,
    isConnected, 
    connectionStatus, 
    startLiveMonitoring, 
    stopLiveMonitoring 
  } = useSocket()
  
  const [stats, setStats] = useState({
    commentaryCount: 0,
    coachingCount: 0,
    replayCount: 0
  })
  
  const [recentActivity, setRecentActivity] = useState([])
  const [isLoading, setIsLoading] = useState(false)
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

    socket.on('monitor:status', handleMonitorStatus)
    
    return () => {
      socket.off('monitor:status', handleMonitorStatus)
    }
  }, [socket])

  useEffect(() => {
    fetchStats()
    fetchRecentActivity()
  }, [])

  const fetchStats = async () => {
    try {
      const [commentaryRes, coachingRes] = await Promise.all([
        axios.get('/api/commentary'),
        axios.get('/api/coaching')
      ])
      
      setStats({
        commentaryCount: commentaryRes.data.count,
        coachingCount: coachingRes.data.count,
        replayCount: 0 // Will be implemented when replay API is ready
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const [commentaryRes, coachingRes] = await Promise.all([
        axios.get('/api/commentary'),
        axios.get('/api/coaching')
      ])
      
      const allActivity = [
        ...commentaryRes.data.history.map(item => ({
          ...item,
          type: 'commentary',
          icon: MessageSquare
        })),
        ...coachingRes.data.history.map(item => ({
          ...item,
          type: 'coaching',
          icon: GraduationCap
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      
      setRecentActivity(allActivity)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
    }
  }

  const handleStartMonitoring = async () => {
    setIsLoading(true)
    try {
      if (socket) {
        socket.emit('monitor:start', {})
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

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )

  const QuickActionCard = ({ title, description, icon: Icon, onClick, variant = 'primary' }) => (
    <div className="card hover:bg-gray-750 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${
          variant === 'primary' ? 'bg-primary-600' : 
          variant === 'secondary' ? 'bg-gray-600' : 'bg-green-600'
        }`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-2">
            Welcome to Slippi Coach - Your real-time Melee analysis companion
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isConnected ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Monitoring Control */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Live Monitoring</h2>
            <p className="text-gray-400 mt-1">
              {monitoringStatus.isMonitoring 
                ? `Monitoring: ${monitoringStatus.slippiPath || 'Slippi directory'}` 
                : 'Start monitoring live .slp files for real-time analysis'
              }
            </p>
          </div>
          
          <div className="flex space-x-3">
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
        
        {monitoringStatus.currentGame && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Current Game</h3>
            <div className="text-sm text-gray-400">
              <p><strong>File:</strong> {monitoringStatus.currentGame}</p>
              <p><strong>Status:</strong> Live monitoring active</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Commentary Generated"
          value={stats.commentaryCount}
          icon={MessageSquare}
          color="bg-blue-600"
        />
        <StatCard
          title="Coaching Sessions"
          value={stats.coachingCount}
          icon={GraduationCap}
          color="bg-green-600"
        />
        <StatCard
          title="Replays Analyzed"
          value={stats.replayCount}
          icon={FileVideo}
          color="bg-purple-600"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title="Upload Replay"
            description="Analyze a Slippi replay file"
            icon={FileVideo}
            onClick={() => window.location.href = '/replays'}
            variant="primary"
          />
          <QuickActionCard
            title="Generate Commentary"
            description="Create commentary for specific events"
            icon={MessageSquare}
            onClick={() => window.location.href = '/commentary'}
            variant="secondary"
          />
          <QuickActionCard
            title="Get Coaching"
            description="Receive personalized coaching advice"
            icon={GraduationCap}
            onClick={() => window.location.href = '/coaching'}
            variant="secondary"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="card">
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700">
                  <div className="p-2 rounded-lg bg-gray-600">
                    <activity.icon size={16} className="text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {activity.type === 'commentary' ? 'Commentary Generated' : 'Coaching Provided'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No recent activity</p>
              <p className="text-gray-500 text-sm">Start using the app to see activity here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
