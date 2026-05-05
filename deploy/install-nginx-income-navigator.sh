#!/usr/bin/env bash
set -euo pipefail

SITE=${SITE:-/etc/nginx/sites-available/quenos.ai}
SNIPPET=${SNIPPET:-/home/coen/projects/income-navigator/deploy/nginx-income-navigator-location.conf}
MARKER_START="# BEGIN income-navigator proxy"
MARKER_END="# END income-navigator proxy"

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo/root: sudo bash $0" >&2
  exit 1
fi

if [[ ! -f "$SITE" ]]; then
  echo "Nginx site file not found: $SITE" >&2
  exit 1
fi

if [[ ! -f "$SNIPPET" ]]; then
  echo "Snippet not found: $SNIPPET" >&2
  exit 1
fi

backup="${SITE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$SITE" "$backup"
echo "Backup written to $backup"

python3 - "$SITE" "$SNIPPET" "$MARKER_START" "$MARKER_END" <<'PY'
from pathlib import Path
import sys

site = Path(sys.argv[1])
snippet = Path(sys.argv[2]).read_text().rstrip()
start = sys.argv[3]
end = sys.argv[4]
text = site.read_text()
block = f"    {start}\n" + "\n".join(f"    {line}" if line else "" for line in snippet.splitlines()) + f"\n    {end}\n"

if start in text and end in text:
    before = text.split(start)[0]
    after = text.split(end, 1)[1]
    text = before.rstrip() + "\n" + block + after
else:
    needle = "    location / {\n        try_files $uri $uri/ =404;\n    }"
    if needle not in text:
        raise SystemExit("Could not find the root location block to insert before; restore backup and edit manually.")
    text = text.replace(needle, block + "\n" + needle, 1)

site.write_text(text)
PY

nginx -t
systemctl reload nginx
echo "Installed. Proxy should be available at https://quenos.ai/income-navigator/ when the app is running on 127.0.0.1:3000."
