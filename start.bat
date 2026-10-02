@echo off
chcp 65001 >nul
title Antigravity Task Hub - 探索任务管理
echo ========================================================
echo   Antigravity Attached Sidebar & Exploration Task Hub
echo   正在启动探索任务管理桌面端...
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境，请先安装 Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

npm start
