
# Credits
https://github.com/Kagami/mpv.js

https://sourceforge.net/projects/mpv-player-windows/files/libmpv/mpv-dev-x86_64-20221106-git-2590651.7z/download

# Build ppapi plugin

## link libpmv with msvc
- add EXPORTS on first line of mpv.def
- lib /def:mpv.def /name:mpv-2.dll /out:mpv.lib /MACHINE:X64

## register plugins in chrome (below 109)

--no-sandbox --register-pepper-plugins=mpv-win32-x64-pepper_49.dll;application/x-player

# Screenshot
![player](player.png)
