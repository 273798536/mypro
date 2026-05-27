"""Command-line interface for Sudoku operations."""

import argparse
import json
import sys
from sudoku.board import Board, deserialize, GRID_SIZE
from sudoku.solver import solve, count_solutions, has_unique_solution
from sudoku.generator import generate_puzzle, GenerationConfig, VALID_SYMMETRIES
from sudoku.steps import solve_with_steps, score_puzzle
from sudoku.bank import (
    load_bank, save_bank, add_puzzle, find_duplicates,
    export_bank, add_correction, get_statistics,
)


def _format_grid(board: Board) -> str:
    return board.serialize()


def cmd_generate(args):
    config = GenerationConfig(
        difficulty=args.difficulty,
        min_givens=args.min_givens,
        max_givens=args.max_givens,
        symmetry=args.symmetry,
        target_score_range=(args.score_min, args.score_max) if args.score_min is not None else None,
        max_attempts=args.max_attempts,
    )
    result = generate_puzzle(config, seed=args.seed)

    if not result.success:
        print(f"ERROR: {result.error}", file=sys.stderr)
        for w in result.warnings:
            print(f"  WARNING: {w}", file=sys.stderr)
        sys.exit(1)

    print(f"Puzzle: {result.puzzle.serialize()}")
    print(f"Solution: {result.solution.serialize()}")
    print(f"Difficulty: {result.difficulty} (score: {result.score})")
    print(f"Givens: {result.givens_count}  Symmetry: {result.symmetry_used}  Attempts: {result.attempts}")
    for w in result.warnings:
        print(f"  WARNING: {w}", file=sys.stderr)

    if args.save:
        record = add_puzzle(
            result.puzzle, result.solution,
            result.difficulty, result.score,
            result.symmetry_used, args.source or "cli",
        )
        print(f"Saved as: {record.id}")
        if record.corrections and any(c.get("type") == "duplicate_detected" for c in record.corrections):
            print(f"  NOTE: Duplicate of existing puzzle", file=sys.stderr)


def cmd_verify(args):
    board = _load_board(args)
    valid = board.is_valid()
    count = count_solutions(board, limit=2)
    print(f"Valid: {valid}")
    print(f"Unique: {count == 1}")
    print(f"Solutions: {count}")
    print(f"Givens: {board.givens_count()}  Empty: {len(board.empty_cells())}")
    if not valid:
        print("ERROR: Board has conflicts", file=sys.stderr)
        sys.exit(1)
    if count != 1:
        print(f"ERROR: Puzzle has {count} solution(s) - must be exactly 1", file=sys.stderr)
        sys.exit(1)


def cmd_solve(args):
    board = _load_board(args)
    result = solve(board, count_limit=1)
    if result.solution:
        print(f"Solution: {result.solution.serialize()}")
        if args.grid:
            _print_grid(result.solution)
        print(f"Nodes explored: {result.nodes_explored}")
    else:
        print("ERROR: No solution found", file=sys.stderr)
        sys.exit(1)


def cmd_steps(args):
    board = _load_board(args)
    result = solve_with_steps(board, max_steps=args.max_steps)
    print(f"Solved: {result.solved}")
    print(f"Difficulty: {result.difficulty} (score: {result.score})")
    print(f"Techniques: {json.dumps(result.technique_counts, ensure_ascii=False)}")
    print(f"Steps: {len(result.steps)}")
    for i, step in enumerate(result.steps, 1):
        cells = ",".join(f"R{r+1}C{c+1}" for r, c in step.cells_affected) or "-"
        print(f"  {i:3d}. [{step.technique}] {step.description} (cells: {cells})")


def cmd_score(args):
    board = _load_board(args)
    result = score_puzzle(board)
    print(f"Score: {result.score}")
    print(f"Difficulty: {result.difficulty}")
    print(f"Techniques: {json.dumps(result.technique_counts, ensure_ascii=False)}")


def cmd_bank_list(args):
    records = load_bank()
    if not records:
        print("(empty bank)")
        return
    for r in records:
        print(f"{r.id}  {r.difficulty:8s}  score={r.score:7.1f}  givens={r.givens_count:2d}  sym={r.symmetry:12s}  src={r.source}")
        for c in r.corrections:
            print(f"  ^ correction: {c.get('type')} - {c.get('note', '')}")


def cmd_bank_stats(args):
    stats = get_statistics()
    print(json.dumps(stats, indent=2, ensure_ascii=False))


def cmd_bank_duplicates(args):
    records = load_bank()
    dupes = find_duplicates(records)
    if not dupes:
        print("No duplicates found.")
        return
    for h, recs in dupes.items():
        print(f"Hash {h[:16]}...:")
        for r in recs:
            print(f"  {r.id}  {r.difficulty}  score={r.score}")


def cmd_bank_export(args):
    records = load_bank()
    try:
        content = export_bank(records, format=args.format)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Exported to {args.output}")
    else:
        print(content)


