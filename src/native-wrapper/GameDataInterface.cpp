#include "GameDataInterface.h"
#include <iostream>
#include <sstream>
#include <tlhelp32.h>
#include <psapi.h>
#include <mutex>
#include <algorithm>
#include <chrono>

GameDataInterface::GameDataInterface() 
    : m_isMonitoring(false), m_shouldStopMonitoring(false) {
    
    // Initialize game state
    memset(&m_currentGameState, 0, sizeof(GameState));
    
    std::wcout << L"GameDataInterface initialized" << std::endl;
}

GameDataInterface::~GameDataInterface() {
    StopMonitoring();
    
    // Eject DLL from all injected processes
    for (const auto& process : m_injectedProcesses) {
        EjectDLLFromProcess(process.processId);
    }
}

bool GameDataInterface::StartMonitoring() {
    if (m_isMonitoring) {
        return true;
    }
    
    std::wcout << L"Starting game data monitoring..." << std::endl;
    
    // Find game process
    DWORD processId = FindGameProcessId();
    if (processId == 0) {
        std::wcout << L"No game process found" << std::endl;
        return false;
    }
    
    // Inject DLL
    if (!InjectDLL(processId)) {
        std::wcout << L"Failed to inject DLL" << std::endl;
        return false;
    }
    
    // Create named pipe connection
    if (!CreateNamedPipeConnection()) {
        std::wcout << L"Failed to create pipe connection" << std::endl;
        EjectDLL(processId);
        return false;
    }
    
    // Start monitoring thread
    m_shouldStopMonitoring = false;
    m_monitoringThread = std::thread(&GameDataInterface::MonitoringThreadProc, this);
    
    m_isMonitoring = true;
    std::wcout << L"Game data monitoring started successfully" << std::endl;
    
    return true;
}

void GameDataInterface::StopMonitoring() {
    if (!m_isMonitoring) {
        return;
    }
    
    std::wcout << L"Stopping game data monitoring..." << std::endl;
    
    m_shouldStopMonitoring = true;
    m_isMonitoring = false;
    
    // Close pipe connection
    CloseNamedPipeConnection();
    
    // Wait for monitoring thread to finish
    if (m_monitoringThread.joinable()) {
        m_monitoringThread.join();
    }
    
    std::wcout << L"Game data monitoring stopped" << std::endl;
}

bool GameDataInterface::InjectDLL(DWORD processId) {
    // Check if already injected
    if (IsDLLInjected(processId)) {
        return true;
    }
    
    std::wstring dllPath = GetDLLPath();
    if (dllPath.empty()) {
        std::wcout << L"DLL not found" << std::endl;
        return false;
    }
    
    return InjectDLLIntoProcess(processId, dllPath);
}

bool GameDataInterface::EjectDLL(DWORD processId) {
    return EjectDLLFromProcess(processId);
}

bool GameDataInterface::IsDLLInjected(DWORD processId) const {
    for (const auto& process : m_injectedProcesses) {
        if (process.processId == processId) {
            return true;
        }
    }
    return false;
}

GameState GameDataInterface::GetCurrentGameState() const {
    std::lock_guard<std::mutex> lock(m_gameStateMutex);
    return m_currentGameState;
}

std::vector<GameEvent> GameDataInterface::GetRecentEvents(int maxEvents) const {
    std::lock_guard<std::mutex> lock(m_gameStateMutex);
    
    if (m_recentEvents.size() <= maxEvents) {
        return m_recentEvents;
    }
    
    return std::vector<GameEvent>(
        m_recentEvents.end() - maxEvents,
        m_recentEvents.end()
    );
}

void GameDataInterface::SetGameStateCallback(GameStateCallback callback) {
    m_gameStateCallback = callback;
}

void GameDataInterface::SetGameEventCallback(GameEventCallback callback) {
    m_gameEventCallback = callback;
}

bool GameDataInterface::SendCommandToDLL(const std::string& command) {
    if (!m_pipeConnection || m_pipeConnection->pipe == INVALID_HANDLE_VALUE) {
        return false;
    }
    
    DWORD bytesWritten;
    std::string message = command + "\n";
    
    return WriteFile(m_pipeConnection->pipe, message.c_str(), 
                    static_cast<DWORD>(message.length()), &bytesWritten, nullptr) != FALSE;
}

