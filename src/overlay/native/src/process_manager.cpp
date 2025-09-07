#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <vector>
#include <algorithm>

class ProcessManager {
public:
    static DWORD FindProcessByName(const std::string& processName) {
        DWORD processId = 0;
        HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        
        if (snapshot != INVALID_HANDLE_VALUE) {
            PROCESSENTRY32 processEntry;
            processEntry.dwSize = sizeof(processEntry);
            
            if (Process32First(snapshot, &processEntry)) {
                do {
                    std::string currentProcess = processEntry.szExeFile;
                    std::transform(currentProcess.begin(), currentProcess.end(), 
                                 currentProcess.begin(), ::tolower);
                    
                    std::string targetProcess = processName;
                    std::transform(targetProcess.begin(), targetProcess.end(), 
                                 targetProcess.begin(), ::tolower);
                    
                    if (currentProcess == targetProcess) {
                        processId = processEntry.th32ProcessID;
                        break;
                    }
                } while (Process32Next(snapshot, &processEntry));
            }
            
            CloseHandle(snapshot);
        }
        
        return processId;
    }
    
    static bool IsProcessRunning(DWORD processId) {
        HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, processId);
        if (process != NULL) {
            DWORD exitCode;
            if (GetExitCodeProcess(process, &exitCode)) {
                CloseHandle(process);
                return exitCode == STILL_ACTIVE;
            }
            CloseHandle(process);
        }
        return false;
    }
    
    static std::vector<DWORD> GetAllProcessIds(const std::string& processName) {
        std::vector<DWORD> processIds;
        HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        
        if (snapshot != INVALID_HANDLE_VALUE) {
            PROCESSENTRY32 processEntry;
            processEntry.dwSize = sizeof(processEntry);
            
            if (Process32First(snapshot, &processEntry)) {
                do {
                    std::string currentProcess = processEntry.szExeFile;
                    std::transform(currentProcess.begin(), currentProcess.end(), 
                                 currentProcess.begin(), ::tolower);
                    
                    std::string targetProcess = processName;
                    std::transform(targetProcess.begin(), targetProcess.end(), 
                                 targetProcess.begin(), ::tolower);
                    
                    if (currentProcess == targetProcess) {
                        processIds.push_back(processEntry.th32ProcessID);
                    }
                } while (Process32Next(snapshot, &processEntry));
            }
            
            CloseHandle(snapshot);
        }
        
        return processIds;
    }
};
