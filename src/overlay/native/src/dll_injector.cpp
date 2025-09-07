#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <vector>

class DllInjector {
public:
    static bool InjectDll(DWORD processId, const std::string& dllPath) {
        // Open the target process
        HANDLE hProcess = OpenProcess(
            PROCESS_CREATE_THREAD | PROCESS_QUERY_INFORMATION | 
            PROCESS_VM_OPERATION | PROCESS_VM_WRITE | PROCESS_VM_READ,
            FALSE,
            processId
        );
        
        if (hProcess == NULL) {
            return false;
        }
        
        // Allocate memory in the target process for the DLL path
        size_t dllPathSize = dllPath.length() + 1;
        LPVOID pRemoteMemory = VirtualAllocEx(
            hProcess,
            NULL,
            dllPathSize,
            MEM_COMMIT | MEM_RESERVE,
            PAGE_READWRITE
        );
        
        if (pRemoteMemory == NULL) {
            CloseHandle(hProcess);
            return false;
        }
        
        // Write the DLL path to the allocated memory
        if (!WriteProcessMemory(hProcess, pRemoteMemory, dllPath.c_str(), dllPathSize, NULL)) {
            VirtualFreeEx(hProcess, pRemoteMemory, 0, MEM_RELEASE);
            CloseHandle(hProcess);
            return false;
        }
        
        // Get the address of LoadLibraryA
        HMODULE hKernel32 = GetModuleHandleA("kernel32.dll");
        if (hKernel32 == NULL) {
            VirtualFreeEx(hProcess, pRemoteMemory, 0, MEM_RELEASE);
            CloseHandle(hProcess);
            return false;
        }
        
        LPTHREAD_START_ROUTINE pLoadLibraryA = 
            (LPTHREAD_START_ROUTINE)GetProcAddress(hKernel32, "LoadLibraryA");
        
        if (pLoadLibraryA == NULL) {
            VirtualFreeEx(hProcess, pRemoteMemory, 0, MEM_RELEASE);
            CloseHandle(hProcess);
            return false;
        }
        
        // Create a remote thread to load the DLL
        HANDLE hThread = CreateRemoteThread(
            hProcess,
            NULL,
            0,
            pLoadLibraryA,
            pRemoteMemory,
            0,
            NULL
        );
        
        if (hThread == NULL) {
            VirtualFreeEx(hProcess, pRemoteMemory, 0, MEM_RELEASE);
            CloseHandle(hProcess);
            return false;
        }
        
        // Wait for the thread to complete
        WaitForSingleObject(hThread, INFINITE);
        
        // Clean up
        CloseHandle(hThread);
        VirtualFreeEx(hProcess, pRemoteMemory, 0, MEM_RELEASE);
        CloseHandle(hProcess);
        
        return true;
    }
    
    static bool EjectDll(DWORD processId, const std::string& dllName) {
        // Open the target process
        HANDLE hProcess = OpenProcess(
            PROCESS_CREATE_THREAD | PROCESS_QUERY_INFORMATION | 
            PROCESS_VM_OPERATION | PROCESS_VM_WRITE | PROCESS_VM_READ,
            FALSE,
            processId
        );
        
        if (hProcess == NULL) {
            return false;
        }
        
        // Find the module handle of the DLL in the target process
        HMODULE hModule = GetRemoteModuleHandle(processId, dllName);
        if (hModule == NULL) {
            CloseHandle(hProcess);
            return false;
        }
        
        // Get the address of FreeLibrary
        HMODULE hKernel32 = GetModuleHandleA("kernel32.dll");
        if (hKernel32 == NULL) {
            CloseHandle(hProcess);
            return false;
        }
        
        LPTHREAD_START_ROUTINE pFreeLibrary = 
            (LPTHREAD_START_ROUTINE)GetProcAddress(hKernel32, "FreeLibrary");
        
        if (pFreeLibrary == NULL) {
            CloseHandle(hProcess);
            return false;
        }
        
        // Create a remote thread to unload the DLL
        HANDLE hThread = CreateRemoteThread(
            hProcess,
            NULL,
            0,
            pFreeLibrary,
            hModule,
            0,
            NULL
        );
        
        if (hThread == NULL) {
            CloseHandle(hProcess);
            return false;
        }
        
        // Wait for the thread to complete
        WaitForSingleObject(hThread, INFINITE);
        
        // Clean up
        CloseHandle(hThread);
        CloseHandle(hProcess);
        
        return true;
    }
    
private:
    static HMODULE GetRemoteModuleHandle(DWORD processId, const std::string& moduleName) {
        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, processId);
        if (hSnapshot == INVALID_HANDLE_VALUE) {
            return NULL;
        }
        
        MODULEENTRY32 moduleEntry;
        moduleEntry.dwSize = sizeof(moduleEntry);
        
        if (Module32First(hSnapshot, &moduleEntry)) {
            do {
                std::string currentModule = moduleEntry.szModule;
                if (_stricmp(currentModule.c_str(), moduleName.c_str()) == 0) {
                    CloseHandle(hSnapshot);
                    return moduleEntry.hModule;
                }
            } while (Module32Next(hSnapshot, &moduleEntry));
        }
        
        CloseHandle(hSnapshot);
        return NULL;
    }
    
    static bool SetDebugPrivilege() {
        HANDLE hToken;
        TOKEN_PRIVILEGES tokenPriv;
        LUID luid;
        
        if (!OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &hToken)) {
            return false;
        }
        
        if (!LookupPrivilegeValue(NULL, SE_DEBUG_NAME, &luid)) {
            CloseHandle(hToken);
            return false;
        }
        
        tokenPriv.PrivilegeCount = 1;
        tokenPriv.Privileges[0].Luid = luid;
        tokenPriv.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
        
        if (!AdjustTokenPrivileges(hToken, FALSE, &tokenPriv, sizeof(tokenPriv), NULL, NULL)) {
            CloseHandle(hToken);
            return false;
        }
        
        CloseHandle(hToken);
        return true;
    }
};
