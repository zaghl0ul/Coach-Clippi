import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileVideo, Upload, Download, Play, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ReplayAnalysis = () => {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [analysisResults, setAnalysisResults] = useState([])

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    const newFiles = []

    for (const file of acceptedFiles) {
      try {
        // Check if file is a .slp file
        if (!file.name.endsWith('.slp')) {
          toast.error(`${file.name} is not a valid Slippi replay file`)
          continue
        }

        // Create FormData for file upload
        const formData = new FormData()
        formData.append('replay', file)

        // Upload file
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        const uploadedFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          status: 'uploaded',
          filepath: response.data.filepath,
          timestamp: new Date().toISOString(),
          analysis: null
        }

        newFiles.push(uploadedFile)
        toast.success(`${file.name} uploaded successfully`)

        // Trigger analysis (this would integrate with your existing replay processing)
        await triggerAnalysis(uploadedFile)

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    setUploadedFiles(prev => [...newFiles, ...prev])
    setIsUploading(false)
  }, [])

  const triggerAnalysis = async (file) => {
    try {
      // This would integrate with your existing replay analysis logic
      // For now, we'll simulate the process
      file.status = 'analyzing'
      setUploadedFiles(prev => [...prev])

      // Simulate analysis time
      setTimeout(() => {
        const analysis = {
          id: Date.now() + Math.random(),
          fileName: file.name,
          timestamp: new Date().toISOString(),
          status: 'completed',
          summary: {
            duration: '4:32',
            players: ['Player1 (Fox)', 'Player2 (Marth)'],
            stage: 'Battlefield',
            winner: 'Player1',
            totalHits: 156,
            combos: 23,
            techs: 45
          },
          insights: [
            'Player1 showed excellent combo execution with Fox',
            'Player2 had strong neutral game but struggled with edge-guarding',
            'The match featured high-level movement and spacing',
            'Several missed L-cancel opportunities could be improved'
          ],
          recommendations: [
            'Practice L-canceling consistently',
            'Work on edge-guarding techniques',
            'Improve combo DI and survival DI',
            'Focus on neutral game fundamentals'
          ]
        }

        file.analysis = analysis
        file.status = 'completed'
        setAnalysisResults(prev => [analysis, ...prev])
        setUploadedFiles(prev => [...prev])
        toast.success(`Analysis completed for ${file.name}`)
      }, 3000)

    } catch (error) {
      console.error(`Failed to analyze ${file.name}:`, error)
      file.status = 'error'
      setUploadedFiles(prev => [...prev])
      toast.error(`Failed to analyze ${file.name}`)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.slp']
    },
    multiple: true
  })

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded':
        return 'text-blue-400'
      case 'analyzing':
        return 'text-yellow-400'
      case 'completed':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploaded':
        return <Upload size={16} />
      case 'analyzing':
        return <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      case 'completed':
        return <Play size={16} />
      case 'error':
        return <AlertCircle size={16} />
      default:
        return <FileVideo size={16} />
    }
  }

  const FileCard = ({ file }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <FileVideo size={20} className="text-purple-400" />
          <div>
            <h3 className="font-semibold text-white">{file.name}</h3>
            <p className="text-sm text-gray-400">
              {formatFileSize(file.size)} • {new Date(file.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <div className={`flex items-center space-x-2 ${getStatusColor(file.status)}`}>
          {getStatusIcon(file.status)}
          <span className="text-sm font-medium capitalize">{file.status}</span>
        </div>
      </div>

      {file.analysis && (
        <div className="mt-4 space-y-4">
          {/* Summary */}
          <div className="p-3 bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Match Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Duration</p>
                <p className="text-white font-medium">{file.analysis.summary.duration}</p>
              </div>
              <div>
                <p className="text-gray-400">Stage</p>
                <p className="text-white font-medium">{file.analysis.summary.stage}</p>
              </div>
              <div>
                <p className="text-gray-400">Winner</p>
                <p className="text-white font-medium">{file.analysis.summary.winner}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Hits</p>
                <p className="text-white font-medium">{file.analysis.summary.totalHits}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-gray-400 text-sm">Players:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {file.analysis.summary.players.map((player, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-600 text-xs text-white rounded">
                    {player}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300 mb-2">Key Insights</h4>
            <ul className="space-y-1">
              {file.analysis.insights.map((insight, index) => (
                <li key={index} className="text-sm text-blue-200 flex items-start space-x-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="p-3 bg-green-900/20 border border-green-500 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-2">Improvement Areas</h4>
            <ul className="space-y-1">
              {file.analysis.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-green-200 flex items-start space-x-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )

  const AnalysisResults = () => (
    <div className="space-y-4">
      {analysisResults.map((analysis) => (
        <div key={analysis.id} className="card border-l-4 border-purple-500 bg-purple-900/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <TrendingUp size={20} className="text-purple-400" />
              <div>
                <h3 className="font-semibold text-white">Analysis Results</h3>
                <p className="text-sm text-gray-400">
                  {analysis.fileName} • {new Date(analysis.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <span className="px-2 py-1 bg-purple-600 text-xs text-white rounded">
              {analysis.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <Clock size={20} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Duration</p>
              <p className="text-white font-medium">{analysis.summary.duration}</p>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <Users size={20} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Players</p>
              <p className="text-white font-medium">{analysis.summary.players.length}</p>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <TrendingUp size={20} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Combos</p>
              <p className="text-white font-medium">{analysis.summary.combos}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Replay Analysis</h1>
          <p className="text-gray-400 mt-2">
            Upload and analyze Slippi replay files for detailed insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-purple-400">
          <FileVideo size={20} />
          <span className="text-sm font-medium">Slippi Files</span>
        </div>
      </div>

      {/* File Upload */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Replay Files</h2>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-primary-400 bg-primary-900/20'
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
          }`}
        >
          <input {...getInputProps()} />
          
          {isDragActive ? (
            <div className="space-y-2">
              <Upload size={48} className="text-primary-400 mx-auto" />
              <p className="text-primary-400 font-medium">Drop the replay files here...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload size={48} className="text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-white">
                  Drag & drop Slippi replay files here
                </p>
                <p className="text-gray-400 mt-1">
                  or click to browse files
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Supports .slp files only • Max file size: 50MB
              </p>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Uploading and analyzing files...</span>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Uploaded Files</h2>
          <div className="space-y-4">
            {uploadedFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Analysis Results</h2>
          <AnalysisResults />
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && !isUploading && (
        <div className="card text-center py-12">
          <FileVideo size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No replay files uploaded yet</p>
          <p className="text-gray-500 text-sm">
            Upload a .slp file to get started with analysis
          </p>
        </div>
      )}
    </div>
  )
}

export default ReplayAnalysis