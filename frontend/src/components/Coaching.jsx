import React, { useState, useEffect } from 'react'
import { GraduationCap, Send, History, Settings, Sparkles, Target, Users, TrendingUp } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const Coaching = () => {
  const [coachingHistory, setCoachingHistory] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [formData, setFormData] = useState({
    character: '',
    opponentCharacter: '',
    stage: '',
    matchData: '',
    focusAreas: [],
    detailLevel: 'advanced',
    maxTokens: 1500,
    temperature: 0.6
  })

  const characters = [
    'Fox', 'Falco', 'Marth', 'Sheik', 'Jigglypuff', 'Peach', 'Ice Climbers',
    'Captain Falcon', 'Pikachu', 'Samus', 'Dr. Mario', 'Yoshi', 'Luigi',
    'Ganondorf', 'Mario', 'Young Link', 'Donkey Kong', 'Link', 'Mr. Game & Watch',
    'Roy', 'Mewtwo', 'Zelda', 'Ness', 'Pichu', 'Bowser', 'Kirby'
  ]

  const stages = [
    'Final Destination', 'Battlefield', 'Yoshi\'s Story', 'Dream Land 64',
    'Pokemon Stadium', 'Fountain of Dreams', 'Corneria', 'Kongo Jungle 64'
  ]

  const focusAreas = [
    'Neutral Game', 'Combo Execution', 'Edge Guarding', 'Recovery',
    'Shield Pressure', 'Movement', 'Matchup Knowledge', 'Stage Control',
    'Punish Game', 'Defensive Play', 'Tech Skill', 'Mental Game'
  ]

  useEffect(() => {
    fetchCoachingHistory()
  }, [])

  const fetchCoachingHistory = async () => {
    try {
      const response = await axios.get('/api/coaching')
      setCoachingHistory(response.data.history || [])
    } catch (error) {
      console.error('Failed to fetch coaching history:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.character || !formData.matchData.trim()) {
      toast.error('Please select a character and provide match data')
      return
    }

    setIsGenerating(true)
    try {
      const response = await axios.post('/api/coaching', {
        matchData: {
          character: formData.character,
          opponentCharacter: formData.opponentCharacter,
          stage: formData.stage,
          description: formData.matchData,
          focusAreas: formData.focusAreas
        },
        options: {
          detailLevel: formData.detailLevel,
          maxTokens: formData.maxTokens,
          temperature: formData.temperature
        }
      })

      toast.success('Coaching advice generated successfully!')
      
      // Refresh history
      await fetchCoachingHistory()
      
      // Clear form
      setFormData(prev => ({ 
        ...prev, 
        matchData: '',
        focusAreas: []
      }))
      
    } catch (error) {
      console.error('Failed to generate coaching:', error)
      toast.error(error.response?.data?.error || 'Failed to generate coaching advice')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFocusAreaToggle = (area) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }))
  }

  const CoachingCard = ({ coaching, index }) => (
    <div className="card border-l-4 border-green-500 bg-green-900/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <GraduationCap size={20} className="text-green-400" />
          <div>
            <h3 className="font-semibold text-white">AI Coaching Advice</h3>
            <p className="text-sm text-gray-400">
              {new Date(coaching.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-500">#{index + 1}</span>
      </div>
      
      {coaching.matchData && (
        <div className="mb-3 p-3 bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Match Context:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
            <div>Character: <span className="text-white">{coaching.matchData.character}</span></div>
            {coaching.matchData.opponentCharacter && (
              <div>Opponent: <span className="text-white">{coaching.matchData.opponentCharacter}</span></div>
            )}
            {coaching.matchData.stage && (
              <div>Stage: <span className="text-white">{coaching.matchData.stage}</span></div>
            )}
          </div>
          {coaching.matchData.description && (
            <div className="mt-2">
              <p className="text-gray-300">{coaching.matchData.description}</p>
            </div>
          )}
          {coaching.matchData.focusAreas && coaching.matchData.focusAreas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {coaching.matchData.focusAreas.map(area => (
                <span key={area} className="px-2 py-1 bg-green-600 text-xs text-white rounded">
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="p-3 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Coaching Advice:</h4>
        <p className="text-gray-200 whitespace-pre-wrap">{coaching.coaching}</p>
      </div>
      
      {coaching.options && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
            Detail: {coaching.options.detailLevel}
          </span>
          <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
            Max Tokens: {coaching.options.maxTokens}
          </span>
          <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
            Temperature: {coaching.options.temperature}
          </span>
        </div>
      )}
    </div>
  )

  const CharacterSelector = ({ label, value, onChange, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full"
      >
        <option value="">{placeholder}</option>
        {characters.map(char => (
          <option key={char} value={char}>{char}</option>
        ))}
      </select>
    </div>
  )

  const FocusAreasSelector = () => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Focus Areas (Optional)
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {focusAreas.map(area => (
          <label key={area} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.focusAreas.includes(area)}
              onChange={() => handleFocusAreaToggle(area)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-300">{area}</span>
          </label>
        ))}
      </div>
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
          min="500"
          max="4000"
          step="100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Controls response length (500-4000)
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
          <h1 className="text-3xl font-bold text-white">AI Coaching</h1>
          <p className="text-gray-400 mt-2">
            Get personalized coaching advice to improve your Melee gameplay
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-green-400">
          <Sparkles size={20} />
          <span className="text-sm font-medium">Powered by AI</span>
        </div>
      </div>

      {/* Coaching Generator */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-4">Get Coaching Advice</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CharacterSelector
              label="Your Character *"
              value={formData.character}
              onChange={(value) => handleInputChange('character', value)}
              placeholder="Select your character"
            />
            <CharacterSelector
              label="Opponent Character"
              value={formData.opponentCharacter}
              onChange={(value) => handleInputChange('opponentCharacter', value)}
              placeholder="Select opponent character"
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => handleInputChange('stage', e.target.value)}
                className="input-field w-full"
              >
                <option value="">Select stage</option>
                {stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          <FocusAreasSelector />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Match Description *
            </label>
            <textarea
              value={formData.matchData}
              onChange={(e) => handleInputChange('matchData', e.target.value)}
              className="input-field w-full h-32 resize-none"
              placeholder="Describe your match, what went well, what you struggled with, specific situations you want advice on..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about your gameplay, decision-making, and areas you want to improve
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Detail Level
            </label>
            <select
              value={formData.detailLevel}
              onChange={(e) => handleInputChange('detailLevel', e.target.value)}
              className="input-field w-full"
            >
              <option value="basic">Basic - General tips</option>
              <option value="intermediate">Intermediate - Specific advice</option>
              <option value="advanced">Advanced - Technical details</option>
              <option value="professional">Professional - Expert analysis</option>
            </select>
          </div>

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
            disabled={isGenerating || !formData.character || !formData.matchData.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Coaching Advice...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Send size={16} />
                <span>Get Coaching Advice</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Coaching History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Coaching History</h2>
          <div className="flex items-center space-x-2">
            <History size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">
              {coachingHistory.length} sessions
            </span>
          </div>
        </div>
        
        {coachingHistory.length > 0 ? (
          <div className="space-y-4">
            {coachingHistory.map((coaching, index) => (
              <CoachingCard key={index} coaching={coaching} index={index} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <GraduationCap size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No coaching sessions yet</p>
            <p className="text-gray-500 text-sm">
              Get your first coaching advice using the form above
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Coaching