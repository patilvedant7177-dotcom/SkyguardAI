#!/bin/bash
echo ""
echo "Frontend .env should contain:"
echo "VITE_USE_MOCKS=false"
echo "VITE_API_BASE_URL=http://localhost:8000"
echo ""

python -m uvicorn backend.app:app --reload --port 8000 &
BACKEND_PID=$!

npm --prefix frontend run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
