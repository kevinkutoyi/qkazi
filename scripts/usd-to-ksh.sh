#!/usr/bin/env bash
#
# usd-to-ksh.sh — convert every hard-coded USD ($) display in the Qkazi
# frontend to Kenyan Shillings (KSh).
#
# WHY THIS ISN'T A ONE-LINE sed:
#   In TS/JSX, `${expr}` is overwhelmingly a template-literal / JSX
#   expression — NOT a currency symbol. A blind `s/\$/KSh/` would corrupt
#   every interpolation in the codebase. This script only touches the
#   genuine money symbols, using:
#     - exact, expression-anchored matches for JSX literal-$ amounts, and
#     - a negative lookbehind so it never eats the 2nd `$` of a `$${...}`.
#
# It is SINGLE-RUN. It refuses to run again once applied (guard below),
# because the template-literal money strings legitimately keep their `$`
# (e.g. `KSh ${x}`), which a second pass couldn't distinguish from JSX.
#
# Money rendered through formatMoney()/formatWholeAmount() already shows KSh
# (DEFAULT_CURRENCY=KES), so those sites are left alone.
#
# Review afterwards with:  git diff
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/src"

if [ ! -d "$SRC" ]; then
  echo "✗ Couldn't find $SRC — run this from inside the Qkazi repo." >&2
  exit 1
fi

# --- idempotency guard --------------------------------------------------
# `KSh ${` only exists after this script has run (template money strings).
if grep -rqF 'KSh ${' "$SRC"; then
  echo "✗ Looks like the conversion already ran (found 'KSh \${' in src/)."
  echo "  Aborting to avoid double-applying. Use 'git checkout -- src' to redo."
  exit 1
fi

command -v perl >/dev/null || { echo "✗ perl is required"; exit 1; }

# Collect all TS/TSX files.
mapfile -t FILES < <(find "$SRC" -type f \( -name '*.ts' -o -name '*.tsx' \))
echo "→ Scanning ${#FILES[@]} files…"

# -----------------------------------------------------------------------
# Rule B FIRST: JSX literal-$ money expressions, e.g. `${task.budget}` in
# JSX text → `KSh {task.budget}`. The (?<!\$) lookbehind skips the inner
# `${...}` of a `$${...}` template string (handled by Rule A next).
# -----------------------------------------------------------------------
for EXPR in \
  'task.budget' \
  'b.task.budget' \
  't.budget' \
  'offerDollars.toFixed(0)' \
  'profile.hourlyRate' \
  't.taskerProfile.hourlyRate' \
  'props.taskBudget' \
  'amt' ; do
  EXPR="$EXPR" perl -i -pe '
    my $raw = $ENV{EXPR};
    my $q   = quotemeta($raw);
    s/(?<!\$)\$\{$q\}/KSh {$raw}/g;
  ' "${FILES[@]}"
done

# -----------------------------------------------------------------------
# Rule A: template double-dollar  `$${expr}`  →  `KSh ${expr}`
# (literal $ immediately before an interpolation — always currency).
# -----------------------------------------------------------------------
perl -i -pe 's/\$\$\{/KSh \$\{/g' "${FILES[@]}"

# -----------------------------------------------------------------------
# Rule D: literal money strings.
# -----------------------------------------------------------------------
perl -i -pe 's/\$180/KSh 180/g' "${FILES[@]}"           # landing-page demo card
perl -i -pe 's/"\$(\d+)\/hr"/"KSh $1\/hr"/g' "${FILES[@]}"  # "$22/hr" demo rates
perl -i -pe 's/\$15/KSh 15/g; s/\$40/KSh 40/g' "${FILES[@]}" # "charge $15–$40/hr"
perl -i -pe 's/greater than \$0/greater than KSh 0/g' "${FILES[@]}" # validation msgs

# -----------------------------------------------------------------------
# Rule E: "(USD)" field labels  →  "(KSh)"
# -----------------------------------------------------------------------
perl -i -pe 's/\(USD\)/(KSh)/g' "${FILES[@]}"

# -----------------------------------------------------------------------
# Rule C: the standalone `$` prefix inside the price/budget inputs, plus
# widen the input left-padding so "KSh" doesn't overlap the value.
# Scoped to the two files that have these inputs.
# -----------------------------------------------------------------------
for f in \
  "$SRC/app/tasks/new/NewTaskForm.tsx" \
  "$SRC/app/tasks/[id]/TaskActions.tsx" ; do
  [ -f "$f" ] || continue
  perl -i -pe 's/^(\s*)\$\s*$/${1}KSh/' "$f"   # the lone "$" line in the prefix span
  perl -i -pe 's/input pl-7/input pl-12/g' "$f" # room for the wider prefix
done

echo "✓ Done. Review with:  git diff"
echo "  Then sanity-check the build:  npm run build   (or npx tsc --noEmit)"
