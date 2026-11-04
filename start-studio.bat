@echo off
chcp 65001 >nul
title Mozakrawi AI Content Studio Server
cd /d "%~dp0"
echo ========================================================
echo   تشغيل استوديو محتوى مذاكراوي بالذكاء الاصطناعي
echo   الاستوديو الشامل : http://localhost:3456
echo   سلسلة نوفمبر     : http://localhost:3456/series
echo   رواية وقارئ الهوامش: http://localhost:3456/reader
echo ========================================================
start "" "http://localhost:3456"
node server.mjs
pause
