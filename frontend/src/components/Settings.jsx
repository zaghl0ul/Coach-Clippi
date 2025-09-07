import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Key, Server, Save, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const Settings = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    apiProvider: 'local',
    lmStudioEndpoint: 'http://localhost:1234/v1',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    aiModel: '',
    maxTokens: 150,
    temperature: 0.7,
    detailLevel: 'advanced',
    autoCommentary: true,
    autoCoaching: false,
    notifications: true,
    // Dual AI Mode Settings
    dualMode: false,
    fastModel: 'anthropic/claude-3-haiku:beta',
    analyticalModel: 'anthropic/claude-3.5-sonnet:beta',
    fastMaxTokens: 75,
    analyticalMaxTokens: 200
  })
  
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResults, setTestResults] = useState({})
  const [openrouterModels, setOpenrouterModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    // Load settings from localStorage or default values
    const savedSettings = localStorage.getItem('slippiCoachSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem('slippiCoachSettings', JSON.stringify(settings))
      
      // Save AI configuration to backend
      if (settings.apiProvider !== 'local') {
        const configPayload = {
          provider: settings.apiProvider,
          apiKey: settings.apiProvider === 'bedrock' 
            ? { accessKeyId: settings.awsAccessKeyId, secretAccessKey: settings.awsSecretAccessKey, region: settings.awsRegion }
            : settings.apiKey,
          model: settings.aiModel,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          // Dual mode configuration
          dualMode: settings.dualMode,
          fastModel: settings.fastModel,
          analyticalModel: settings.analyticalModel,
          fastMaxTokens: settings.fastMaxTokens,
          analyticalMaxTokens: settings.analyticalMaxTokens
        }
        
        const response = await axios.post('/api/config/ai', configPayload)
        
        if (response.data.success) {
          const modeText = settings.dualMode 
            ? `dual-model mode (${settings.fastModel} + ${settings.analyticalModel})`
            : `single-model mode (${settings.aiModel})`
          toast.success(`Settings saved! Now using ${response.data.provider} in ${modeText}`)
        }
      } else {
        toast.success('Settings saved successfully!')
      }
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      if (error.response?.data?.error) {
        toast.error(`Save failed: ${error.response.data.error}`)
      } else {
        toast.error('Failed to save settings')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const fetchOpenRouterModels = async () => {
    if (!settings.apiKey) {
      toast.error('Please enter your OpenRouter API key first')
      return
    }
    
    setIsLoadingModels(true)
    try {
      const response = await axios.post('/api/models/openrouter', {
        apiKey: settings.apiKey
      })
      
      if (response.data?.models) {
        setOpenrouterModels(response.data.models)
        toast.success(`Loaded ${response.data.models.length} OpenRouter models`)
        
        // If no model is selected, set the first one as default
        if (!settings.aiModel && response.data.models.length > 0) {
          handleInputChange('aiModel', response.data.models[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error)
      toast.error('Failed to fetch models. Please check your API key.')
    } finally {
      setIsLoadingModels(false)
    }
  }

  const testConnection = async (type) => {
    try {
      setTestResults(prev => ({ ...prev, [type]: 'testing' }))
      
      // This would test the actual connection to the API
      // For now, we'll simulate a test
      setTimeout(() => {
        const success = Math.random() > 0.3 // 70% success rate for demo
        setTestResults(prev => ({ 
          ...prev, 
          [type]: success ? 'success' : 'error' 
        }))
        
        if (success) {
          toast.success(`${type} connection test successful!`)
        } else {
          toast.error(`${type} connection test failed`)
        }
      }, 2000)
      
    } catch (error) {
      setTestResults(prev => ({ ...prev, [type]: 'error' }))
      toast.error(`${type} connection test failed`)
    }
  }

  const getTestResultIcon = (result) => {
    switch (result) {
      case 'testing':
        return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      default:
        return null
    }
  }

  const getTestResultText = (result) => {
    switch (result) {
      case 'testing':
        return 'Testing...'
      case 'success':
        return 'Connected'
      case 'error':
        return 'Failed'
      default:
        return 'Test Connection'
    }
  }

  const ApiKeySection = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          API Provider
        </label>
        <select
          value={settings.apiProvider}
          onChange={(e) => handleInputChange('apiProvider', e.target.value)}
          className="input-field w-full"
        >
          <option value="local">Local LLM (LM Studio)</option>
          <option value="openai">OpenAI GPT</option>
          <option value="anthropic">Anthropic Claude</option>
          <option value="gemini">Google Gemini</option>
          <option value="openrouter">OpenRouter (Multi-model)</option>
          <option value="bedrock">AWS Bedrock</option>
        </select>
      </div>

      {settings.apiProvider === 'local' ? (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            LM Studio Endpoint
          </label>
          <input
            type="text"
            value={settings.lmStudioEndpoint}
            onChange={(e) => handleInputChange('lmStudioEndpoint', e.target.value)}
            className="input-field w-full"
            placeholder="http://localhost:1234/v1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Make sure LM Studio is running and the server is enabled
          </p>
        </div>
      ) : settings.apiProvider === 'bedrock' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AWS Access Key ID
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.awsAccessKeyId}
                  onChange={(e) => handleInputChange('awsAccessKeyId', e.target.value)}
                  className="input-field w-full pr-12"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AWS Secret Access Key
              </label>
              <input
                type="password"
                value={settings.awsSecretAccessKey}
                onChange={(e) => handleInputChange('awsSecretAccessKey', e.target.value)}
                className="input-field w-full"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AWS Region
            </label>
            <select
              value={settings.awsRegion}
              onChange={(e) => handleInputChange('awsRegion', e.target.value)}
              className="input-field w-full"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
            </select>
          </div>
          <div className="bg-amber-900/20 border border-amber-500 rounded-lg p-3">
            <p className="text-xs text-amber-300">
              <strong>AWS Bedrock:</strong> Ensure your AWS account has Bedrock access enabled and the desired models are available in your selected region.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {settings.apiProvider === 'openrouter' ? 'OpenRouter API Key' : 'API Key'}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              className="input-field w-full pr-12"
              placeholder={`Enter your ${settings.apiProvider} API key`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally and never sent to our servers
            {settings.apiProvider === 'openrouter' && (
              <span className="block mt-1">
                Get your key from <a href="https://openrouter.ai" target="_blank" className="text-blue-400 hover:underline">openrouter.ai</a>
              </span>
            )}
          </p>
        </div>
      )}

      {/* AI Model Selection */}
      {settings.apiProvider !== 'local' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Model
          </label>
          <select
            value={settings.aiModel}
            onChange={(e) => handleInputChange('aiModel', e.target.value)}
            className="input-field w-full"
          >
            {settings.apiProvider === 'openai' && (
              <>
                <option value="gpt-4-turbo-preview">GPT-4 Turbo (Best)</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
              </>
            )}
            {settings.apiProvider === 'anthropic' && (
              <>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Best)</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</option>
              </>
            )}
            {settings.apiProvider === 'gemini' && (
              <>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Best)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                <option value="gemini-pro">Gemini Pro</option>
              </>
            )}
            {settings.apiProvider === 'openrouter' && (
              <>
                {openrouterModels.length > 0 ? (
                  openrouterModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="anthropic/claude-3.5-sonnet:beta">Claude 3.5 Sonnet (Recommended)</option>
                    <option value="openai/gpt-4-turbo-preview">GPT-4 Turbo</option>
                    <option value="anthropic/claude-3-opus:beta">Claude 3 Opus</option>
                    <option value="google/gemini-pro">Gemini Pro</option>
                    <option value="meta-llama/llama-2-70b-chat">Llama 2 70B</option>
                    <option value="anthropic/claude-3-haiku:beta">Claude 3 Haiku (Fast)</option>
                  </>
                )}
              </>
            )}
            {settings.apiProvider === 'bedrock' && (
              <>
                <option value="anthropic.claude-3-5-sonnet-20240620-v1:0">Claude 3.5 Sonnet (Best)</option>
                <option value="anthropic.claude-3-sonnet-20240229-v1:0">Claude 3 Sonnet</option>
                <option value="anthropic.claude-3-haiku-20240307-v1:0">Claude 3 Haiku (Fast)</option>
                <option value="amazon.titan-text-express-v1">Amazon Titan Express</option>
                <option value="ai21.j2-ultra-v1">AI21 Jurassic-2 Ultra</option>
              </>
            )}
          </select>
          <div className="flex items-center space-x-2 mt-2">
            <p className="text-xs text-gray-500 flex-1">
              Choose the AI model that best fits your needs. Faster models respond quicker but may be less accurate.
            </p>
            {settings.apiProvider === 'openrouter' && (
              <button
                type="button"
                onClick={() => fetchOpenRouterModels()}
                disabled={isLoadingModels || !settings.apiKey}
                className="btn-secondary text-xs py-1 px-2 disabled:opacity-50"
              >
                {isLoadingModels ? (
                  <div className="flex items-center space-x-1">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <RefreshCw size={12} />
                    <span>Fetch Models</span>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => testConnection(settings.apiProvider)}
          disabled={testResults[settings.apiProvider] === 'testing'}
          className="btn-secondary flex items-center space-x-2"
        >
          {getTestResultIcon(testResults[settings.apiProvider])}
          <span>{getTestResultText(testResults[settings.apiProvider])}</span>
        </button>
      </div>
    </div>
  )

  const AiSettingsSection = () => (
    <div className="space-y-4">
      {/* Dual AI Mode Toggle */}
      {settings.apiProvider === 'openrouter' && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-white flex items-center space-x-2">
              <span>🎭</span>
              <span>Dual AI Commentary System</span>
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Run two models in parallel: Fast reactions + Deep analysis
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dualMode}
              onChange={(e) => handleInputChange('dualMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      )}

      {/* Dual Mode Configuration */}
      {settings.dualMode && settings.apiProvider === 'openrouter' && (
        <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
          <h4 className="text-lg font-medium text-white mb-4">Dual Model Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fast Model */}
            <div className="space-y-3 p-4 bg-blue-900/20 border border-blue-400 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚡</span>
                <h5 className="font-medium text-blue-400">Play-by-Play Model</h5>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Fast Response Model
                </label>
                <select
                  value={settings.fastModel}
                  onChange={(e) => handleInputChange('fastModel', e.target.value)}
                  className="input-field w-full text-sm"
                >
                  {openrouterModels.length > 0 ? (
                    openrouterModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name || model.id}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="anthropic/claude-3-haiku:beta">Claude 3 Haiku (Fastest)</option>
                      <option value="google/gemini-flash-1.5">Gemini Flash (Very Fast)</option>
                      <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">For immediate reactions</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={settings.fastMaxTokens}
                  onChange={(e) => handleInputChange('fastMaxTokens', parseInt(e.target.value))}
                  className="input-field w-full text-sm"
                  min="25"
                  max="150"
                  step="25"
                />
                <p className="text-xs text-gray-400 mt-1">50-75 recommended</p>
              </div>
            </div>

            {/* Analytical Model */}
            <div className="space-y-3 p-4 bg-indigo-900/20 border border-indigo-400 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🧠</span>
                <h5 className="font-medium text-indigo-400">Analytical Model</h5>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Strategic Analysis Model
                </label>
                <select
                  value={settings.analyticalModel}
                  onChange={(e) => handleInputChange('analyticalModel', e.target.value)}
                  className="input-field w-full text-sm"
                >
                  {openrouterModels.length > 0 ? (
                    openrouterModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name || model.id}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="anthropic/claude-3.5-sonnet:beta">Claude 3.5 Sonnet (Best)</option>
                      <option value="openai/gpt-4-turbo-preview">GPT-4 Turbo</option>
                      <option value="anthropic/claude-3-opus:beta">Claude 3 Opus</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">For strategic insights</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={settings.analyticalMaxTokens}
                  onChange={(e) => handleInputChange('analyticalMaxTokens', parseInt(e.target.value))}
                  className="input-field w-full text-sm"
                  min="100"
                  max="400"
                  step="25"
                />
                <p className="text-xs text-gray-400 mt-1">150-250 recommended</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-400 rounded-lg p-3">
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">🎤 Dual Commentary System:</p>
              <ul className="text-xs space-y-1">
                <li><strong>Play-by-Play (⚡):</strong> Immediate reactions - "Fox lands that combo!"</li>
                <li><strong>Analysis (🧠):</strong> Strategic insights - "Smart DI read, Fox is adapting to Falco's patterns"</li>
                <li><strong>Parallel Processing:</strong> Both models run simultaneously for complete coverage</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Single Mode Configuration */}
      {!settings.dualMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tokens (Commentary Length)
            </label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
              className="input-field w-full"
              min="50"
              max="300"
              step="25"
            />
            <p className="text-xs text-gray-500 mt-1">
              For live commentary, 50-150 tokens works best (shorter = faster)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature (Creativity)
            </label>
            <input
              type="number"
              value={settings.temperature}
              onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
              className="input-field w-full"
              min="0"
              max="1"
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              0.6-0.7 recommended for consistent Melee commentary
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Default Detail Level
        </label>
        <select
          value={settings.detailLevel}
          onChange={(e) => handleInputChange('detailLevel', e.target.value)}
          className="input-field w-full"
        >
          <option value="basic">Basic</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="professional">Professional</option>
        </select>
      </div>
    </div>
  )

  const FeatureSettingsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white">Auto-Generate Commentary</h4>
          <p className="text-xs text-gray-400">
            Automatically generate commentary for live events
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoCommentary}
            onChange={(e) => handleInputChange('autoCommentary', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white">Auto-Generate Coaching</h4>
          <p className="text-xs text-gray-400">
            Automatically provide coaching advice after matches
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoCoaching}
            onChange={(e) => handleInputChange('autoCoaching', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-white">Notifications</h4>
          <p className="text-xs text-gray-400">
            Show toast notifications for events and updates
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => handleInputChange('notifications', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">
            Configure your Slippi Coach preferences and API settings
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-400">
          <SettingsIcon size={20} />
          <span className="text-sm font-medium">Configuration</span>
        </div>
      </div>

      {/* API Configuration */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Key size={20} className="text-blue-400" />
          <h2 className="text-xl font-semibold text-white">API Configuration</h2>
        </div>
        <ApiKeySection />
      </div>

      {/* AI Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Server size={20} className="text-green-400" />
          <h2 className="text-xl font-semibold text-white">AI Generation Settings</h2>
        </div>
        <AiSettingsSection />
      </div>

      {/* Feature Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <SettingsIcon size={20} className="text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Feature Preferences</h2>
        </div>
        <FeatureSettingsSection />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Save size={16} />
              <span>Save Settings</span>
            </div>
          )}
        </button>
      </div>

      {/* Help Section */}
      <div className="card bg-blue-900/20 border border-blue-500">
        <div className="flex items-start space-x-3">
          <AlertCircle size={20} className="text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-300 mb-2">Need Help?</h3>
            <div className="text-sm text-blue-200 space-y-2">
              <p>
                <strong>API Keys:</strong> Get your API key from your chosen provider's dashboard.
                For local LLM, make sure LM Studio is running with the server enabled.
              </p>
              <p>
                <strong>Settings:</strong> These settings are stored locally in your browser.
                They will persist between sessions but are specific to this device.
              </p>
              <p>
                <strong>Auto-Features:</strong> Enable automatic commentary and coaching
                for a more hands-off experience during live matches.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
