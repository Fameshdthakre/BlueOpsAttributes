#!/bin/bash
uvicorn api.index:app --host 127.0.0.1 --port 8000 &
npm run dev > dev.log 2>&1 &
