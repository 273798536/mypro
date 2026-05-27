"""Flask API for Sudoku generation, verification, solving, and bank management."""

import json
from flask import Flask, request, jsonify, render_template
from sudoku.board import Board, deserialize, GRID_SIZE
from sudoku.solver import solve, count_solutions, has_unique_solution
from sudoku.generator import generate_puzzle, GenerationConfig, VALID_SYMMETRIES
from sudoku.steps import solve_with_steps, score_puzzle, compute_score
from sudoku.bank import (
    load_bank, save_bank, add_puzzle, find_duplicates,
    export_bank, add_correction, get_statistics, find_by_hash,
)

app = Flask(__name__)


def _error_response(message: str, status: int = 400, details: dict = None):
    body = {"error": message}
    if details:
        body["details"] = details
    return jsonify(body), status


def _parse_grid_from_request():
    data = request.get_json(silent=True)
    if not data:
        return None, _error_response("Request body must be JSON")
    grid = data.get("grid")
    puzzle = data.get("puzzle")
    if grid:
        if len(grid) != GRID_SIZE or any(len(row) != GRID_SIZE for row in grid):
            return None, _error_response(f"Grid must be {GRID_SIZE}x{GRID_SIZE}")
        return Board.from_grid(grid), None
    if puzzle:
        if len(puzzle) != GRID_SIZE * GRID_SIZE:
            return None, _error_response(f"Puzzle string must be {GRID_SIZE * GRID_SIZE} characters")
        return deserialize(puzzle), None
    return None, _error_response("Must provide 'grid' (9x9 list) or 'puzzle' (81-char string)")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(silent=True) or {}
    config = GenerationConfig(
        difficulty=data.get("difficulty", "Any"),
        min_givens=data.get("min_givens", 24),
        max_givens=data.get("max_givens", 40),
        symmetry=data.get("symmetry", "rotational"),
        target_score_range=tuple(data["target_score_range"]) if data.get("target_score_range") else None,
        max_attempts=data.get("max_attempts", 5000),
    )
    seed = data.get("seed")
    result = generate_puzzle(config, seed=seed)

    if not result.success:
        return jsonify(result.to_dict()), 500

    if request.args.get("save") != "false":
        source = data.get("source", "api")
        record = add_puzzle(
            result.puzzle, result.solution,
            result.difficulty, result.score,
            result.symmetry_used, source,
        )
        result_dict = result.to_dict()
        result_dict["record_id"] = record.id
        result_dict["duplicate"] = len(record.corrections) > 0 and any(
            c.get("type") == "duplicate_detected" for c in record.corrections
        )
        return jsonify(result_dict)

    return jsonify(result.to_dict())


@app.route("/api/verify", methods=["POST"])
def api_verify():
    board, err = _parse_grid_from_request()
    if err:
        return err
    if not board.is_valid():
        return jsonify({
            "valid": False,
            "unique": False,
            "solution_count": 0,
            "reason": "Board contains conflicts",
        })
    count = count_solutions(board, limit=2)
    return jsonify({
        "valid": board.is_valid(),
        "unique": count == 1,
        "solution_count": count,
        "givens_count": board.givens_count(),
        "empty_cells": len(board.empty_cells()),
    })


@app.route("/api/solve", methods=["POST"])
def api_solve():
    board, err = _parse_grid_from_request()
    if err:
        return err
    result = solve(board, count_limit=1)
    if result.solution:
        return jsonify({
            "solved": True,
            "solution": result.solution.to_list(),
            "solution_str": result.solution.serialize(),
            "nodes_explored": result.nodes_explored,
        })
    return jsonify({"solved": False, "reason": "No solution found"})


@app.route("/api/steps", methods=["POST"])
def api_steps():
    board, err = _parse_grid_from_request()
    if err:
        return err
    max_steps = request.args.get("max_steps", 500, type=int)
    result = solve_with_steps(board, max_steps=max_steps)
    return jsonify(result.to_dict())


@app.route("/api/score", methods=["POST"])
def api_score():
    board, err = _parse_grid_from_request()
    if err:
        return err
    result = score_puzzle(board)
    return jsonify({
        "score": result.score,
        "difficulty": result.difficulty,
        "technique_counts": result.technique_counts,
    })


@app.route("/api/bank", methods=["GET"])
def api_bank():
    records = load_bank()
    return jsonify({
        "count": len(records),
        "puzzles": [r.to_dict() for r in records],
    })


@app.route("/api/bank/stats", methods=["GET"])
def api_bank_stats():
    return jsonify(get_statistics())


@app.route("/api/bank/duplicates", methods=["GET"])
def api_bank_duplicates():
    records = load_bank()
    dupes = find_duplicates(records)
    return jsonify({
        "duplicate_groups": len(dupes),
        "groups": [
            {
                "canonical_hash": h,
                "records": [
                    {"id": r.id, "difficulty": r.difficulty, "score": r.score}
                    for r in recs
                ],
            }
            for h, recs in dupes.items()
        ],
    })


@app.route("/api/bank/export", methods=["GET"])
def api_bank_export():
    fmt = request.args.get("format", "json")
    records = load_bank()
    try:
        content = export_bank(records, format=fmt)
    except ValueError as e:
        return _error_response(str(e))
    if fmt == "json":
        return app.response_class(
            content, mimetype="application/json",
            headers={"Content-Disposition": "attachment; filename=bank.json"},
        )
    elif fmt == "csv":
        return app.response_class(
            content, mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=bank.csv"},
        )
    else:
        return app.response_class(content, mimetype="text/plain")


@app.route("/api/bank/<record_id>/correction", methods=["POST"])
def api_bank_correction(record_id: str):
    data = request.get_json(silent=True) or {}
    correction_type = data.get("type", "")
    note = data.get("note", "")
    if not correction_type:
        return _error_response("Correction 'type' is required")
    record = add_correction(record_id, correction_type, note)
    if record:
        return jsonify(record.to_dict())
    return _error_response(f"Record {record_id} not found", 404)


@app.route("/api/bank/<record_id>", methods=["DELETE"])
def api_bank_delete(record_id: str):
    records = load_bank()
    remaining = [r for r in records if r.id != record_id]
    if len(remaining) == len(records):
        return _error_response(f"Record {record_id} not found", 404)
    save_bank(remaining)
    return jsonify({"deleted": record_id})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
