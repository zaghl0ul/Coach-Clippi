{
  "targets": [
    {
      "target_name": "overlay_native",
      "sources": [
        "src/overlay_native.cpp",
        "src/process_manager.cpp",
        "src/dll_injector.cpp",
        "src/communication.cpp"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "../injection"
      ],
      "libraries": [
        "-luser32.lib",
        "-lkernel32.lib",
        "-lpsapi.lib",
        "-ladvapi32.lib",
        "-ld3d11.lib",
        "-ld3d12.lib",
        "-ldxgi.lib",
        "-lopengl32.lib"
      ],
      "defines": [
        "WIN32_LEAN_AND_MEAN",
        "NOMINMAX"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "RuntimeLibrary": 2
        }
      },
      "conditions": [
        ["OS=='win'", {
          "defines": [
            "_WIN32_WINNT=0x0601"
          ]
        }]
      ]
    }
  ]
}
