@echo off
echo Starting local web server...
echo Go to: http://localhost:8080/html/index.html
echo Press Ctrl+C to stop the server.
start http://localhost:8080/html/index.html
python -m http.server 8080