def cmd_bank_correct(args):
    record = add_correction(args.id, args.type, args.note or "")
    if record:
        print(f"Correction added to {record.id}")
    else:
        print(f"ERROR: Record {args.id} not found", file=sys.stderr)
        sys.exit(1)


def _load_board(args) -> Board:
    if args.puzzle:
        s = args.puzzle.strip().replace(".", "0")
        if len(s) != GRID_SIZE * GRID_SIZE:
            print(f"ERROR: Puzzle string must be {GRID_SIZE * GRID_SIZE} chars", file=sys.stderr)
            sys.exit(1)
        return deserialize(s)
    if args.file:
        with open(args.file, "r") as f:
            content = f.read().strip()
        return deserialize(content)
    print("ERROR: Must provide --puzzle or --file", file=sys.stderr)
    sys.exit(1)


def _print_grid(board: Board):
    for r in range(GRID_SIZE):
        row = ""
        for c in range(GRID_SIZE):
            v = board.grid[r][c]
            row += str(v) if v else "."
            if c in (2, 5):
                row += "|"
        print(" ".join(row))
        if r in (2, 5):
            print("-" * 19)


def main():
    parser = argparse.ArgumentParser(prog="sudoku", description="Sudoku puzzle generator and solver")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    gen_p = subparsers.add_parser("generate", help="Generate a puzzle")
    gen_p.add_argument("--difficulty", "-d", default="Any",
                       choices=["Any", "Easy", "Medium", "Hard", "Expert", "Master"])
    gen_p.add_argument("--min-givens", type=int, default=24)
    gen_p.add_argument("--max-givens", type=int, default=40)
    gen_p.add_argument("--symmetry", "-s", default="rotational",
                       choices=list(VALID_SYMMETRIES))
    gen_p.add_argument("--score-min", type=float, default=None)
    gen_p.add_argument("--score-max", type=float, default=None)
    gen_p.add_argument("--max-attempts", type=int, default=5000)
    gen_p.add_argument("--seed", type=int, default=None)
    gen_p.add_argument("--save", action="store_true", help="Save to puzzle bank")
    gen_p.add_argument("--source", default=None, help="Source tag for bank storage")

    ver_p = subparsers.add_parser("verify", help="Verify a puzzle has unique solution")
    ver_p.add_argument("--puzzle", "-p", help="81-char puzzle string")
    ver_p.add_argument("--file", "-f", help="File with puzzle string")

    sol_p = subparsers.add_parser("solve", help="Solve a puzzle")
    sol_p.add_argument("--puzzle", "-p", help="81-char puzzle string")
    sol_p.add_argument("--file", "-f", help="File with puzzle string")
    sol_p.add_argument("--grid", action="store_true", help="Print grid layout")

    stp_p = subparsers.add_parser("steps", help="Show step-by-step solution")
    stp_p.add_argument("--puzzle", "-p", help="81-char puzzle string")
    stp_p.add_argument("--file", "-f", help="File with puzzle string")
    stp_p.add_argument("--max-steps", type=int, default=500)

    scr_p = subparsers.add_parser("score", help="Score a puzzle's difficulty")
    scr_p.add_argument("--puzzle", "-p", help="81-char puzzle string")
    scr_p.add_argument("--file", "-f", help="File with puzzle string")

    bk_p = subparsers.add_parser("bank", help="Puzzle bank operations")
    bk_sub = bk_p.add_subparsers(dest="bank_cmd")

    bk_list = bk_sub.add_parser("list", help="List all puzzles")
    bk_stats = bk_sub.add_parser("stats", help="Show bank statistics")
    bk_dup = bk_sub.add_parser("duplicates", help="Find duplicate puzzles")

    bk_exp = bk_sub.add_parser("export", help="Export puzzle bank")
    bk_exp.add_argument("--format", "-f", default="json", choices=["json", "csv", "grid"])
    bk_exp.add_argument("--output", "-o", help="Output file (stdout if omitted)")

    bk_cor = bk_sub.add_parser("correct", help="Add correction to a puzzle record")
    bk_cor.add_argument("id", help="Puzzle record ID")
    bk_cor.add_argument("--type", "-t", required=True, help="Correction type")
    bk_cor.add_argument("--note", "-n", help="Correction note")

    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(args)
    elif args.command == "verify":
        cmd_verify(args)
    elif args.command == "solve":
        cmd_solve(args)
    elif args.command == "steps":
        cmd_steps(args)
    elif args.command == "score":
        cmd_score(args)
    elif args.command == "bank":
        if args.bank_cmd == "list":
            cmd_bank_list(args)
        elif args.bank_cmd == "stats":
            cmd_bank_stats(args)
        elif args.bank_cmd == "duplicates":
            cmd_bank_duplicates(args)
        elif args.bank_cmd == "export":
            cmd_bank_export(args)
        elif args.bank_cmd == "correct":
            cmd_bank_correct(args)
        else:
            bk_p.print_help()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
