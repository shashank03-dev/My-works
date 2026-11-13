# Red Plain

A code-only recreation of the reference painting (cook/refs/R01.png). Every texture is generated in a WebGL2 fragment shader (src/scene.frag). Outline geometry (skyline, outcrop edge, figure, stone layout) was measured from the reference and stored as numbers in tools/*.glsl. No reference pixels are embedded.

- Open dist/index.html in a browser (add ?samples=64 for full quality).
- Re-render: node tools/build.mjs && node tools/render.mjs output/red-plain.png 64 2000
- Measure: python3 tools/metrics.py cook/refs/R01.png output/red-plain.png

Measured similarity: SSIM 0.658 (grey) / 0.628 (rgb). This is not a 99% match. See cook/ROUNDS.md for scores and open gaps.
