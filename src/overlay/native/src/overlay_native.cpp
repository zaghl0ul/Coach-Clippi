// Node.js Native Module for Overlay System
#include <nan.h>
#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <string>
#include <vector>
#include <memory>
#include <algorithm>

using namespace Nan;
using namespace v8;

// Window information structure
struct WindowInfo {
    HWND hwnd;
    std::string title;
    std::string className;
    DWORD pid;
    std::string processName;
    RECT bounds;
    bool isVisible;
};

// Forward declarations
class ProcessManager;
class DllInjector;
class Communication;

// Global instances
std::unique_ptr<ProcessManager> g_processManager;
std::unique_ptr<DllInjector> g_dllInjector;
std::unique_ptr<Communication> g_communication;

/**
 * Process Manager - Handles finding and monitoring Dolphin process
 */
class ProcessManager {
public:
    ProcessManager() : m_dolphinPid(0) {}

    DWORD FindDolphinProcess() {
        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnapshot == INVALID_HANDLE_VALUE) {
            return 0;
        }

        PROCESSENTRY32 pe32;
        pe32.dwSize = sizeof(PROCESSENTRY32);

        if (!Process32First(hSnapshot, &pe32)) {
            CloseHandle(hSnapshot);
            return 0;
        }

        do {
            // Look for Dolphin.exe or Slippi Dolphin.exe
            std::string processName = pe32.szExeFile;
            if (processName.find("Dolphin") != std::string::npos ||
                processName.find("dolphin") != std::string::npos) {
                
                // Verify it's actually Dolphin by checking window title
                if (IsDolphinProcess(pe32.th32ProcessID)) {
                    m_dolphinPid = pe32.th32ProcessID;
                    CloseHandle(hSnapshot);
                    return m_dolphinPid;
                }
            }
        } while (Process32Next(hSnapshot, &pe32));

        CloseHandle(hSnapshot);
        return 0;
    }

    bool IsProcessRunning(DWORD pid) {
        if (pid == 0) return false;
        
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, pid);
        if (hProcess == NULL) {
            return false;
        }

        DWORD exitCode;
        bool isRunning = GetExitCodeProcess(hProcess, &exitCode) && exitCode == STILL_ACTIVE;
        CloseHandle(hProcess);
        
        return isRunning;
    }

    HWND GetDolphinWindow(DWORD pid) {
        struct EnumData {
            DWORD pid;
            HWND hwnd;
        } data = { pid, NULL };

        EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
            EnumData* pData = reinterpret_cast<EnumData*>(lParam);
            DWORD windowPid;
            GetWindowThreadProcessId(hwnd, &windowPid);
            
            if (windowPid == pData->pid) {
                char windowTitle[256];
                GetWindowTextA(hwnd, windowTitle, sizeof(windowTitle));
                
                std::string title = windowTitle;
                if (title.find("Dolphin") != std::string::npos ||
                    title.find("Slippi") != std::string::npos) {
                    pData->hwnd = hwnd;
                    return FALSE; // Stop enumeration
                }
            }
            return TRUE;
        }, reinterpret_cast<LPARAM>(&data));

        return data.hwnd;
    }

private:
    DWORD m_dolphinPid;

    bool IsDolphinProcess(DWORD pid) {
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
        if (hProcess == NULL) {
            return false;
        }

        char processPath[MAX_PATH];
        DWORD pathSize = sizeof(processPath);
        
        bool isDolphin = false;
        if (QueryFullProcessImageNameA(hProcess, 0, processPath, &pathSize)) {
            std::string path = processPath;
            isDolphin = (path.find("Dolphin") != std::string::npos ||
                        path.find("dolphin") != std::string::npos ||
                        path.find("Slippi") != std::string::npos);
        }

        CloseHandle(hProcess);
        return isDolphin;
    }
};

/**
 * DLL Injector - Handles injecting overlay DLL into target process
 */
class DllInjector {
public:
    DllInjector() : m_injectedPid(0) {}

