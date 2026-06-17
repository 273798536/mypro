"""让包可以通过 python -m db_migration_replayer 运行。"""
from .cli import main

if __name__ == "__main__":
    main()
