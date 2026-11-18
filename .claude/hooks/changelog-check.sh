#!/usr/bin/env bash
# Changeset backstop for Claude Code sessions (.claude/settings.json).
#
#   changelog-check.sh start   SessionStart: remember what the tree looks like
#   changelog-check.sh stop    Stop: if code that ships to npm changed since
#                              then but no changeset in .changeset/ was added
#                              or edited, ask for one (or a reason there is
#                              none) — once per batch of changes, never in a
#                              loop.
#
# A changeset is this library's changelog entry: `bun run version` turns the
# pending ones into CHANGELOG.md, which feeds the GitHub Release and the docs
# site's What's new page.
#
# Fingerprints rather than `git diff HEAD`: the tree is routinely dirty with
# earlier work, including changesets, so "differs from HEAD" says nothing
# about this session. State lives under .git/, which is never committed.
set -euo pipefail
command -v jq >/dev/null || exit 0

input=$(cat)
session=$(jq -r '.session_id // empty' <<<"$input")
[ -n "$session" ] || exit 0
root=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}
cd "$root"

state_dir="$(git rev-parse --git-dir)/claude-changelog"
state="$state_dir/$session"
mkdir -p "$state_dir"
find "$state_dir" -type f -mtime +30 -delete 2>/dev/null || true

# What reaches people who install the package: the library source, the agent
# skill shipped in the tarball, the README shown on npm, and package.json
# (exports, engines, dependencies). Tests do not. The docs site deploys on
# every push to master without a release, so docs/ is not here.
paths=(src skills README.md package.json ':!*.test.ts')

code_fp() {
  {
    git diff HEAD -- "${paths[@]}"
    git ls-files -o --exclude-standard -z -- "${paths[@]}" | xargs -0 -r sha1sum
  } | sha1sum | cut -d' ' -f1
}
changeset_fp() {
  find .changeset -maxdepth 1 -name '*.md' ! -name README.md -print0 |
    sort -z | xargs -0 -r sha1sum | sha1sum | cut -d' ' -f1
}
save() { printf '%s %s\n' "$1" "$2" >"$state"; }

code=$(code_fp)
changesets=$(changeset_fp)

# The first sight of a session sets its baseline. SessionStart also fires on
# resume and after compaction with the same id; keeping the baseline then is
# what stops those from forgetting the session's earlier changes.
if [ ! -f "$state" ]; then
  save "$code" "$changesets"
  exit 0
fi
[ "${1:-}" = start ] && exit 0

read -r saved_code saved_changesets <"$state"
save "$code" "$changesets"

# Already asked once this turn; whatever Claude decided stands.
[ "$(jq -r '.stop_hook_active // false' <<<"$input")" = true ] && exit 0

if [ "$code" != "$saved_code" ] && [ "$changesets" = "$saved_changesets" ]; then
  cat >&2 <<'EOF'
Code that ships to npm changed this session, but no changeset in .changeset/
was added or edited. If people using the package would notice (a new or
changed API, different output, a bug fix, README or agent-skill text), write
one now by following .claude/skills/changelog/SKILL.md. If they would not (a
refactor, tests, a fix to something unreleased), or the changes are not from
this session (the user or another session working in this tree), say so in
one line and stop.
EOF
  exit 2
fi
exit 0
