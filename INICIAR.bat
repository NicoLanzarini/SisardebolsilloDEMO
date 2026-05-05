@echo off
title SISAR – Demo React (Frontend)
color 0B
echo.
echo  ============================================
echo   SISAR - Demo React  [ FRONTEND ]
echo   Puerto: 3000
echo   Universidad Nacional de Cuyo - CEDIAC
echo  ============================================
echo.

REM -- Verificar Node.js ---------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js en el PATH.
    echo         Instale Node.js 18+ desde https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Node.js encontrado:
node --version
echo.

REM -- Instalar dependencias ------------------------------------------------
if not exist "%~dp0node_modules" (
    echo [INFO] Instalando dependencias por primera vez...
    echo        Esto puede tardar 1-2 minutos...
    cd /d "%~dp0"
    npm install
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas.
    echo.
) else (
    echo [INFO] Dependencias ya instaladas.
    echo.
)

echo [INFO] Iniciando servidor de desarrollo...
echo.
echo  +-------------------------------------------------+
echo  ^|  SISAR Demo React  ->  http://localhost:3000     ^|
echo  +-------------------------------------------------+
echo.
echo  Para cerrar: presione Ctrl+C en esta ventana
echo.

cd /d "%~dp0"
npx vite --port 3000 --open

pause
