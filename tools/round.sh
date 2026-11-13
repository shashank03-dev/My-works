#!/bin/bash
# usage: tools/round.sh NN [samples]
set -e
cd "$(dirname "$0")/.."
R=$1; S=${2:-16}
mkdir -p cook/stills/r$R cook/compare/r$R
node tools/build.mjs >/dev/null
node tools/render.mjs cook/stills/r$R/S01.png $S 2000
node .agents/skills/cook/scripts/side-by-side.mjs --out cook/compare/r$R/S01.jpg --height 667 --aspect 2000:1333 cook/refs/R01.png cook/stills/r$R/S01.png >/dev/null
python3 tools/metrics.py cook/refs/R01.png cook/stills/r$R/S01.png | tee cook/compare/r$R/metrics.txt
