cmake_minimum_required(VERSION 3.16)
project(CoachClippiOverlay)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add source files
set(SOURCES
    overlay.cpp
    overlay.h
)

# Create DLL
add_library(overlay SHARED ${SOURCES})

# Windows specific settings
if(WIN32)
    target_compile_definitions(overlay PRIVATE
        WIN32_LEAN_AND_MEAN
        NOMINMAX
        _WINDOWS
        _USRDLL
    )
    
    # Link Windows libraries
    target_link_libraries(overlay
        d3d11
        d3d12
        dxgi
        opengl32
        user32
        kernel32
    )
    
    # Set output name
    set_target_properties(overlay PROPERTIES
        OUTPUT_NAME "overlay"
        PREFIX ""
    )
endif()

# MinHook library (would need to be added as dependency)
# For now, we'll create a simplified version without MinHook
target_compile_definitions(overlay PRIVATE NO_MINHOOK)

# Include directories
target_include_directories(overlay PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Compiler flags
if(MSVC)
    target_compile_options(overlay PRIVATE
        /W3
        /O2
        /MD
    )
endif()

# Install target
install(TARGETS overlay
    RUNTIME DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../../build
    LIBRARY DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../../../build
)
