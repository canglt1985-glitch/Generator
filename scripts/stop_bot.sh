#!/bin/bash
# TVT3 Site & Contract Telegram Bot Stop Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/backend/logs/site_contract_bot.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "ℹ️ Không tìm thấy PID file. Đang kiểm tra tiến trình site_contract_bot..."
    PIDS=$(pgrep -f "backend/bots/site_contract_bot.py")
    if [ -z "$PIDS" ]; then
        echo "✅ Bot hiện không chạy."
        exit 0
    else
        kill $PIDS
        echo "🛑 Đã dừng tiến trình bot (PID: $PIDS)."
        exit 0
    fi
fi

PID=$(cat "$PID_FILE")
if ps -p "$PID" > /dev/null 2>&1; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "🛑 Đã dừng TVT3 Site & Contract Telegram Bot (PID: $PID)."
else
    echo "ℹ️ Tiến trình $PID không tồn tại. Đang dọn file PID..."
    rm -f "$PID_FILE"
fi
