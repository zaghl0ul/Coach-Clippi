// Electron main process handler for screen capture
const { desktopCapturer, ipcMain } = require('electron')

class ElectronCaptureHandler {
  constructor() {
    this.setupHandlers()
  }

  setupHandlers() {
    // Handle request for available capture sources
    ipcMain.handle('get-capture-sources', async (event, options = {}) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: options.types || ['window', 'screen'],
          thumbnailSize: { width: 150, height: 150 },
          fetchWindowIcons: true
        })

        // Convert thumbnail to data URL and filter sources
        return sources.map(source => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          display_id: source.display_id,
          appIcon: source.appIcon ? source.appIcon.toDataURL() : null
        }))
      } catch (error) {
        console.error('Failed to get capture sources:', error)
        return []
      }
    })

    // Handle window position tracking for overlay features
    ipcMain.handle('get-window-bounds', async (event, windowName) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['window'],
          fetchWindowIcons: false
        })
        
        const targetWindow = sources.find(source => 
          source.name.toLowerCase().includes(windowName.toLowerCase())
        )
        
        if (targetWindow) {
          // Note: Electron doesn't directly provide window bounds
          // This would need native OS integration for precise positioning
          return {
            found: true,
            id: targetWindow.id,
            name: targetWindow.name
          }
        }
        
        return { found: false }
      } catch (error) {
        console.error('Failed to get window bounds:', error)
        return { found: false }
      }
    })
  }
}

module.exports = ElectronCaptureHandler
