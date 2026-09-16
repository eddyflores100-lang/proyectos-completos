@echo off
chcp 65001 >nul
title 🚀 SISTEMA COMPLETO DE PROYECTOS AUTOMATIZADOS
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                     🚀 INICIANDO SISTEMA COMPLETO                            ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.
echo 📊 Sistema integral desarrollado con todas las capacidades disponibles
echo 📅 Fecha: %date% %time%
echo.

REM Verificar Node.js
echo 🔍 Verificando Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no encontrado. Por favor instala Node.js v16 o superior.
    echo 📥 Descarga: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js encontrado: %node_version%

REM Verificar npm
echo 🔍 Verificando npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm no encontrado.
    pause
    exit /b 1
)

echo ✅ npm encontrado

REM Instalar dependencias
echo 📦 Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias.
    pause
    exit /b 1
)

echo ✅ Dependencias instaladas correctamente

REM Crear archivos de configuración si no existen
echo ⚙️  Configurando sistema...
if not exist ".env" (
    echo 📝 Creando archivo .env desde ejemplo...
    copy ".env.example" ".env" >nul
    echo ✅ Archivo .env creado
)

if not exist "config.json" (
    echo 📝 Creando archivo config.json...
    echo {} > "config.json"
    echo ✅ Archivo config.json creado
)

REM Crear directorios necesarios
echo 📁 Creando estructura de directorios...
mkdir "data" 2>nul
mkdir "data\raw" 2>nul
mkdir "data\processed" 2>nul
mkdir "data\export" 2>nul
mkdir "data\backup" 2>nul
mkdir "logs" 2>nul
mkdir "public" 2>nul
mkdir "public\css" 2>nul
mkdir "public\js" 2>nul
mkdir "public\images" 2>nul
mkdir "views" 2>nul

echo ✅ Estructura de directorios creada

REM Iniciar servidor
echo 🚀 Iniciando servidor en puerto 3000...
echo.
echo ═══════════════════════════════════════════════════════════════════════════════
echo 📊 SISTEMA COMPLETO INICIANDO...
echo ═══════════════════════════════════════════════════════════════════════════════
echo.
echo 🌐 URL PRINCIPAL: http://localhost:3000
echo.
echo 📂 PROYECTOS DISPONIBLES:
echo   1. 🚀 SaaS Avanzado:      http://localhost:3000/saas-avanzado
echo   2. 🛒 E-commerce Premium: http://localhost:3000/ecommerce-premium
echo   3. 📊 Dashboard Analytics: http://localhost:3000/dashboard
echo   4. ⚙️  Panel de Admin:     http://localhost:3000/admin
echo   5. 📚 API Documentation:  http://localhost:3000/api-docs
echo   6. 🔍 Sistema de Scraping: http://localhost:3000/api/scraping
echo   7. 💓 Health Check:       http://localhost:3000/health
echo.
echo ═══════════════════════════════════════════════════════════════════════════════
echo 📝 LOGS DEL SISTEMA (Ctrl+C para detener):
echo ═══════════════════════════════════════════════════════════════════════════════
echo.

REM Iniciar servidor
node server.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Error iniciando servidor. Verifica los logs.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Sistema iniciado correctamente!
echo 📅 Hora de inicio: %date% %time%
echo.
pause