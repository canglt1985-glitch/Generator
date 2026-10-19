#!/bin/bash
# TVT3 Site & Contract Telegram Bot Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/backend/logs/site_contract_bot.pid"
LOG_FILE="$PROJECT_ROOT/backend/logs/site_contract_bot.log"
PYTHON_BIN="$PROJECT_ROOT/.venv/bin/python3"

mkdir -p "$PROJECT_ROOT/backend/logs"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️ Bot đang chạy với PID: $PID"
        echo "Xem log tại: tail -f $LOG_FILE"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

echo "🚀 Đang khởi động TVT3 Site & Contract Telegram Bot..."
cd "$PROJECT_ROOT"
nohup "$PYTHON_BIN" backend/bots/site_contract_bot.py >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

sleep 2
if ps -p "$NEW_PID" > /dev/null 2>&1; then
    echo "✅ Bot đã khởi động thành công với PID: $NEW_PID"
    echo "📄 File log: $LOG_FILE"
    echo "💡 Lệnh xem log trực tiếp: tail -f $LOG_FILE"
else
    echo "❌ Khởi động thất bại. Vui lòng kiểm tra log: cat $LOG_FILE"
    exit 1
fi
