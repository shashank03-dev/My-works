# Brief: Red Plain (cook run)

Target: recreate the attached painting (hooded figure on a stone outcrop, red plain, two blue mesas, black night sky) as a code-rendered image. Stack: one HTML page, WebGL2 fragment shaders, rendered offline to PNG with headless Chromium.
References: cook/refs/R01 (original: 1.webp, 2000x1333), recreate closely, 1:1 framing.
Bar: composition 99, light 99, color 99, materials 99, detail near and far 99. Motion n/a (still).
Calibration offset: none yet.
Rules: zero external assets. Every texture, shape and effect is generated in code. Outline geometry is measured from the reference (as a painter blocks in) and stored as code data; no reference pixels are embedded. No text on the image. Default slop ban list.
Time: capped to this session (the 8h floor is not reachable in one session; logged as a decision). Started: 2026-11-13 10:24 UTC.
Hardware: CPU-only SwiftShader WebGL. Quality from offline supersampling (jittered sub-pixel accumulation).
Deliverable: full-resolution 2000x1333 PNG and the live HTML renderer, plus side-by-side comparisons and measured similarity.
Permissions: download no, push to the session branch yes (git branch claude/cook-skill-recreation-lohlj3), publish a private artifact yes.
User's words: "recreate this one is to one with 99% of accuracy ... without any kind of image quality drop ... each and every thing should be covered ... the assets ... should be from the initial state itself ... It should be a complete replica of this."