    bool InjectDLL(DWORD pid, const std::string& dllPath) {
        HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
        if (hProcess == NULL) {
            return false;
        }

        bool success = false;
        
        // Allocate memory in target process for DLL path
        SIZE_T pathSize = dllPath.length() + 1;
        LPVOID pRemotePath = VirtualAllocEx(hProcess, NULL, pathSize, MEM_COMMIT, PAGE_READWRITE);
        
        if (pRemotePath != NULL) {
            // Write DLL path to target process
            if (WriteProcessMemory(hProcess, pRemotePath, dllPath.c_str(), pathSize, NULL)) {
                
                // Get LoadLibraryA address
                HMODULE hKernel32 = GetModuleHandleA("kernel32.dll");
                LPVOID pLoadLibrary = GetProcAddress(hKernel32, "LoadLibraryA");
                
                if (pLoadLibrary != NULL) {
                    // Create remote thread to load DLL
                    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0,
                        (LPTHREAD_START_ROUTINE)pLoadLibrary, pRemotePath, 0, NULL);
                    
                    if (hThread != NULL) {
                        // Wait for injection to complete
                        WaitForSingleObject(hThread, INFINITE);
                        
                        DWORD exitCode;
                        if (GetExitCodeThread(hThread, &exitCode) && exitCode != 0) {
                            m_injectedPid = pid;
                            success = true;
                        }
                        
                        CloseHandle(hThread);
                    }
                }
            }
            
            VirtualFreeEx(hProcess, pRemotePath, 0, MEM_RELEASE);
        }

        CloseHandle(hProcess);
        return success;
    }

    bool IsInjected() const {
        return m_injectedPid != 0 && g_processManager->IsProcessRunning(m_injectedPid);
    }

    void Reset() {
        m_injectedPid = 0;
    }

private:
    DWORD m_injectedPid;
};

/**
 * Communication - Handles communication with injected DLL
 */
class Communication {
public:
    Communication() : m_pipe(INVALID_HANDLE_VALUE) {}

    bool Initialize() {
        // Create named pipe for communication with DLL
        std::string pipeName = "\\\\.\\pipe\\CoachClippiOverlay";
        
        m_pipe = CreateNamedPipeA(
            pipeName.c_str(),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
            1, // Max instances
            1024, // Out buffer size
            1024, // In buffer size
            0, // Default timeout
            NULL // Default security
        );

        return m_pipe != INVALID_HANDLE_VALUE;
    }

    bool SendMessage(const std::string& message) {
        if (m_pipe == INVALID_HANDLE_VALUE) {
            return false;
        }

        DWORD bytesWritten;
        return WriteFile(m_pipe, message.c_str(), message.length(), &bytesWritten, NULL) &&
               bytesWritten == message.length();
    }

    void Shutdown() {
        if (m_pipe != INVALID_HANDLE_VALUE) {
            CloseHandle(m_pipe);
            m_pipe = INVALID_HANDLE_VALUE;
        }
    }

private:
    HANDLE m_pipe;
};

// Node.js method implementations

NAN_METHOD(FindDolphinProcess) {
    if (!g_processManager) {
        g_processManager = std::make_unique<ProcessManager>();
    }

    DWORD pid = g_processManager->FindDolphinProcess();
    info.GetReturnValue().Set(New<Number>(pid));
}

NAN_METHOD(InjectDLL) {
    if (info.Length() < 1 || !info[0]->IsNumber()) {
        ThrowTypeError("Expected process ID as first argument");
        return;
    }

    if (!g_dllInjector) {
        g_dllInjector = std::make_unique<DllInjector>();
    }

    DWORD pid = info[0]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    
    // Get the DLL path from the build directory
    char modulePath[MAX_PATH];
    HMODULE hModule = GetModuleHandleA("overlay_native.node");
    if (hModule) {
        GetModuleFileNameA(hModule, modulePath, MAX_PATH);
    } else {
        GetModuleFileNameA(NULL, modulePath, MAX_PATH);
    }
    
    std::string basePath = modulePath;
    size_t pos = basePath.find("src\\overlay\\native\\build\\Release");
    if (pos != std::string::npos) {
        // We're in the native module directory, go back to project root
        basePath = basePath.substr(0, pos);
        basePath += "build\\overlay.dll";
    } else {
        // Fallback: look for overlay.dll in various locations
        pos = basePath.find_last_of("\\/");
        if (pos != std::string::npos) {
            basePath = basePath.substr(0, pos + 1);
            // Try build directory first
            std::string tryPath = basePath + "build\\overlay.dll";
            if (GetFileAttributesA(tryPath.c_str()) == INVALID_FILE_ATTRIBUTES) {
                // Try src/overlay/injection directory
                tryPath = basePath + "src\\overlay\\injection\\overlay.dll";
                if (GetFileAttributesA(tryPath.c_str()) != INVALID_FILE_ATTRIBUTES) {
                    basePath = tryPath;
                } else {
                    basePath = basePath + "overlay.dll";
                }
            } else {
                basePath = tryPath;
            }
        }
    }
    
    std::string dllPath = basePath;
    
    // Log the DLL path for debugging
    printf("[Native] Attempting to inject DLL from: %s\n", dllPath.c_str());
    
    // Verify the DLL exists
    if (GetFileAttributesA(dllPath.c_str()) == INVALID_FILE_ATTRIBUTES) {
        printf("[Native] ERROR: DLL not found at %s\n", dllPath.c_str());
        ThrowError("DLL file not found");
        return;
    }

    bool success = g_dllInjector->InjectDLL(pid, dllPath);
    info.GetReturnValue().Set(New<Boolean>(success));
}

