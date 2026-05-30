from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from sudoku_checker.models import BadRow, Board, Cell


def _parse_cell_token(token: str) -> tuple[Optional[int], set[int], str]:
    value = None
    candidates = set()
    annotation = ""

    stripped = token.strip()
    if not stripped or stripped in (".", "0", "_", "-"):
        return value, candidates, annotation

    if stripped.startswith("#"):
        return value, candidates, stripped[1:].strip()

    candidate_match = re.match(r'^[1-9]\{([^}]+)\}(.*)$', stripped)
    if candidate_match:
        value = int(stripped[0])
        cand_str = candidate_match.group(1)
        candidates = {int(x) for x in re.findall(r'[1-9]', cand_str)}
        annotation = candidate_match.group(2).strip()
        return value, candidates, annotation

    annotation_match = re.match(r'^(\d+)([✓✗✘×?！!！\*].*)$', stripped)
    if annotation_match:
        val_part = annotation_match.group(1)
        if len(val_part) == 1 and val_part.isdigit() and val_part != "0":
            value = int(val_part)
        annotation = annotation_match.group(2).strip()
        return value, candidates, annotation

    if len(stripped) == 1 and stripped.isdigit() and stripped != "0":
        value = int(stripped)
        return value, candidates, annotation

    multi_digit = re.match(r'^([1-9]{2,9})$', stripped)
    if multi_digit:
        candidates = {int(c) for c in multi_digit.group(1)}
        return value, candidates, annotation

    brace_match = re.match(r'^\{([^}]+)\}(.*)$', stripped)
    if brace_match:
        cand_str = brace_match.group(1)
        candidates = {int(x) for x in re.findall(r'[1-9]', cand_str)}
        annotation = brace_match.group(2).strip()
        return value, candidates, annotation

    if re.match(r'^[1-9]', stripped):
        m = re.match(r'^(\d)(.*)', stripped)
        if m:
            value = int(m.group(1))
            annotation = m.group(2).strip()
            return value, candidates, annotation

    return value, candidates, stripped


def _is_separator_line(line: str) -> bool:
    stripped = line.strip()
    return bool(re.match(r'^[-+|=]{3,}([-+|=]+\s*)+$', stripped))


def _is_comment_line(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("#") or stripped.startswith("//")


def _is_candidate_header(line: str) -> bool:
    stripped = line.strip().lower()
    return bool(re.match(r'^(候选|candidates?|cand)[:：]', stripped))


def _is_annotation_header(line: str) -> bool:
    stripped = line.strip().lower()
    return bool(re.match(r'^(批注|备注|批改|annotations?|notes|marks)[:：]', stripped))


def parse_board(text: str, source_file: str = "") -> Board:
    lines = text.split("\n")
    bad_rows: list[BadRow] = []
    rows: list[list[Cell]] = []
    candidate_rows: list[list[tuple[set[int], str]]] = []
    annotation_map: dict[tuple[int, int], str] = {}
    current_section = "board"
    board_row_count = 0
    candidate_row_idx = 0

    for line_idx, raw_line in enumerate(lines):
        line_num = line_idx + 1
        line = raw_line.rstrip()

        if not line.strip():
            continue

        if _is_comment_line(line):
            continue

        if _is_separator_line(line):
            continue

        if _is_candidate_header(line):
            current_section = "candidates"
            candidate_row_idx = 0
            continue

        if _is_annotation_header(line):
            current_section = "annotations"
            continue

        if current_section == "annotations":
            ann_match = re.match(
                r'^\s*(R?)(\d+)\s*[,:;]?\s*(C?)(\d+)\s*[,:：]\s*(.+)$', line.strip()
            )
            if ann_match:
                r = int(ann_match.group(2)) - 1
                c = int(ann_match.group(4)) - 1
                note = ann_match.group(5).strip()
                if 0 <= r < 9 and 0 <= c < 9:
                    annotation_map[(r, c)] = note
                else:
                    bad_rows.append(BadRow(line_num, raw_line, f"注解坐标超出范围: R{r+1}C{c+1}"))
            else:
                bad_rows.append(BadRow(line_num, raw_line, "无法解析批改备注行"))
            continue

        tokens = re.split(r'[\s|]+', line.strip())
        tokens = [t for t in tokens if t and t != "|"]

        if current_section == "board":
            if len(tokens) != 9:
                if len(tokens) < 1 or len(tokens) > 12:
                    bad_rows.append(
                        BadRow(line_num, raw_line, f"棋盘行列数异常: 得到{len(tokens)}列, 期望9列")
                    )
                    continue
                if len(tokens) != 9:
                    bad_rows.append(
                        BadRow(line_num, raw_line, f"棋盘行列数异常: 得到{len(tokens)}列, 期望9列")
                    )
                    continue

            row_cells: list[Cell] = []
            row_valid = True
            for ci, token in enumerate(tokens):
                value, candidates, annotation = _parse_cell_token(token)
                if value is None and not candidates and annotation and not annotation.startswith("#"):
                    if not re.match(r'^[✓✗✘×?！!！\*]', annotation):
                        row_valid = False
                        break
                cell = Cell(row=board_row_count, col=ci, value=value, candidates=candidates, annotation=annotation)
                row_cells.append(cell)

            if not row_valid or len(row_cells) != 9:
                bad_rows.append(BadRow(line_num, raw_line, "棋盘行内容无法解析"))
                continue

            rows.append(row_cells)
            board_row_count += 1

        elif current_section == "candidates":
            if len(tokens) != 9:
                bad_rows.append(
                    BadRow(line_num, raw_line, f"候选数行列数异常: 得到{len(tokens)}列, 期望9列")
                )
                continue

            cand_row: list[tuple[set[int], str]] = []
            for token in tokens:
                _, candidates, annotation = _parse_cell_token(token)
                cand_row.append((candidates, annotation))
            candidate_rows.append(cand_row)
            candidate_row_idx += 1

    if len(rows) < 9:
        for i in range(len(rows), 9):
            rows.append([Cell(row=i, col=j) for j in range(9)])

    for cr_idx, cand_row in enumerate(candidate_rows):
        if cr_idx < 9:
            for cc_idx, (cands, ann) in enumerate(cand_row):
                if cc_idx < 9:
                    if cands:
                        rows[cr_idx][cc_idx].candidates = rows[cr_idx][cc_idx].candidates | cands
                    if ann:
                        if rows[cr_idx][cc_idx].annotation:
                            rows[cr_idx][cc_idx].annotation += "; " + ann
                        else:
                            rows[cr_idx][cc_idx].annotation = ann

    for (r, c), note in annotation_map.items():
        if rows[r][c].annotation:
            rows[r][c].annotation += "; " + note
        else:
            rows[r][c].annotation = note

    return Board(cells=rows[:9], bad_rows=bad_rows, source_file=source_file)


def parse_file(filepath: str) -> Board:
    path = Path(filepath)
    text = path.read_text(encoding="utf-8")
    return parse_board(text, source_file=filepath)


def parse_directory(dirpath: str) -> list[tuple[str, Board]]:
    path = Path(dirpath)
    results = []
    for fp in sorted(path.glob("*.txt")):
        board = parse_file(str(fp))
        results.append((fp.name, board))
    for fp in sorted(path.glob("*.csv")):
        board = parse_file(str(fp))
        results.append((fp.name, board))
    return results
