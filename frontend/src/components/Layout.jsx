import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { 
  Home, 
  Radio, 
  MessageSquare, 
  GraduationCap, 
  FileVideo, 
  Settings, 
  Menu, 
  X,
  Wifi,
  WifiOff,
  Monitor
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Live Monitoring', href: '/live', icon: Radio },
  { name: 'Game Viewer', href: '/game-viewer', icon: Monitor },
  { name: 'Commentary', href: '/commentary', icon: MessageSquare },
  { name: 'Coaching', href: '/coaching', icon: GraduationCap },
  { name: 'Replay Analysis', href: '/replays', icon: FileVideo },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { isConnected } = useSocket()

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-gradient">Slippi Coach</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gray-800 border-r border-gray-700">
          <div className="flex items-center p-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-gradient">Slippi Coach</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          {/* Connection status */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi size={16} className="text-green-400" />
                  <span className="text-sm text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-red-400" />
                  <span className="text-sm text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-800 px-4 py-4 shadow-sm lg:hidden border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold text-gradient">Slippi Coach</h1>
          <div className="ml-auto">
            {isConnected ? (
              <Wifi size={20} className="text-green-400" />
            ) : (
              <WifiOff size={20} className="text-red-400" />
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