bool GameDataInterface::IsGameProcessRunning() const {
    return FindGameProcessId() != 0;
}

DWORD GameDataInterface::FindGameProcessId() const {
    std::vector<DWORD> processes = FindGameProcesses();
    return processes.empty() ? 0 : processes[0];
}

void GameDataInterface::MonitoringThreadProc() {
    std::wcout << L"Monitoring thread started" << std::endl;
    
    while (!m_shouldStopMonitoring) {
        // Check if game process is still running
        DWORD processId = FindGameProcessId();
        if (processId == 0) {
            std::wcout << L"Game process lost" << std::endl;
            break;
        }
        
        // Check if DLL is still injected
        if (!IsDLLInjected(processId)) {
            std::wcout << L"DLL injection lost, attempting to re-inject..." << std::endl;
            if (!InjectDLL(processId)) {
                std::wcout << L"Failed to re-inject DLL" << std::endl;
                break;
            }
        }
        
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    std::wcout << L"Monitoring thread ended" << std::endl;
}

void GameDataInterface::PipeReaderThreadProc() {
    std::wcout << L"Pipe reader thread started" << std::endl;
    
    char buffer[4096];
    std::string messageBuffer;
    
    while (!m_pipeConnection->shouldStop) {
        DWORD bytesRead;
        if (ReadFile(m_pipeConnection->pipe, buffer, sizeof(buffer) - 1, &bytesRead, nullptr)) {
            if (bytesRead > 0) {
                buffer[bytesRead] = '\0';
                messageBuffer += buffer;
                
                // Process complete messages (separated by newlines)
                size_t pos;
                while ((pos = messageBuffer.find('\n')) != std::string::npos) {
                    std::string message = messageBuffer.substr(0, pos);
                    messageBuffer.erase(0, pos + 1);
                    
                    if (!message.empty()) {
                        ProcessIncomingData(message);
                    }
                }
            }
        } else {
            DWORD error = GetLastError();
            if (error != ERROR_BROKEN_PIPE) {
                std::wcout << L"Pipe read error: " << error << std::endl;
            }
            break;
        }
    }
    
    std::wcout << L"Pipe reader thread ended" << std::endl;
}

bool GameDataInterface::CreateNamedPipeConnection() {
    const wchar_t* pipeName = L"\\\\.\\pipe\\CoachClippiOverlay";
    
    // Wait for pipe to become available
    if (!WaitNamedPipe(pipeName, 5000)) {
        std::wcout << L"Pipe not available" << std::endl;
        return false;
    }
    
    // Connect to pipe
    HANDLE pipe = CreateFile(pipeName, GENERIC_READ | GENERIC_WRITE, 0, nullptr, 
                            OPEN_EXISTING, 0, nullptr);
    
    if (pipe == INVALID_HANDLE_VALUE) {
        std::wcout << L"Failed to connect to pipe: " << GetLastError() << std::endl;
        return false;
    }
    
    m_pipeConnection = std::make_unique<PipeConnection>();
    m_pipeConnection->pipe = pipe;
    m_pipeConnection->shouldStop = false;
    
    // Start reader thread
    m_pipeConnection->readerThread = std::thread(&GameDataInterface::PipeReaderThreadProc, this);
    
    std::wcout << L"Named pipe connection established" << std::endl;
    return true;
}

void GameDataInterface::CloseNamedPipeConnection() {
    if (!m_pipeConnection) {
        return;
    }
    
    m_pipeConnection->shouldStop = true;
    
    if (m_pipeConnection->pipe != INVALID_HANDLE_VALUE) {
        CloseHandle(m_pipeConnection->pipe);
        m_pipeConnection->pipe = INVALID_HANDLE_VALUE;
    }
    
    if (m_pipeConnection->readerThread.joinable()) {
        m_pipeConnection->readerThread.join();
    }
    
    m_pipeConnection.reset();
}

bool GameDataInterface::InjectDLLIntoProcess(DWORD processId, const std::wstring& dllPath) {
    // Open target process
    HANDLE processHandle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, processId);
    if (!processHandle) {
        std::wcout << L"Failed to open process: " << GetLastError() << std::endl;
        return false;
    }
    
    // Allocate memory in target process for DLL path
    size_t pathSize = (dllPath.length() + 1) * sizeof(wchar_t);
    LPVOID remoteMemory = VirtualAllocEx(processHandle, nullptr, pathSize, 
                                        MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    
    if (!remoteMemory) {
        std::wcout << L"Failed to allocate memory in target process" << std::endl;
        CloseHandle(processHandle);
        return false;
    }
    
    // Write DLL path to target process
    if (!WriteProcessMemory(processHandle, remoteMemory, dllPath.c_str(), pathSize, nullptr)) {
        std::wcout << L"Failed to write DLL path to target process" << std::endl;
        VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
        CloseHandle(processHandle);
        return false;
    }
    
    // Get LoadLibraryW address
    HMODULE kernel32 = GetModuleHandle(L"kernel32.dll");
    LPVOID loadLibraryAddr = GetProcAddress(kernel32, "LoadLibraryW");
    
    if (!loadLibraryAddr) {
        std::wcout << L"Failed to get LoadLibraryW address" << std::endl;
        VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
        CloseHandle(processHandle);
        return false;
    }
    
    // Create remote thread to load DLL
    HANDLE remoteThread = CreateRemoteThread(processHandle, nullptr, 0,
                                           (LPTHREAD_START_ROUTINE)loadLibraryAddr,
                                           remoteMemory, 0, nullptr);
    
    if (!remoteThread) {
        std::wcout << L"Failed to create remote thread" << std::endl;
        VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
        CloseHandle(processHandle);
        return false;
    }
    
    // Wait for thread to complete
    WaitForSingleObject(remoteThread, INFINITE);
    
    // Get DLL module handle
    DWORD exitCode;
    GetExitCodeThread(remoteThread, &exitCode);
    HMODULE dllModule = (HMODULE)exitCode;
    
    // Cleanup
    CloseHandle(remoteThread);
    VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
    
    if (!dllModule) {
        std::wcout << L"DLL injection failed" << std::endl;
        CloseHandle(processHandle);
        return false;
    }
    
    // Store injection info
    InjectedProcess injectedProcess;
    injectedProcess.processId = processId;
    injectedProcess.processHandle = processHandle;
    injectedProcess.dllModule = dllModule;
    m_injectedProcesses.push_back(injectedProcess);
    
    std::wcout << L"DLL injected successfully into process " << processId << std::endl;
    return true;
}

bool GameDataInterface::EjectDLLFromProcess(DWORD processId) {
    auto it = std::find_if(m_injectedProcesses.begin(), m_injectedProcesses.end(),
        [processId](const InjectedProcess& process) {
            return process.processId == processId;
        });
    
    if (it == m_injectedProcesses.end()) {
        return false;
    }
    
    // Get FreeLibrary address
    HMODULE kernel32 = GetModuleHandle(L"kernel32.dll");
    LPVOID freeLibraryAddr = GetProcAddress(kernel32, "FreeLibrary");
    
    if (freeLibraryAddr) {
        // Create remote thread to unload DLL
        HANDLE remoteThread = CreateRemoteThread(it->processHandle, nullptr, 0,
                                               (LPTHREAD_START_ROUTINE)freeLibraryAddr,
                                               it->dllModule, 0, nullptr);
        
        if (remoteThread) {
            WaitForSingleObject(remoteThread, INFINITE);
            CloseHandle(remoteThread);
        }
    }
    
    CloseHandle(it->processHandle);
    m_injectedProcesses.erase(it);
    
    std::wcout << L"DLL ejected from process " << processId << std::endl;
    return true;
}

std::wstring GameDataInterface::GetDLLPath() const {
    wchar_t modulePath[MAX_PATH];
    GetModuleFileName(nullptr, modulePath, MAX_PATH);
    
    std::wstring path(modulePath);
    size_t lastSlash = path.find_last_of(L"\\");
    if (lastSlash != std::wstring::npos) {
        path = path.substr(0, lastSlash + 1);
    }
    
    path += L"overlay.dll";
    
    // Check if file exists
    DWORD attributes = GetFileAttributes(path.c_str());
    if (attributes == INVALID_FILE_ATTRIBUTES) {
        // Try relative path
        path = L"build\\overlay.dll";
        attributes = GetFileAttributes(path.c_str());
        if (attributes == INVALID_FILE_ATTRIBUTES) {
            return L"";
        }
    }
    
    return path;
}

void GameDataInterface::ProcessIncomingData(const std::string& data) {
    // Parse JSON-like data from DLL
    if (data.find("\"type\":\"gameState\"") != std::string::npos) {
        ParseGameStateUpdate(data);
    } else if (data.find("\"type\":\"event\"") != std::string::npos) {
        ParseGameEvent(data);
    }
}

void GameDataInterface::ParseGameStateUpdate(const std::string& data) {
    // Simple parsing - in a real implementation, use a JSON library
    std::lock_guard<std::mutex> lock(m_gameStateMutex);
    
    // For now, just update frame count as an example
    size_t framePos = data.find("\"frame\":");
    if (framePos != std::string::npos) {
        framePos += 8; // Skip "frame":
        size_t endPos = data.find_first_of(",}", framePos);
        if (endPos != std::string::npos) {
            std::string frameStr = data.substr(framePos, endPos - framePos);
            m_currentGameState.frameCount = std::stoi(frameStr);
        }
    }
    
    NotifyGameStateUpdate();
}

void GameDataInterface::ParseGameEvent(const std::string& data) {
    // Simple event parsing
    GameEvent event = {};
    
    if (data.find("\"combo\"") != std::string::npos) {
        event.type = GameEvent::COMBO_START;
    } else if (data.find("\"kill\"") != std::string::npos) {
        event.type = GameEvent::KILL;
    } else if (data.find("\"stock\"") != std::string::npos) {
        event.type = GameEvent::STOCK_LOST;
    }
    
    event.timestamp = GetTickCount() / 1000.0f;
    event.data = data;
    
    {
        std::lock_guard<std::mutex> lock(m_gameStateMutex);
        m_recentEvents.push_back(event);
        
        // Keep only recent events
        if (m_recentEvents.size() > 100) {
            m_recentEvents.erase(m_recentEvents.begin());
        }
    }
    
    NotifyGameEvent(event);
}

void GameDataInterface::NotifyGameStateUpdate() {
    if (m_gameStateCallback) {
        m_gameStateCallback(m_currentGameState);
    }
}

void GameDataInterface::NotifyGameEvent(const GameEvent& event) {
    if (m_gameEventCallback) {
        m_gameEventCallback(event);
    }
}

std::vector<DWORD> GameDataInterface::FindGameProcesses() const {
    std::vector<DWORD> processes;
    
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) {
        return processes;
    }
    
    PROCESSENTRY32 processEntry = {};
    processEntry.dwSize = sizeof(PROCESSENTRY32);
    
    if (Process32First(snapshot, &processEntry)) {
        do {
            std::wstring processName(processEntry.szExeFile);
            std::transform(processName.begin(), processName.end(), processName.begin(), ::towlower);
            
            if (processName.find(L"dolphin") != std::wstring::npos ||
                processName.find(L"slippi") != std::wstring::npos) {
                processes.push_back(processEntry.th32ProcessID);
            }
        } while (Process32Next(snapshot, &processEntry));
    }
    
    CloseHandle(snapshot);
    return processes;
}

bool GameDataInterface::IsProcessRunning(DWORD processId) const {
    HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, processId);
    if (process) {
        CloseHandle(process);
        return true;
    }
    return false;
}

std::wstring GameDataInterface::GetProcessName(DWORD processId) const {
    HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, processId);
    if (!process) {
        return L"";
    }
    
    wchar_t processName[MAX_PATH];
    DWORD size = MAX_PATH;
    
    if (QueryFullProcessImageName(process, 0, processName, &size)) {
        CloseHandle(process);
        return std::wstring(processName);
    }
    
    CloseHandle(process);
    return L"";
}
