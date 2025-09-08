#pragma once
#include <windows.h>
#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <memory>
#include <mutex>
#include <vector>

// Game state structures
struct PlayerState {
    float positionX;
    float positionY;
    float damage;
    int stocks;
    int character;
    int actionState;
    bool isInHitstun;
    bool isInShieldstun;
    bool isOffstage;
};

struct GameState {
    PlayerState players[4];
    int activePlayerCount;
    int frameCount;
    int stage;
    bool isInGame;
    bool isPaused;
    float gameTimer;
};

struct GameEvent {
    enum Type {
        GAME_START,
        GAME_END,
        STOCK_LOST,
        COMBO_START,
        COMBO_END,
        KILL,
        TECH,
        EDGEGUARD,
        NEUTRAL_WIN
    };
    
    Type type;
    int playerId;
    float timestamp;
    std::string data;
};

// Callback types
using GameStateCallback = std::function<void(const GameState&)>;
using GameEventCallback = std::function<void(const GameEvent&)>;

class GameDataInterface {
public:
    GameDataInterface();
    ~GameDataInterface();
    
    // Monitoring control
    bool StartMonitoring();
    void StopMonitoring();
    bool IsMonitoring() const { return m_isMonitoring; }
    
    // DLL injection and management
    bool InjectDLL(DWORD processId);
    bool EjectDLL(DWORD processId);
    bool IsDLLInjected(DWORD processId) const;
    
    // Data access
    GameState GetCurrentGameState() const;
    std::vector<GameEvent> GetRecentEvents(int maxEvents = 10) const;
    
    // Callback registration
    void SetGameStateCallback(GameStateCallback callback);
    void SetGameEventCallback(GameEventCallback callback);
    
    // Communication with DLL
    bool SendCommandToDLL(const std::string& command);
    bool IsGameProcessRunning() const;
    DWORD FindGameProcessId() const;
    
private:
    // Named pipe communication
    struct PipeConnection {
        HANDLE pipe;
        std::thread readerThread;
        std::atomic<bool> shouldStop;
    };
    
    std::unique_ptr<PipeConnection> m_pipeConnection;
    std::atomic<bool> m_isMonitoring;
    
    // Game state tracking
    mutable std::mutex m_gameStateMutex;
    GameState m_currentGameState;
    std::vector<GameEvent> m_recentEvents;
    
    // Callbacks
    GameStateCallback m_gameStateCallback;
    GameEventCallback m_gameEventCallback;
    
    // DLL injection tracking
    struct InjectedProcess {
        DWORD processId;
        HANDLE processHandle;
        HMODULE dllModule;
    };
    std::vector<InjectedProcess> m_injectedProcesses;
    
    // Threading
    std::thread m_monitoringThread;
    std::atomic<bool> m_shouldStopMonitoring;
    
    // Private methods
    void MonitoringThreadProc();
    void PipeReaderThreadProc();
    bool CreateNamedPipeConnection();
    void CloseNamedPipeConnection();
    
    // DLL injection helpers
    bool InjectDLLIntoProcess(DWORD processId, const std::wstring& dllPath);
    bool EjectDLLFromProcess(DWORD processId);
    std::wstring GetDLLPath() const;
    
    // Data processing
    void ProcessIncomingData(const std::string& data);
    void ParseGameStateUpdate(const std::string& data);
    void ParseGameEvent(const std::string& data);
    void NotifyGameStateUpdate();
    void NotifyGameEvent(const GameEvent& event);
    
    // Process management
    std::vector<DWORD> FindGameProcesses() const;
    bool IsProcessRunning(DWORD processId) const;
    std::wstring GetProcessName(DWORD processId) const;
};
