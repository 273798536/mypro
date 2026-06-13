import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.pipeline import run_pipeline


def main():
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    run_pipeline(input_file)


if __name__ == "__main__":
    main()
