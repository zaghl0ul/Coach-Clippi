#include <windows.h>
#include <string>
#include <thread>
#include <atomic>
#include <queue>
#include <mutex>

class NamedPipeServer {
private:
    HANDLE pipeHandle;
    std::string pipeName;
    std::thread listenerThread;
    std::atomic<bool> running;
    std::queue<std::string> messageQueue;
    std::mutex queueMutex;
    
public:
    NamedPipeServer(const std::string& name) 
        : pipeName("\\\\.\\pipe\\" + name), pipeHandle(INVALID_HANDLE_VALUE), running(false) {}
    
    ~NamedPipeServer() {
        Stop();
    }
    
    bool Start() {
        if (running) return false;
        
        pipeHandle = CreateNamedPipeA(
            pipeName.c_str(),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
            1,
            4096,
            4096,
            0,
            NULL
        );
        
        if (pipeHandle == INVALID_HANDLE_VALUE) {
            return false;
        }
        
        running = true;
        listenerThread = std::thread(&NamedPipeServer::ListenThread, this);
        return true;
    }
    
    void Stop() {
        if (!running) return;
        
        running = false;
        
        if (pipeHandle != INVALID_HANDLE_VALUE) {
            DisconnectNamedPipe(pipeHandle);
            CloseHandle(pipeHandle);
            pipeHandle = INVALID_HANDLE_VALUE;
        }
        
        if (listenerThread.joinable()) {
            listenerThread.join();
        }
    }
    
    bool SendMessage(const std::string& message) {
        if (pipeHandle == INVALID_HANDLE_VALUE) return false;
        
        DWORD bytesWritten;
        return WriteFile(
            pipeHandle,
            message.c_str(),
            static_cast<DWORD>(message.length()),
            &bytesWritten,
            NULL
        ) != 0;
    }
    
    bool HasMessage() {
        std::lock_guard<std::mutex> lock(queueMutex);
        return !messageQueue.empty();
    }
    
    std::string GetMessage() {
        std::lock_guard<std::mutex> lock(queueMutex);
        if (messageQueue.empty()) return "";
        
        std::string message = messageQueue.front();
        messageQueue.pop();
        return message;
    }
    
private:
    void ListenThread() {
        while (running) {
            if (ConnectNamedPipe(pipeHandle, NULL) || GetLastError() == ERROR_PIPE_CONNECTED) {
                char buffer[4096];
                DWORD bytesRead;
                
                while (running) {
                    if (ReadFile(pipeHandle, buffer, sizeof(buffer) - 1, &bytesRead, NULL)) {
                        buffer[bytesRead] = '\0';
                        
                        std::lock_guard<std::mutex> lock(queueMutex);
                        messageQueue.push(std::string(buffer));
                    } else {
                        break;
                    }
                }
                
                DisconnectNamedPipe(pipeHandle);
            }
        }
    }
};

class NamedPipeClient {
private:
    HANDLE pipeHandle;
    std::string pipeName;
    
public:
    NamedPipeClient(const std::string& name) 
        : pipeName("\\\\.\\pipe\\" + name), pipeHandle(INVALID_HANDLE_VALUE) {}
    
    ~NamedPipeClient() {
        Disconnect();
    }
    
    bool Connect() {
        pipeHandle = CreateFileA(
            pipeName.c_str(),
            GENERIC_READ | GENERIC_WRITE,
            0,
            NULL,
            OPEN_EXISTING,
            0,
            NULL
        );
        
        if (pipeHandle == INVALID_HANDLE_VALUE) {
            return false;
        }
        
        DWORD mode = PIPE_READMODE_MESSAGE;
        SetNamedPipeHandleState(pipeHandle, &mode, NULL, NULL);
        
        return true;
    }
    
    void Disconnect() {
        if (pipeHandle != INVALID_HANDLE_VALUE) {
            CloseHandle(pipeHandle);
            pipeHandle = INVALID_HANDLE_VALUE;
        }
    }
    
    bool SendMessage(const std::string& message) {
        if (pipeHandle == INVALID_HANDLE_VALUE) return false;
        
        DWORD bytesWritten;
        return WriteFile(
            pipeHandle,
            message.c_str(),
            static_cast<DWORD>(message.length()),
            &bytesWritten,
            NULL
        ) != 0;
    }
    
    std::string ReceiveMessage() {
        if (pipeHandle == INVALID_HANDLE_VALUE) return "";
        
        char buffer[4096];
        DWORD bytesRead;
        
        if (ReadFile(pipeHandle, buffer, sizeof(buffer) - 1, &bytesRead, NULL)) {
            buffer[bytesRead] = '\0';
            return std::string(buffer);
        }
        
        return "";
    }
};
