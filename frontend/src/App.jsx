import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SocketProvider } from './hooks/useSocket'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import LiveMonitoring from './components/LiveMonitoring'
import Commentary from './components/Commentary'
import Coaching from './components/Coaching'
import ReplayAnalysis from './components/ReplayAnalysis'
import Settings from './components/Settings'
import IntegratedGameViewer from './components/IntegratedGameViewer'

function App() {
  return (
    <SocketProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveMonitoring />} />
            <Route path="/game-viewer" element={<IntegratedGameViewer />} />
            <Route path="/commentary" element={<Commentary />} />
            <Route path="/coaching" element={<Coaching />} />
            <Route path="/replays" element={<ReplayAnalysis />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </SocketProvider>
  )
}

export default App
