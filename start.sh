#!/bin/bash
echo ""
echo "Frontend .env should contain:"
echo "VITE_USE_MOCKS=false"
echo "VITE_API_BASE_URL=http://localhost:8000"
echo ""

if [ -f ".venv/Scripts/python.exe" ]; then
    PYTHON_BIN=".venv/Scripts/python.exe"
elif [ -f ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
else
    PYTHON_BIN="python"
fi

$PYTHON_BIN -m uvicorn backend.app:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

npm --prefix frontend run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
