import React, { useState, useEffect } from 'react'
import { MessageSquare, Send, History, Settings, Sparkles } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const Commentary = () => {
  const [commentaryHistory, setCommentaryHistory] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [formData, setFormData] = useState({
    events: '',
    detailLevel: 'advanced',
    maxTokens: 1024,
    temperature: 0.7
  })

  useEffect(() => {
    fetchCommentaryHistory()
  }, [])

  const fetchCommentaryHistory = async () => {
    try {
      const response = await axios.get('/api/commentary')
      setCommentaryHistory(response.data.history || [])
    } catch (error) {
      console.error('Failed to fetch commentary history:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.events.trim()) {
      toast.error('Please enter some events to analyze')
      return
    }

    setIsGenerating(true)
    try {
      const response = await axios.post('/api/commentary', {
        events: [formData.events],
        options: {
          detailLevel: formData.detailLevel,
          maxTokens: formData.maxTokens,
          temperature: formData.temperature
        }
      })

      toast.success('Commentary generated successfully!')
      
      // Refresh history
      await fetchCommentaryHistory()
      
      // Clear form
      setFormData(prev => ({ ...prev, events: '' }))
      
    } catch (error) {
      console.error('Failed to generate commentary:', error)
      toast.error(error.response?.data?.error || 'Failed to generate commentary')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const CommentaryCard = ({ commentary, index }) => (
    <div className="card border-l-4 border-blue-500 bg-blue-900/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <MessageSquare size={20} className="text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">AI Commentary</h3>
            <p className="text-sm text-gray-400">
              {new Date(commentary.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-500">#{index + 1}</span>
      </div>
      
      {commentary.events && (
        <div className="mb-3 p-3 bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Events Analyzed:</h4>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
            {Array.isArray(commentary.events) ? commentary.events.join('\n') : commentary.events}
          </pre>
        </div>
      )}
      
      <div className="p-3 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Generated Commentary:</h4>
        <p className="text-gray-200 whitespace-pre-wrap">{commentary.commentary}</p>
      </div>
      
      {commentary.options && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
            Detail: {commentary.options.detailLevel}
          </span>
          <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
            Max Tokens: {commentary.options.maxTokens}
          </span>
          <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
            Temperature: {commentary.options.temperature}
          </span>
        </div>
      )}
    </div>
  )

  const DetailLevelSelector = () => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Detail Level
      </label>
      <select
        value={formData.detailLevel}
        onChange={(e) => handleInputChange('detailLevel', e.target.value)}
        className="input-field w-full"
      >
        <option value="basic">Basic - Simple observations</option>
        <option value="intermediate">Intermediate - Technical details</option>
        <option value="advanced">Advanced - Frame data & strategy</option>
        <option value="professional">Professional - Expert analysis</option>
      </select>
    </div>
  )

  const AdvancedOptions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Tokens
        </label>
        <input
          type="number"
          value={formData.maxTokens}
          onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
          className="input-field w-full"
          min="100"
          max="4000"
          step="100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Controls response length (100-4000)
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Temperature
        </label>
        <input
          type="number"
          value={formData.temperature}
          onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
          className="input-field w-full"
          min="0"
          max="2"
          step="0.1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Controls creativity (0.0-2.0)
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Commentary</h1>
          <p className="text-gray-400 mt-2">
            Generate intelligent commentary for Melee gameplay events and scenarios
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-blue-400">
          <Sparkles size={20} />
          <span className="text-sm font-medium">Powered by AI</span>
        </div>
      </div>

      {/* Commentary Generator */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-4">Generate Commentary</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Events to Analyze
            </label>
            <textarea
              value={formData.events}
              onChange={(e) => handleInputChange('events', e.target.value)}
              className="input-field w-full h-32 resize-none"
              placeholder="Describe the gameplay events, combos, or scenarios you want analyzed. Be as detailed as possible for better commentary."
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: "Player 1 performed a 0-to-death combo with Fox using up-throw to up-air", 
              "Marth edge-guarded with forward-smash at 120% damage"
            </p>
          </div>

          <DetailLevelSelector />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-secondary"
            >
              <Settings size={16} className="mr-2" />
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          {showAdvanced && <AdvancedOptions />}

          <button
            type="submit"
            disabled={isGenerating || !formData.events.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Commentary...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Send size={16} />
                <span>Generate Commentary</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Commentary History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Commentary History</h2>
          <div className="flex items-center space-x-2">
            <History size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">
              {commentaryHistory.length} entries
            </span>
          </div>
        </div>
        
        {commentaryHistory.length > 0 ? (
          <div className="space-y-4">
            {commentaryHistory.map((commentary, index) => (
              <CommentaryCard key={index} commentary={commentary} index={index} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <MessageSquare size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No commentary generated yet</p>
            <p className="text-gray-500 text-sm">
              Generate your first commentary using the form above
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Commentary