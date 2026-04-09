@echo off
title Assistente Digital D4630 - WhatsApp Bot
color 0A
echo.
echo ========================================
echo   ASSISTENTE DIGITAL D4630 - ROTARY
echo ========================================
echo.
echo   Funciona em PRIVADO e em GRUPOS!
echo.
echo   Aguarde o QR Code aparecer...
echo   Escaneie com WhatsApp para conectar.
echo.
echo   WhatsApp ^> 3 pontos ^> Aparelhos
echo   conectados ^> Conectar aparelho
echo.
echo ========================================
echo.
echo   COMO FUNCIONA EM GRUPOS:
echo   - Mencione "bot", "d4630" ou "assistente"
echo   - Digite um numero do menu (1-9, 0)
echo   - Pergunte sobre eventos, rotary, etc.
echo.
echo   DADOS ATUALIZADOS:
echo   - O bot recarrega os dados automaticamente
echo   - Para adicionar evento: !admin add evento [texto]
echo   - Para recarregar: !admin reload
echo.
echo ========================================
echo.
cd /d "%~dp0"
node index.js
echo.
echo Bot encerrado. Pressione qualquer tecla...
pause >nul
