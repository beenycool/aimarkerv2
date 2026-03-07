#!/usr/bin/env python3
"""
Process open PRs: merge those without review comments, apply suggestions and merge those with comments.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = "beenycool/aimarkerv2"
BASE_DIR = Path("/home/ubuntu/projects/aimarkerv2")


def run(cmd, cwd=BASE_DIR, check=True):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")
    return result


def gh_api(path):
    result = run(["gh", "api", f"repos/{REPO}/{path}"], check=False)
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def get_open_prs():
    result = run(["gh", "pr", "list", "--state", "open", "--json", "number,headRefName,title"])
    return json.loads(result.stdout)


def get_review_comments(pr_num):
    data = gh_api(f"pulls/{pr_num}/comments")
    return data if data else []


def extract_suggestion(body):
    match = re.search(r"```suggestion\n(.*?)```", body, re.DOTALL)
    if match:
        return match.group(1).rstrip()
    return None


def apply_suggestion(filepath, start_line, end_line, suggestion_text):
    path = BASE_DIR / filepath
    if not path.exists():
        print(f"  File not found: {filepath}")
        return False
    lines = path.read_text().splitlines(keepends=True)
    # Convert to 0-based
    start_idx = start_line - 1
    end_idx = end_line  # exclusive
    if start_idx < 0 or end_idx > len(lines):
        print(f"  Line range {start_line}-{end_line} out of bounds for {len(lines)} lines")
        return False
    # Ensure suggestion ends with newline if replacing multi-line
    if not suggestion_text.endswith("\n"):
        suggestion_text += "\n"
    new_lines = lines[:start_idx] + [suggestion_text] + lines[end_idx:]
    path.write_text("".join(new_lines))
    return True


def process_pr(pr):
    pr_num = pr["number"]
    branch = pr["headRefName"]
    title = pr["title"]
    print(f"\n{'='*60}")
    print(f"PR #{pr_num}: {title[:50]}...")
    print(f"Branch: {branch}")

    comments = get_review_comments(pr_num)
    if not comments:
        print("  No review comments - merging directly")
        run(["gh", "pr", "merge", str(pr_num), "--squash", "--delete-branch"])
        return True

    # Fetch and checkout branch
    run(["git", "fetch", "origin", branch])
    run(["git", "checkout", branch])

    # Get suggestions - sort by line descending so we apply from bottom up
    suggestions = []
    for c in comments:
        sug = extract_suggestion(c.get("body", ""))
        if sug:
            start = c.get("start_line") or c.get("original_start_line")
            end = c.get("line") or c.get("original_line")
            if start is None or end is None:
                continue
            suggestions.append({"path": c["path"], "start_line": start, "line": end, "text": sug})

    if not suggestions:
        print("  No suggestions to apply (comments without code suggestions)")
        run(["git", "checkout", "main"])
        return False

    # Sort by (path, line) descending for bottom-up application
    suggestions.sort(key=lambda x: (x["path"], -(x["line"] or 0)))

    applied = 0
    for s in suggestions:
        if apply_suggestion(s["path"], s["start_line"], s["line"], s["text"]):
            applied += 1
            print(f"  Applied suggestion to {s['path']} lines {s['start_line']}-{s['line']}")

    if applied == 0:
        print("  Failed to apply any suggestions")
        run(["git", "checkout", "main"])
        return False

    # Commit and push
    run(["git", "add", "-A"])
    run(["git", "status"])
    run(["git", "commit", "-m", "Apply review suggestions"])
    run(["git", "push", "origin", branch])

    # Merge
    run(["gh", "pr", "merge", str(pr_num), "--squash", "--delete-branch"])

    run(["git", "checkout", "main"])
    return True


def main():
    run(["git", "checkout", "main"])
    run(["git", "pull", "origin", "main"])

    prs = get_open_prs()
    if len(sys.argv) > 1:
        pr_nums = [int(x) for x in sys.argv[1:]]
        prs = [p for p in prs if p["number"] in pr_nums]
        print(f"Processing {len(prs)} specified PR(s)")
    else:
        print(f"Found {len(prs)} open PRs")

    for pr in prs:
        try:
            process_pr(pr)
        except Exception as e:
            print(f"  FAILED: {e}")
            run(["git", "checkout", "main"], check=False)
            continue


if __name__ == "__main__":
    main()
