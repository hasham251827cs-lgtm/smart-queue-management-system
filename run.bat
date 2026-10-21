@echo off
echo Starting Smart Queue... open http://localhost:8080 in Chrome
java -cp sqlite-jdbc.jar Server.java
pause
