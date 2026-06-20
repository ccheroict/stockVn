@echo off
REM Wrapper for Windows Task Scheduler: run the full stockVn pipeline and log output.
cd /d "%~dp0"
if not exist logs mkdir logs
echo ==== %DATE% %TIME% ==== >> logs\run.log
"C:\nvm4w\nodejs\node.exe" run.js >> logs\run.log 2>&1
echo (exit %ERRORLEVEL%) >> logs\run.log
