# Cook ledger: Red Plain

Copy this to `cook/ROUNDS.md` at the start of a run. Keep the header current. Add one round entry per round, newest at the bottom. Label every number as measured or eyeballed.

Started: [YYYY-MM-DD HH:MM, timezone]
Time: floor [8h] | cap [none]
Bar: composition [99.9] | light [99.9] | color [99.9] | materials [99.9] | detail [99.9] | motion [9/10]
Calibration offset: [none yet] (from [user estimate, date])
Usage: [5h window], about 20% per hour, never 100%
Gate: stills approved [no] | final render [not started]
Best so far: round [N], `cook/stills/r[NN]/`, [commit or snapshot]

## Decisions

Made without asking, one line each.
- [time] [decision], because [reason]

## User feedback inbox

Exact words. Close an item only when a still or clip proves it.
- [time] "[quote]" | round [N] | [open / done, proof: path]

---

## Round [NN]

Time: [start] to [end] | total elapsed [h]
Usage: [% of window at the end of the round, or "not readable"]
Focus: [shot and dimension], because [user feedback / lowest score / largest gap]

Changes:
- [what changed, where]

Stills: `cook/stills/r[NN]/` | Side by side: `cook/compare/r[NN]/`

Scores, eyeballed: critic median after calibration ([n] critics, [models or "same model"])

| Shot | Comp | Light | Color | Materials | Detail | Motion | vs last round |
|---|---|---|---|---|---|---|---|
| S01 | | | | | | | |
| S02 | | | | | | | |

Raw critic medians before calibration: [ ]
Own score (logged, never decides): [ ]

Measured (command and result):
- [color check S01: saturation delta [+/-0.00], brightness delta [+/-0.00]]
- [render: [N] s per frame at [resolution], [N] sub-frames]

Not checked this round:
- [what, and why]

Top gaps from critics:
1. [shot, region, what is wrong, what to change]
2. [ ]
3. [ ]

Progress note sent: [time]
Stop check: bar [no] | floor [no] | stills approved [no] | final checked [no] -> [next round / ship / stop at cap]
Next focus: [ ]

## Decisions (run log)
- 10:24 Intake skipped: prompt already sets target (1:1 recreation), bar (99%), assets (all from scratch) and leaves method to me. Defaults applied, logged in BRIEF.md.
- 10:30 Stack: one HTML page with a WebGL2 fragment shader, rendered offline in headless Chromium with jittered supersampling. Painted 2D scene, not 3D, because the target is a single fixed painting.
- 10:35 Outlines (skyline, outcrop edge, figure, stone layout) measured from the reference and stored as numbers in code. No reference pixels are embedded anywhere.
- 10:40 Similarity is measured with SSIM and 1-MAE. 1-MAE is inflated by the large black sky, so SSIM is the honest number.

## Rounds 00-16 (compressed)
Time: 10:24 to 11:02. Rounds were short (render takes ~13 s at 8 samples).
- r00 blockout. r01-04 ground, talus, cliffs, stones, shaded slope. r05-10 outcrop rewritten four times (draped bands, then horizontal tiers, then box slabs). r11-13 heatmap-guided value fixes (duller edge band, outcrop light map). r14-15 figure folds, pebbles. r16 sky cumulus.
Measured r15: SSIM grey 0.668, SSIM rgb 0.616 (quarter res), 1-MAE at 1/16 res 96.6%.
Critics r15 (2, same model, fresh context), eyeballed: A comp 70 light 52 color 60 mat 35 detail 30; B comp 72 light 55 color 62 mat 38 detail 35. Median: comp 71, light 54, color 61, materials 37, detail 33. Both picked the render as the code-made one.
Top gaps: outcrop reads as masonry (needs warm brown, irregular, gritty); cliffs look tiled with flat shadow faces; talus has hard horizontal red strips; plain too empty (needs 5-10x scatter, left rock cluster); distant valley with hills missing; clouds lack form.
Stop check: bar no | floor n/a (capped) | stills approved no | final no -> next round.
