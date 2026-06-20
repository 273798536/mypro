import sys
from drum_beat_align.models import init_db
from drum_beat_align.api import app


def main():
    init_db()
    app.run(host="0.0.0.0", port=5050, debug=True)


if __name__ == "__main__":
    main()
