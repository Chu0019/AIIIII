@echo off
cd /d %~dp0
echo 啟動 AIIIII...
docker compose up --build
pause
