@echo off
chcp 65001 >nul
echo ===================================================
echo   IDSS Timetable - Push na GitHub
echo ===================================================
echo.

where git >nul 2>nul
if errorlevel 1 goto nogit
goto hasgit

:nogit
echo GRESKA: Git nije instaliran na ovom racunaru.
echo.
echo Prvo instaliraj Git:
echo   1. Idi na https://git-scm.com/download/win
echo   2. Preuzmi i pokreni instalaciju - sve podrazumijevane
echo      opcije su OK, samo klikni Next na svakom koraku.
echo   3. Nakon instalacije ZATVORI ovaj prozor i ponovo
echo      pokreni OVAJ ISTI fajl.
echo.
pause
exit /b 1

:hasgit
echo Git je pronadjen. Nastavljam...
echo.

cd /d "%~dp0"
echo Radim u folderu: %cd%
echo.

if exist ".git" goto skipinit
echo Pokrecem git init...
git init
git branch -M main
goto afterinit

:skipinit
echo Git repozitorij vec postoji ovdje, preskacem init.

:afterinit
echo.
echo Postavljam vezu ka GitHub repozitoriju...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/IDSS123a/time-table.git

echo.
echo Dodajem sve fajlove...
git add -A

echo.
echo Pravim commit...
git commit -m "IDSS Timetable - kompletan projekat"

echo.
echo ===================================================
echo   Sada slijedi PUSH na GitHub.
echo   Mozda ce se otvoriti prozor u browseru da se
echo   ulogujes na svoj GitHub nalog - to je normalno,
echo   uloguj se i vrati se ovdje.
echo ===================================================
echo.
pause

git push -u origin main --force

echo.
echo ===================================================
if errorlevel 1 goto pushfail
echo GOTOVO! Projekat je na https://github.com/IDSS123a/time-table
goto theend

:pushfail
echo NESTO NIJE USPJELO. Kopiraj mi CIJELI tekst iznad.

:theend
echo ===================================================
pause