NAN_METHOD(SendMessage) {
    if (info.Length() < 1 || !info[0]->IsString()) {
        ThrowTypeError("Expected message string as first argument");
        return;
    }

    if (!g_communication) {
        g_communication = std::make_unique<Communication>();
        if (!g_communication->Initialize()) {
            ThrowError("Failed to initialize communication");
            return;
        }
    }

    String::Utf8Value message(info.GetIsolate(), info[0]);
    bool success = g_communication->SendMessage(*message);
    info.GetReturnValue().Set(New<Boolean>(success));
}

NAN_METHOD(IsInjected) {
    bool injected = g_dllInjector && g_dllInjector->IsInjected();
    info.GetReturnValue().Set(New<Boolean>(injected));
}

NAN_METHOD(GetDolphinWindow) {
    if (info.Length() < 1 || !info[0]->IsNumber()) {
        ThrowTypeError("Expected process ID as first argument");
        return;
    }

    if (!g_processManager) {
        g_processManager = std::make_unique<ProcessManager>();
    }

    DWORD pid = info[0]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    HWND hwnd = g_processManager->GetDolphinWindow(pid);
    
    // Return window handle as number (pointer value)
    info.GetReturnValue().Set(New<Number>(reinterpret_cast<uintptr_t>(hwnd)));
}

NAN_METHOD(IsProcessRunning) {
    if (info.Length() < 1 || !info[0]->IsNumber()) {
        ThrowTypeError("Expected process ID as first argument");
        return;
    }

    if (!g_processManager) {
        g_processManager = std::make_unique<ProcessManager>();
    }

    DWORD pid = info[0]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    bool running = g_processManager->IsProcessRunning(pid);
    info.GetReturnValue().Set(New<Boolean>(running));
}

NAN_METHOD(Cleanup) {
    if (g_dllInjector) {
        g_dllInjector->Reset();
    }
    
    if (g_communication) {
        g_communication->Shutdown();
    }
    
    info.GetReturnValue().Set(New<Boolean>(true));
}

// Window enumeration callback data
struct EnumWindowsData {
    std::vector<WindowInfo> windows;
};

// Callback for EnumWindows
BOOL CALLBACK EnumWindowsCallback(HWND hwnd, LPARAM lParam) {
    EnumWindowsData* data = reinterpret_cast<EnumWindowsData*>(lParam);
    
    if (!IsWindowVisible(hwnd)) {
        return TRUE; // Skip invisible windows
    }
    
    WindowInfo info;
    info.hwnd = hwnd;
    info.isVisible = true;
    
    // Get window title
    char title[256] = {0};
    GetWindowTextA(hwnd, title, sizeof(title));
    info.title = title;
    
    // Get window class name
    char className[256] = {0};
    GetClassNameA(hwnd, className, sizeof(className));
    info.className = className;
    
    // Get process ID
    GetWindowThreadProcessId(hwnd, &info.pid);
    
    // Get process name
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, info.pid);
    if (hProcess) {
        char processPath[MAX_PATH] = {0};
        DWORD pathSize = sizeof(processPath);
        if (QueryFullProcessImageNameA(hProcess, 0, processPath, &pathSize)) {
            std::string fullPath = processPath;
            size_t pos = fullPath.find_last_of("\\/");
            if (pos != std::string::npos) {
                info.processName = fullPath.substr(pos + 1);
            } else {
                info.processName = fullPath;
            }
        }
        CloseHandle(hProcess);
    }
    
    // Get window bounds
    GetWindowRect(hwnd, &info.bounds);
    
    // Skip small windows (likely system windows)
    int width = info.bounds.right - info.bounds.left;
    int height = info.bounds.bottom - info.bounds.top;
    if (width > 50 && height > 50) {
        data->windows.push_back(info);
    }
    
    return TRUE;
}

