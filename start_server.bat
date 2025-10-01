@echo off
chcp 65001 >nul
echo.
echo 🚀 Запуск сервера Хроно-Платформера...
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python не найден! Установите Python 3.6+ и добавьте в PATH
    echo 📥 Скачать: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python найден
echo 📡 Запуск сервера на порту 8080...
echo.
echo 🌐 Адреса:
echo    🎮 Игра: http://localhost:8080
echo    🛠️ Редактор: http://localhost:8080/level_editor.html
echo.
echo ✋ Для остановки нажмите Ctrl+C
echo.

REM Запускаем сервер
python level_editor_server.py

pause