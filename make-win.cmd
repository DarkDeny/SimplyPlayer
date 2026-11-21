@echo off
rem Build SimplyPlayer with the system Node.js.
rem The Kimi runtime Node wrapper breaks electron-forge packaging,
rem so we put the real system Node first in PATH for this build.
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Using Node:
node -v
npm run make
endlocal