NAN_METHOD(GetAllWindows) {
    EnumWindowsData data;
    EnumWindows(EnumWindowsCallback, reinterpret_cast<LPARAM>(&data));
    
    // Convert to JavaScript array
    Local<Array> result = Nan::New<Array>(data.windows.size());
    
    for (size_t i = 0; i < data.windows.size(); i++) {
        const WindowInfo& win = data.windows[i];
        
        Local<Object> winObj = Nan::New<Object>();
        
        // Add window properties
        Nan::Set(winObj, Nan::New("handle").ToLocalChecked(), 
                 Nan::New<Number>(reinterpret_cast<uintptr_t>(win.hwnd)));
        Nan::Set(winObj, Nan::New("title").ToLocalChecked(), 
                 Nan::New(win.title).ToLocalChecked());
        Nan::Set(winObj, Nan::New("className").ToLocalChecked(), 
                 Nan::New(win.className).ToLocalChecked());
        Nan::Set(winObj, Nan::New("pid").ToLocalChecked(), 
                 Nan::New<Number>(win.pid));
        Nan::Set(winObj, Nan::New("processName").ToLocalChecked(), 
                 Nan::New(win.processName).ToLocalChecked());
        
        // Add bounds
        Local<Object> bounds = Nan::New<Object>();
        Nan::Set(bounds, Nan::New("x").ToLocalChecked(), 
                 Nan::New<Number>(win.bounds.left));
        Nan::Set(bounds, Nan::New("y").ToLocalChecked(), 
                 Nan::New<Number>(win.bounds.top));
        Nan::Set(bounds, Nan::New("width").ToLocalChecked(), 
                 Nan::New<Number>(win.bounds.right - win.bounds.left));
        Nan::Set(bounds, Nan::New("height").ToLocalChecked(), 
                 Nan::New<Number>(win.bounds.bottom - win.bounds.top));
        Nan::Set(winObj, Nan::New("bounds").ToLocalChecked(), bounds);
        
        Nan::Set(winObj, Nan::New("isVisible").ToLocalChecked(), 
                 Nan::New<Boolean>(win.isVisible));
        
        Nan::Set(result, i, winObj);
    }
    
    info.GetReturnValue().Set(result);
}

NAN_METHOD(FindWindowsByProcess) {
    if (info.Length() < 1 || !info[0]->IsString()) {
        ThrowTypeError("Expected process name as first argument");
        return;
    }
    
    String::Utf8Value processName(info.GetIsolate(), info[0]);
    std::string targetProcess = *processName;
    std::transform(targetProcess.begin(), targetProcess.end(), targetProcess.begin(), ::tolower);
    
    EnumWindowsData data;
    EnumWindows(EnumWindowsCallback, reinterpret_cast<LPARAM>(&data));
    
    // Filter by process name
    Local<Array> result = Nan::New<Array>();
    int index = 0;
    
    for (const WindowInfo& win : data.windows) {
        std::string procName = win.processName;
        std::transform(procName.begin(), procName.end(), procName.begin(), ::tolower);
        
        if (procName.find(targetProcess) != std::string::npos) {
            Local<Object> winObj = Nan::New<Object>();
            
            Nan::Set(winObj, Nan::New("handle").ToLocalChecked(), 
                     Nan::New<Number>(reinterpret_cast<uintptr_t>(win.hwnd)));
            Nan::Set(winObj, Nan::New("title").ToLocalChecked(), 
                     Nan::New(win.title).ToLocalChecked());
            Nan::Set(winObj, Nan::New("className").ToLocalChecked(), 
                     Nan::New(win.className).ToLocalChecked());
            Nan::Set(winObj, Nan::New("pid").ToLocalChecked(), 
                     Nan::New<Number>(win.pid));
            Nan::Set(winObj, Nan::New("processName").ToLocalChecked(), 
                     Nan::New(win.processName).ToLocalChecked());
            
            Local<Object> bounds = Nan::New<Object>();
            Nan::Set(bounds, Nan::New("x").ToLocalChecked(), 
                     Nan::New<Number>(win.bounds.left));
            Nan::Set(bounds, Nan::New("y").ToLocalChecked(), 
                     Nan::New<Number>(win.bounds.top));
            Nan::Set(bounds, Nan::New("width").ToLocalChecked(), 
                     Nan::New<Number>(win.bounds.right - win.bounds.left));
            Nan::Set(bounds, Nan::New("height").ToLocalChecked(), 
                     Nan::New<Number>(win.bounds.bottom - win.bounds.top));
            Nan::Set(winObj, Nan::New("bounds").ToLocalChecked(), bounds);
            
            Nan::Set(result, index++, winObj);
        }
    }
    
    info.GetReturnValue().Set(result);
}

// Module initialization
NAN_MODULE_INIT(InitModule) {
    // Export methods
    Nan::Set(target, Nan::New("findDolphinProcess").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(FindDolphinProcess)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("injectDLL").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(InjectDLL)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("sendMessage").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(SendMessage)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("isInjected").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(IsInjected)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("getDolphinWindow").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(GetDolphinWindow)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("isProcessRunning").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(IsProcessRunning)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("cleanup").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(Cleanup)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("getAllWindows").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(GetAllWindows)).ToLocalChecked());
    
    Nan::Set(target, Nan::New("findWindowsByProcess").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(FindWindowsByProcess)).ToLocalChecked());
}

NODE_MODULE(overlay_native, InitModule)
