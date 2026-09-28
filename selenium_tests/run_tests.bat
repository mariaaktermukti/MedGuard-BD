@echo off
title MedGuard-BD Selenium Dashboard Test Runner
echo =======================================================
echo   MedGuard-BD Selenium Automated Dashboard Tester
echo =======================================================
echo.
echo Select Mode:
echo [1] Run in Background (Headless Mode - Fast)
echo [2] Run in Live Browser (Visible Mode - Best for Demo)
echo.
set /p mode="Enter choice (1 or 2, default is 1): "

if "%mode%"=="2" (
    echo.
    echo Running Selenium Tests in Visible Chrome Browser...
    python "%~dp0test_dashboards.py" --visible
) else (
    echo.
    echo Running Selenium Tests in Headless Mode...
    python "%~dp0test_dashboards.py"
)

echo.
pause
