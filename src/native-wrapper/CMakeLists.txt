cmake_minimum_required(VERSION 3.16)
project(CoachClippiWrapper)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Windows-specific settings
if(WIN32)
    # Set subsystem to Windows (GUI application)
    set(CMAKE_WIN32_EXECUTABLE TRUE)
    
    # Add Windows definitions
    add_definitions(-DWIN32_LEAN_AND_MEAN)
    add_definitions(-DNOMINMAX)
    add_definitions(-DUNICODE)
    add_definitions(-D_UNICODE)
endif()

# ImGui Docking Branch
include_directories(../../imgui-docking ../../imgui-docking/backends)
# Source files
set(SOURCES
    main.cpp
    WindowManager.cpp
    GameDataInterface.cpp
    CoachingInterface.cpp
    ../../imgui-docking/imgui.cpp
    ../../imgui-docking/imgui_draw.cpp
    ../../imgui-docking/imgui_tables.cpp
    ../../imgui-docking/imgui_widgets.cpp
    ../../imgui-docking/imgui_demo.cpp
    ../../imgui-docking/backends/imgui_impl_win32.cpp
    ../../imgui-docking/backends/imgui_impl_dx11.cpp
)

# Header files
set(HEADERS
    WindowManager.h
    GameDataInterface.h
    CoachingInterface.h
)

# Create executable
add_executable(CoachClippiWrapper WIN32 ${SOURCES} ${HEADERS})

# Windows-specific libraries
if(WIN32)
    target_link_libraries(CoachClippiWrapper
        user32
        gdi32
        kernel32
        comctl32
        ole32
        oleaut32
        uuid
        advapi32
        shell32
        psapi
        d3d11
        d3dcompiler
    )
endif()

# Compiler-specific options
if(MSVC)
    # MSVC specific options
    target_compile_options(CoachClippiWrapper PRIVATE
        /W4                     # Warning level 4
        /WX-                    # Don't treat warnings as errors
        /permissive-           # Disable non-conforming code
        /Zc:__cplusplus        # Enable correct __cplusplus macro
        /MP                     # Multi-processor compilation
    )
    
    # Set runtime library to MultiThreaded
    set_property(TARGET CoachClippiWrapper PROPERTY
        MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
        
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    # GCC/Clang specific options
    target_compile_options(CoachClippiWrapper PRIVATE
        -Wall
        -Wextra
        -Wpedantic
        -Wno-unused-parameter
    )
endif()

# Debug configuration
set_target_properties(CoachClippiWrapper PROPERTIES
    DEBUG_POSTFIX "_d"
)

# Release configuration optimizations
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(MSVC)
        target_compile_options(CoachClippiWrapper PRIVATE /O2 /Ob2)
    else()
        target_compile_options(CoachClippiWrapper PRIVATE -O3)
    endif()
endif()

# Copy overlay.dll to output directory
if(WIN32)
    # Try to find overlay.dll in the build directory
    set(OVERLAY_DLL_SOURCE "${CMAKE_SOURCE_DIR}/../../build/overlay.dll")
    
    # Custom command to copy overlay.dll after build
    add_custom_command(TARGET CoachClippiWrapper POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${OVERLAY_DLL_SOURCE}"
        "$<TARGET_FILE_DIR:CoachClippiWrapper>/overlay.dll"
        COMMENT "Copying overlay.dll to output directory"
        VERBATIM
    )
endif()

# Install configuration
install(TARGETS CoachClippiWrapper
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# Install overlay.dll
if(WIN32 AND EXISTS "${CMAKE_SOURCE_DIR}/../../build/overlay.dll")
    install(FILES "${CMAKE_SOURCE_DIR}/../../build/overlay.dll"
        DESTINATION bin
    )
endif()

# Create a batch file for easy building
if(WIN32)
    file(WRITE "${CMAKE_SOURCE_DIR}/build.bat"
        "@echo off\n"
        "echo Building Coach Clippi Wrapper...\n"
        "if not exist build mkdir build\n"
        "cd build\n"
        "cmake .. -G \"Visual Studio 17 2022\" -A x64\n"
        "cmake --build . --config Release\n"
        "echo.\n"
        "echo Build complete! Executable is in build/bin/Release/\n"
        "pause\n"
    )
endif()

# Print configuration info
message(STATUS "Coach Clippi Wrapper Configuration:")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Output directory: ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}")
if(WIN32)
    message(STATUS "  Overlay DLL source: ${OVERLAY_DLL_SOURCE}")
endif()
