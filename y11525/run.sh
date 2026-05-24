#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PYTHONPATH="$SCRIPT_DIR/src:$PYTHONPATH"

case "$1" in
    api)
        python -m uvicorn customs_statemachine.api:app --host 0.0.0.0 --port 8000 --reload
        ;;
    cli)
        shift
        python -m customs_statemachine.cli "$@"
        ;;
    init)
        python -c "from customs_statemachine.database import init_db; init_db(); print('Database initialized')"
        ;;
    *)
        echo "Usage: $0 {api|cli|init}"
        echo "  api     - Start API server"
        echo "  cli     - Run CLI commands"
        echo "  init    - Initialize database"
        exit 1
        ;;
esac
