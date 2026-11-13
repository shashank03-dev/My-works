#version 300 es
// Red Plain: a hooded figure on a stone outcrop, a red plain, two mesas, a night sky.
// Every texture is procedural. Coordinates are in reference pixels, y pointing down.
precision highp float;
precision highp int;

uniform vec2 uRes;      // output size in pixels
uniform vec2 uJitter;   // sub-pixel offset for this accumulation pass, in [0,1)
uniform vec4 uTile;     // unused, kept for tiled rendering bookkeeping
out vec4 outColor;

const vec2 REF = vec2(2000.0, 1333.0);

//@OUTLINES@

// ---------------------------------------------------------------- noise
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i), b = hash12(i + vec2(1, 0));
  float c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * vnoise(p); n += a;
    p = r * p * 2.03 + 17.1; a *= 0.5;
  }
  return s / n;
}
float ridged(vec2 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * (1.0 - abs(vnoise(p) * 2.0 - 1.0)); n += a;
    p = r * p * 2.07 + 5.3; a *= 0.5;
  }
  return s / n;
}
// Voronoi: x = F1, y = F2, zw = cell id
vec4 voronoi(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0; vec2 id = vec2(0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 o = hash22(i + g) * 0.85 + 0.075;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) { d2 = d; }
  }
  return vec4(sqrt(d1), sqrt(d2), id);
}
vec3 rgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// ---------------------------------------------------------------- outlines
float skyY(float x) {
  for (int i = 0; i < N_SKY - 1; i++) {
    if (x <= SKY[i + 1].x) {
      float t = (x - SKY[i].x) / max(SKY[i + 1].x - SKY[i].x, 1e-3);
      return mix(SKY[i].y, SKY[i + 1].y, clamp(t, 0.0, 1.0));
    }
  }
  return SKY[N_SKY - 1].y;
}
float rockY(float x) {
  for (int i = 0; i < N_ROCK - 1; i++) {
    if (x <= ROCK[i + 1].x) {
      float t = (x - ROCK[i].x) / max(ROCK[i + 1].x - ROCK[i].x, 1e-3);
      return mix(ROCK[i].y, ROCK[i + 1].y, clamp(t, 0.0, 1.0));
    }
  }
  return ROCK[N_ROCK - 1].y;
}
// signed distance to the figure polygon (negative inside)
float figSD(vec2 p) {
  float d = dot(p - FIG[0], p - FIG[0]);
  float s = 1.0;
  for (int i = 0, j = N_FIG - 1; i < N_FIG; j = i, i++) {
    vec2 e = FIG[j] - FIG[i], w = p - FIG[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= FIG[i].y, p.y < FIG[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
  }
  return s * sqrt(d);
}

// ---------------------------------------------------------------- sky
vec3 sky(vec2 p) {
  if (p.y < 128.0) {
    // letterbox band above the frame line: near black with a whisper of noise
    return rgb(0.4, 0.5, 1.4) * (0.6 + 0.8 * vnoise(p * 0.05));
  }
  // thin frame line
  float line = exp(-pow((p.y - 131.0) / 1.25, 2.0));
  vec3 c = rgb(0.6, 2.0, 3.6);
  // large scale dark nebulous clouds over the whole sky
  float n1 = fbm(p * vec2(0.0045, 0.0075) + vec2(3.0, 9.0), 6);
  float n2 = fbm(p * vec2(0.012, 0.02) + vec2(11.0, 2.0), 5);
  float cl = smoothstep(0.42, 0.75, n1 * 0.75 + n2 * 0.35);
  c += rgb(1.0, 2.6, 4.6) * cl * smoothstep(150.0, 400.0, p.y);
  // brighter blue cloud banks at the left and right edges
  float left = exp(-pow((p.x - 20.0) / 190.0, 2.0)) * smoothstep(250.0, 380.0, p.y) * (1.0 - smoothstep(560.0, 700.0, p.y));
  float right = exp(-pow((p.x - 1985.0) / 200.0, 2.0)) * smoothstep(200.0, 300.0, p.y) * (1.0 - smoothstep(430.0, 520.0, p.y));
  float puff = fbm(p * 0.011 + vec2(5.0, 1.0), 6);
  float puff2 = fbm(p * 0.03 + vec2(1.0, 7.0), 4);
  float pc = smoothstep(0.38, 0.72, puff * 0.8 + puff2 * 0.3);
  c += rgb(6.0, 11.0, 22.0) * pc * left * 1.3;
  c += rgb(3.0, 9.0, 20.0) * pc * right * 1.2;
  // low warm-grey cloud bank above the horizon
  float lowBand = smoothstep(640.0, 760.0, p.y) * (1.0 - smoothstep(870.0, 935.0, p.y));
  float streak = fbm(p * vec2(0.006, 0.026) + vec2(2.0, 4.0), 6);
  float streak2 = fbm(p * vec2(0.02, 0.06) + vec2(9.0, 3.0), 4);
  float lb = smoothstep(0.45, 0.8, streak * 0.8 + streak2 * 0.35);
  c += rgb(22.0, 18.0, 19.0) * lb * lowBand;
  c += rgb(4.0, 5.0, 6.0) * lowBand * 0.8;
  // haze glow on the horizon
  c += rgb(6.0, 7.0, 10.0) * exp(-pow((p.y - 925.0) / 35.0, 2.0));
  // stars: sparse, tiny, mostly very faint
  vec2 sc = floor(p / 46.0);
  vec2 so = hash22(sc + 3.7) * 46.0;
  float sb = hash12(sc + 9.1);
  float sd = length(p - (sc * 46.0 + so));
  float star = (sb > 0.72 ? 1.0 : 0.0) * exp(-sd * sd / 0.9) * (0.25 + 1.4 * pow(hash12(sc + 1.3), 6.0));
  star *= smoothstep(140.0, 220.0, p.y) * (1.0 - smoothstep(620.0, 800.0, p.y));
  c += rgb(55.0, 60.0, 72.0) * star;
  // vignette top to keep the band near black
  c *= mix(0.55, 1.0, smoothstep(134.0, 330.0, p.y));
  c += rgb(9.0, 12.0, 17.0) * line;
  return c;
}

// ---------------------------------------------------------------- ground (plain, talus, far hills)
// where the blue-grey dusted ground gives way to the red plain (measured per column)
const vec2 BLUE_EDGE[24] = vec2[24](vec2(0.,968.),vec2(80.,975.),vec2(160.,1003.),vec2(320.,1006.),vec2(480.,1000.),vec2(560.,980.),vec2(640.,986.),vec2(720.,993.),vec2(800.,990.),vec2(880.,988.),vec2(960.,985.),vec2(1040.,985.),vec2(1120.,983.),vec2(1200.,980.),vec2(1280.,966.),vec2(1360.,953.),vec2(1440.,960.),vec2(1520.,955.),vec2(1600.,948.),vec2(1680.,930.),vec2(1760.,921.),vec2(1840.,910.),vec2(1920.,906.),vec2(2000.,904.));
float blueEdge(float x) {
  for (int i = 0; i < 23; i++) {
    if (x <= BLUE_EDGE[i + 1].x) {
      float t = (x - BLUE_EDGE[i].x) / (BLUE_EDGE[i + 1].x - BLUE_EDGE[i].x);
      return mix(BLUE_EDGE[i].y, BLUE_EDGE[i + 1].y, smoothstep(0.0, 1.0, t)) + 8.0;
    }
  }
  return 904.0;
}

vec3 redSoil(vec2 p) {
  float n = fbm(vec2(p.x * 0.003, p.y * 0.016) + 3.0, 6);
  float n2 = fbm(vec2(p.x * 0.011, p.y * 0.05) + 7.0, 5);
  vec3 red = mix(rgb(150.0, 16.0, 12.0), rgb(188.0, 22.0, 14.0), smoothstep(0.3, 0.7, n));
  red = mix(red, rgb(168.0, 30.0, 24.0), smoothstep(0.6, 0.85, n2) * 0.5);
  // soft dark furrows lying flat on the plain
  float fr = fbm(vec2(p.x * 0.005, p.y * 0.07) + 13.0, 5);
  red = mix(red, rgb(112.0, 13.0, 11.0), smoothstep(0.6, 0.78, fr) * 0.6);
  float fr2 = fbm(vec2(p.x * 0.02, p.y * 0.16) + 19.0, 4);
  red = mix(red, rgb(125.0, 18.0, 16.0), smoothstep(0.62, 0.8, fr2) * 0.45);
  // shadowed band on the far left
  float lshade = (1.0 - smoothstep(150.0, 420.0, p.x)) * exp(-pow((p.y - 1030.0) / 45.0, 2.0));
  red = mix(red, rgb(70.0, 12.0, 14.0), lshade * 0.65);
  // a softer darker band hugging the blue edge
  float edgeShade = exp(-pow((p.y - blueEdge(p.x) - 14.0) / 26.0, 2.0));
  red = mix(red, rgb(92.0, 22.0, 30.0), edgeShade * 0.65);
  // long darker shadow bands across the plain
  red = mix(red, rgb(98.0, 12.0, 12.0), smoothstep(0.55, 0.75, fbm(vec2(p.x * 0.0015, p.y * 0.03) + 41.0, 4)) * 0.5);
  // the far left foreground ground is darker
  red *= mix(1.0, 0.72, (1.0 - smoothstep(0.0, 260.0, p.x)) * smoothstep(1060.0, 1200.0, p.y));
  return red;
}

// stratified pale slopes below the mesas and the dark blue far ground
vec3 dustGround(vec2 p, float talus) {
  float warp = fbm(vec2(p.x * 0.004, p.y * 0.01) + 71.0, 4);
  float yy = p.y + warp * 20.0 + (p.x - 300.0) * 0.02 + (fbm(p * vec2(0.02, 0.05) + 3.0, 3) - 0.5) * 14.0;
  // scaly ledges: short horizontal plates, each lit on top with a dark shadow under it
  float rowH = 6.0 + 4.0 * smoothstep(880.0, 1000.0, p.y);
  float rv = yy / rowH;
  float r = floor(rv), fr = fract(rv);
  float plateW = 18.0 + 30.0 * hash12(vec2(r, 4.0));
  float pu = p.x / plateW + hash12(vec2(r, 9.0)) * 7.0;
  float pid = hash12(vec2(floor(pu), r));
  float pfu = fract(pu);
  float plate = step(0.3, pid) * smoothstep(0.0, 0.15, pfu) * smoothstep(1.0, 0.85, pfu) * smoothstep(0.35, 0.6, fbm(p * vec2(0.012, 0.03) + 13.0, 4));
  float topLit = (1.0 - smoothstep(0.0, 0.55, fr)) * plate;
  float under = smoothstep(0.6, 0.95, fr) * plate;
  float big = fbm(vec2(p.x * 0.006, p.y * 0.025) + 87.0, 5);
  float mid = fbm(vec2(p.x * 0.02, p.y * 0.08) + 83.0, 4);
  vec3 lit = mix(rgb(40.0, 64.0, 96.0), rgb(78.0, 104.0, 136.0), smoothstep(0.3, 0.7, big * 0.6 + mid * 0.5));
  lit = mix(lit, rgb(122.0, 138.0, 160.0), topLit * (0.35 + 0.5 * pid) * smoothstep(0.35, 0.6, mid + 0.1));
  lit = mix(lit, rgb(14.0, 22.0, 36.0), under * 0.55);
  lit = mix(lit, rgb(18.0, 28.0, 44.0), smoothstep(0.6, 0.78, fbm(vec2(p.x * 0.012, p.y * 0.05) + 89.0, 4)) * 0.6);
  vec3 farc = mix(rgb(18.0, 24.0, 36.0), rgb(54.0, 64.0, 86.0), smoothstep(0.38, 0.72, big * 0.5 + mid * 0.6));
  farc = mix(farc, rgb(76.0, 86.0, 106.0), topLit * 0.4);
  farc = mix(farc, rgb(10.0, 14.0, 22.0), under * 0.5);
  return mix(farc, lit, talus);
}

vec3 groundColor(vec2 p, float hz) {
  float yb = blueEdge(p.x);
  float lt = (1.0 - smoothstep(380.0, 640.0, p.x));
  float rt = smoothstep(1260.0, 1500.0, p.x);
  float talus = max(lt, rt);
  vec3 dusty = dustGround(p, talus);
  vec3 red = redSoil(p);
  float s1 = fbm(vec2(p.x * 0.004, p.y * 0.055) + 31.0, 6);
  float s2 = fbm(vec2(p.x * 0.016, p.y * 0.14) + 37.0, 4);
  float s = s1 * 0.7 + s2 * 0.4 - 0.55;
  float dist = p.y - yb;
  // below the edge: red with a few pale streaks; above: pale with red streaks that thin out uphill
  float k = dist / 18.0 - s * 3.0;
  float redAmt = smoothstep(-0.2, 0.2, k);
  float up = smoothstep(-110.0, -5.0, dist) * talus;
  float sn = fbm(vec2(p.x * 0.004, p.y * 0.14) + 101.0, 5);
  float streak = smoothstep(0.74 - 0.2 * up, 0.8 - 0.2 * up, sn) * smoothstep(0.15, 0.6, up);
  redAmt = max(redAmt, streak);
  // pale streaks reaching out over the red, mostly right of centre
  float reach = smoothstep(650.0, 1000.0, p.x) * (1.0 - smoothstep(1550.0, 1750.0, p.x)) * exp(-max(dist, 0.0) / 32.0) * step(0.0, dist);
  float ps = fbm(vec2(p.x * 0.0035, p.y * 0.2) + 131.0, 5);
  redAmt = min(redAmt, 1.0 - smoothstep(0.6, 0.66, ps + reach * 0.22) * reach);
  return mix(dusty, red * mix(0.75, 1.0, redAmt), redAmt);
}

// distant ridges between the mesas
vec3 farHills(vec2 p, vec3 base, float hz) {
  float center = smoothstep(420.0, 560.0, p.x) * (1.0 - smoothstep(1380.0, 1470.0, p.x));
  float t = clamp((p.y - hz) / 22.0, 0.0, 1.0);
  float ridge = ridged(vec2(p.x * 0.012, p.y * 0.06), 5);
  vec3 c = mix(rgb(34.0, 42.0, 58.0), rgb(18.0, 24.0, 36.0), t);
  c = mix(c, rgb(66.0, 76.0, 96.0), smoothstep(0.72, 0.92, ridge) * (1.0 - t) * 0.7);
  float w = center * (1.0 - smoothstep(hz + 8.0, hz + 30.0, p.y));
  return mix(base, c, w);
}

// ---------------------------------------------------------------- stones on the plain
vec3 stoneShade(vec2 p, vec2 cc, vec2 rad, float seed, vec3 c, inout float hit) {
  vec2 d = (p - cc) / rad;
  float ang = atan(d.y, d.x);
  float rr = 1.0 + 0.16 * sin(ang * 3.0 + seed * 40.0) + 0.08 * sin(ang * 5.0 + seed * 17.0) + 0.05 * sin(ang * 9.0 + seed * 7.0);
  rr += (vnoise(vec2(ang * 2.5, seed * 31.0)) - 0.5) * 0.35;
  // angular outline (superellipse), flat bottom: stones sit on the ground
  vec2 ad = abs(vec2(d.x, d.y < 0.0 ? d.y : d.y * 1.5));
  float r = pow(pow(ad.x, 3.0) + pow(ad.y, 3.0), 1.0 / 3.0) / rr;
  // contact shadow on the ground, below and to the right
  vec2 ds = (p - cc - vec2(rad.x * 0.35, rad.y * 0.55)) / (rad * vec2(1.35, 0.8));
  float sh = 1.0 - smoothstep(0.55, 1.0, length(ds));
  c = mix(c, c * 0.28, sh * 0.85);
  if (r < 1.0) {
    vec3 n = normalize(vec3(d.x, d.y * 1.3, sqrt(max(1.0 - r * r, 0.0)) * 0.9));
    float lit = clamp(dot(n, normalize(vec3(-0.55, -0.75, 0.6))), 0.0, 1.0);
    float flatTop = smoothstep(0.1, -0.4, d.y);
    vec3 sc = mix(rgb(10.0, 9.0, 12.0), rgb(78.0, 78.0, 88.0), pow(lit, 1.6));
    sc = mix(sc, rgb(112.0, 112.0, 122.0), flatTop * lit * 0.55 * step(0.45, vnoise(p * 0.35 + seed * 9.0)));
    // facets and cracks
    sc *= 0.7 + 0.5 * fbm(p * 0.25 + seed * 5.0, 3);
    // stones in the shadowed left foreground are darker
    sc *= mix(0.65, 1.0, smoothstep(150.0, 420.0, p.x));
    sc *= 0.8 + 0.4 * vnoise(p * 0.5 + seed * 13.0);
    // red ground light bouncing on the underside
    sc += rgb(40.0, 4.0, 4.0) * smoothstep(0.2, 1.0, d.y) * 0.7;
    c = mix(sc, c, smoothstep(0.85, 1.0, r));
    hit = 1.0;
  }
  return c;
}
vec3 stones(vec2 p, vec3 c) {
  float hit = 0.0;
  // measured stones
  for (int i = 0; i < N_STONE; i++) {
    vec4 s = STONE[i];
    if (abs(p.x - s.x) > s.z * 2.0 + 4.0 || abs(p.y - s.y) > s.w * 2.5 + 4.0) continue;
    c = stoneShade(p, s.xy, s.zw, float(i) * 0.137, c, hit);
  }
  // procedural pebbles, sized by distance
  float depth = max(p.y - 905.0, 4.0);
  float scale = depth / 250.0;
  vec2 cell = vec2(34.0 * scale + 3.0, 16.0 * scale + 1.5);
  vec2 ci = floor(p / cell);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 id = ci + vec2(x, y);
    float h = hash12(id * 1.37 + 0.5);
    if (h > 0.5) continue;
    vec2 cc = (id + hash22(id + 2.1)) * cell;
    float sz = (0.8 + 3.2 * pow(hash12(id + 5.3), 3.0)) * scale + 0.45;
    vec3 before = c;
    float hb = 0.0;
    c = stoneShade(p, cc, vec2(sz * 1.7, sz), h * 7.1, c, hb);
    // tiny far pebbles read as pale grey specks with a dark lower lip
    if (hb > 0.0 && sz < 3.0) c = mix(c, rgb(120.0, 112.0, 118.0), smoothstep(cc.y + sz * 0.3, cc.y - sz * 0.6, p.y) * 0.6);
  }
  return c;
}

// ---------------------------------------------------------------- mesa cliffs
vec3 cliffLit(vec2 p, float topY, float baseY, float seed) {
  float rel = clamp((p.y - topY) / max(baseY - topY, 1.0), 0.0, 1.0);
  // columns of irregular width
  float u = p.x / 12.5 + 1.4 * fbm(vec2(p.y * 0.02, seed), 4) + 0.5 * fbm(p * 0.06, 2) + seed * 3.0;
  float col = floor(u), fu = fract(u);
  float bh = 14.0 + 40.0 * hash12(vec2(col, seed));
  float v = p.y / bh + hash12(vec2(col, seed + 1.0)) * 10.0 + 0.3 * fbm(vec2(p.x * 0.05, seed), 2);
  float row = floor(v), fv = fract(v);
  float id = hash12(vec2(col * 7.0 + row, seed + 3.0));
  float n = fbm(p * vec2(0.05, 0.03) + seed, 5);
  float nf = fbm(p * vec2(0.2, 0.1) + seed, 3);
  vec3 c = mix(rgb(26.0, 56.0, 86.0), rgb(56.0, 94.0, 128.0), clamp(id * 0.5 + n * 0.7 - 0.1, 0.0, 1.0));
  // bevels: light from the upper left
  float hiL = 1.0 - smoothstep(0.0, 0.28, fu);
  float hiT = 1.0 - smoothstep(0.0, 0.18, fv);
  float loR = smoothstep(0.78, 1.0, fu);
  float loB = smoothstep(0.85, 1.0, fv);
  c = mix(c, rgb(88.0, 124.0, 158.0), max(hiL * 0.45, hiT * 0.3) * (0.3 + 0.7 * nf) * step(0.3, id));
  c = mix(c, rgb(14.0, 26.0, 42.0), max(loR * 0.55, loB * 0.35) * (0.6 + 0.4 * nf));
  // deep crevices between some columns
  float crev = (1.0 - smoothstep(0.0, 0.1, fu)) * step(0.4, hash12(vec2(col, seed + 5.0))) * smoothstep(0.2, 0.6, fbm(vec2(p.x * 0.02, p.y * 0.015) + seed, 3));
  c = mix(c, rgb(6.0, 12.0, 22.0), crev * 0.9);
  // bulging rounded highlights
  c = mix(c, rgb(84.0, 120.0, 154.0), smoothstep(0.58, 0.78, fbm(p * vec2(0.035, 0.022) + seed + 9.0, 4)) * 0.55);
  c = mix(c, rgb(18.0, 34.0, 54.0), smoothstep(0.62, 0.8, fbm(p * vec2(0.03, 0.012) + seed + 19.0, 4)) * 0.5);
  // long dark streaks
  float run = smoothstep(0.84, 0.97, ridged(vec2(p.x * 0.08, p.y * 0.004) + seed, 3));
  c = mix(c, rgb(10.0, 18.0, 32.0), run * 0.5);
  // horizontal ledges low on the face
  float ledgeN = sin(p.y * 0.36 + fbm(p * vec2(0.01, 0.03), 3) * 9.0);
  float lowFace = smoothstep(0.5, 0.85, rel);
  c = mix(c, rgb(92.0, 124.0, 152.0), smoothstep(0.85, 0.98, ledgeN) * lowFace * 0.5);
  c = mix(c, rgb(14.0, 24.0, 38.0), smoothstep(0.88, 1.0, -ledgeN) * lowFace * 0.5);
  c *= mix(0.82, 1.0, smoothstep(0.0, 0.15, rel));
  return c;
}
vec3 cliffShadow(vec2 p, float topY, float baseY, float seed) {
  float rel = clamp((p.y - topY) / max(baseY - topY, 1.0), 0.0, 1.0);
  float st = fbm(vec2(p.x * 0.16, p.y * 0.011) + seed, 5);
  float st2 = fbm(vec2(p.x * 0.05, p.y * 0.03) + seed + 3.0, 4);
  vec3 c = mix(rgb(10.0, 7.0, 8.0), rgb(34.0, 24.0, 23.0), clamp(st * 0.9 + st2 * 0.35 - 0.1, 0.0, 1.0));
  c = mix(c, rgb(48.0, 34.0, 31.0), smoothstep(0.68, 0.9, st) * 0.6);
  c *= mix(1.0, 0.3, smoothstep(0.45, 1.0, rel));
  c += rgb(30.0, 26.0, 30.0) * exp(-(p.y - topY) / 3.0) * 0.6;
  return c;
}

// ---------------------------------------------------------------- foreground outcrop
// one stone block in a row of slabs, seen from slightly above: top, bright lip, face, shadow
vec3 slabRow(vec2 p, float t, float rowH, float row, float f, out float gapOut) {
  float persp = pow(1.16, row) * 24.0 / 26.0;   // constant within a row so joints stay vertical
  float bw = (52.0 + 70.0 * hash12(vec2(row, 3.0))) * persp;
  float u0 = p.x / bw + hash12(vec2(row, 1.0)) * 10.0;
  // irregular block widths (monotonic warp) and ragged joints
  float u = u0 + 0.42 * (vnoise(vec2(u0 * 0.9, row * 13.0)) - 0.5) * 2.0 * 0.5;
  u += (vnoise(vec2(p.y * 0.12, row * 7.0 + floor(u0))) - 0.5) * 0.12 + (vnoise(p * 0.25) - 0.5) * 0.05;
  float cell = floor(u), fu = fract(u);
  float id = hash12(vec2(cell, row + 11.0));
  float id2 = hash12(vec2(cell, row + 23.0));
  float id3 = hash12(vec2(cell, row + 37.0));
  // each block sits at its own height
  float off = (id2 - 0.5) * 0.45 + (vnoise(vec2(p.x * 0.06, row * 3.0)) - 0.5) * 0.14;
  float g = f + off + (vnoise(p * vec2(0.12, 0.3)) - 0.5) * 0.1;
  float topEnd = 0.38 + 0.2 * id;           // top face, then the front face, then the shadow under the block
  float faceEnd = topEnd + 0.32 + 0.12 * id3;
  // top face: cool pale grey, mottled with rounded chips
  float tn = fbm(p * vec2(0.045, 0.09) + id * 9.0, 5);
  vec3 topC = mix(rgb(78.0, 78.0, 86.0), rgb(160.0, 158.0, 166.0), clamp(tn * 1.2 + id2 * 0.35 - 0.4, 0.0, 1.0));
  float mott = fbm(p * vec2(0.09, 0.16) / persp + id * 4.0, 4);
  topC *= 0.75 + 0.45 * mott;
  topC = mix(topC, rgb(30.0, 30.0, 36.0), smoothstep(0.62, 0.78, fbm(p * vec2(0.03, 0.07) + id * 6.0, 4)) * 0.6);
  topC = mix(topC, topC * rgb(255.0, 225.0, 200.0), id3 * 0.35);   // some blocks are warmer
  topC *= mix(0.75, 1.1, smoothstep(0.0, topEnd, g));                // lit towards the front lip
  // bright lip at the front edge of the top
  float lip = exp(-pow((g - topEnd) / 0.035, 2.0));
  // front face: brown-grey with vertical streaks, darkening downward
  float ff = clamp((g - topEnd) / (faceEnd - topEnd), 0.0, 1.0);
  float stri = ridged(vec2(p.x * 0.16 / persp, p.y * 0.02) + id * 4.0, 4);
  vec3 faceC = mix(rgb(22.0, 19.0, 18.0), mix(rgb(92.0, 84.0, 80.0), rgb(150.0, 140.0, 134.0), exp(-pow((p.x - 1080.0) / 260.0, 2.0))), stri * (1.0 - ff * 0.75));
  vec3 c = g < topEnd ? topC : (g < faceEnd ? faceC : rgb(5.0, 4.0, 4.0));
  c = mix(c, rgb(178.0, 176.0, 184.0), lip * 0.55);
  // revealed block of the row behind (g < 0) and the hidden part under the next row (g > 1)
  if (g < 0.0) c = faceC * 0.6;
  if (g > 1.0) c = rgb(4.0, 3.0, 3.0);
  // dark joints between blocks, softly shadowed on their left side
  float joint = min(fu, 1.0 - fu) * bw;
  float gap = 1.0 - smoothstep(2.0, 5.0, joint);
  c = mix(c, rgb(4.0, 3.0, 3.0), gap);
  c *= mix(0.55, 1.0, smoothstep(0.0, 10.0, fu * bw));
  // some blocks are dull and dark
  c *= mix(1.0, 0.5, step(0.72, id3)) * (0.8 + 0.35 * id);
  // brown grit collects in the joints lower down
  vec3 grit = mix(rgb(30.0, 22.0, 18.0), rgb(78.0, 58.0, 44.0), vnoise(p * 0.4));
  c = mix(c, grit, gap * smoothstep(1180.0, 1260.0, p.y) * 0.6);
  gapOut = gap;
  return c;
}

vec3 outcrop(vec2 p, float topY) {
  float t = p.y - topY;
  // horizontal tiers (stairs seen from the front); the outline is where each tier ends
  float y0 = p.y - 1128.0;
  float wob = (fbm(vec2(p.x * 0.008, 3.0), 4) - 0.5) * 16.0 + (vnoise(vec2(p.x * 0.03, 9.0)) - 0.5) * 10.0;
  // rows grow towards the viewer: integrate rowH = 19 + 0.13*y
  float yy = max(y0 + wob, 0.0);
  float rowF = log(1.0 + 0.16 * yy / 24.0) / log(1.0 + 0.16);
  float rowH = 24.0 + 0.16 * yy;
  float row = floor(rowF), f = fract(rowF);
  float gap;
  vec3 c = slabRow(p, t, rowH, row, f, gap);
  // brown dirt and gravel lower down in the middle
  float dirt = smoothstep(0.5, 0.7, fbm(p * 0.006 + 61.0, 5)) * smoothstep(1185.0, 1280.0, p.y) * smoothstep(300.0, 700.0, p.x) * (1.0 - smoothstep(1250.0, 1650.0, p.x));
  vec3 dirtC = mix(rgb(36.0, 27.0, 22.0), rgb(96.0, 74.0, 56.0), clamp(vnoise(p * 0.18) * 0.6 + fbm(p * 0.05, 3) * 0.6 - 0.1, 0.0, 1.0));
  c = mix(c, dirtC, dirt * 0.6 * (1.0 - gap));
  // platform under the figure: broad, pale and cool
  float plat = exp(-pow((p.x - 1015.0) / 175.0, 2.0)) * (1.0 - smoothstep(1150.0, 1172.0, p.y)) * smoothstep(-2.0, 2.0, t);
  vec3 platC = mix(rgb(118.0, 116.0, 124.0), rgb(190.0, 188.0, 196.0), fbm(p * vec2(0.04, 0.1), 5));
  platC = mix(platC, rgb(30.0, 30.0, 36.0), (1.0 - smoothstep(0.0, 0.05, voronoi(p / vec2(18.0, 8.0)).y - voronoi(p / vec2(18.0, 8.0)).x)) * 0.5);
  c = mix(c, platC, plat * 0.85);
  // overall light falloff: the centre is lit, edges and bottom fall into darkness
  float cx = abs(p.x - 1000.0);
  c *= mix(1.0, 0.45, smoothstep(500.0, 1000.0, cx) * 0.8);
  c *= mix(1.0, 0.55, smoothstep(1270.0, 1333.0, p.y) * smoothstep(150.0, 400.0, cx));
  // the middle of the outcrop catches more light, the right side less
  c *= 1.0 + 0.45 * exp(-pow((p.x - 1000.0) / 260.0, 2.0)) * smoothstep(1180.0, 1300.0, p.y);
  c *= mix(1.0, 0.7, smoothstep(1500.0, 1700.0, p.x) * smoothstep(1250.0, 1320.0, p.y));
  // pale lip along the edge against the plain
  c = mix(c, rgb(120.0, 116.0, 122.0), exp(-max(t, 0.0) / 1.8) * 0.5);
  return c;
}

// ---------------------------------------------------------------- figure
vec3 figure(vec2 p, float sd) {
  // left and right cloak edges (approximate, from the outline) to get a coordinate across the body
  float yl = clamp((p.y - 1010.0) / 132.0, 0.0, 1.0);
  float xl = mix(978.0, 962.0, yl), xr = mix(1027.0, 1052.0, clamp((p.y - 1015.0) / 130.0, 0.0, 1.0));
  float u = clamp((p.x - xl) / (xr - xl), 0.0, 1.0);
  float n = fbm(vec2(p.x * 0.12, p.y * 0.015), 4);
  // vertical folds, widening towards the hem
  float spread = mix(0.6, 1.0, yl);
  float folds = 0.5 + 0.5 * sin(u * 26.0 / spread + n * 4.0 + (p.y - 1000.0) * 0.012);
  folds = pow(folds, 2.0);
  // light comes from the left: the left third of the cloak is lit
  float lit = smoothstep(0.62, 0.05, u) * smoothstep(1000.0, 1015.0, p.y);
  vec3 c = rgb(2.0, 4.0, 8.0) + rgb(4.0, 5.0, 9.0) * n;
  c += rgb(26.0, 44.0, 72.0) * lit * (0.25 + 0.75 * folds);
  c += rgb(40.0, 52.0, 70.0) * lit * pow(folds, 3.0) * smoothstep(0.4, 0.05, u);
  // the arm under the cloak: a soft lit bulge on the upper left
  c += rgb(30.0, 44.0, 66.0) * exp(-pow((u - 0.18) / 0.08, 2.0)) * smoothstep(1008.0, 1020.0, p.y) * (1.0 - smoothstep(1050.0, 1075.0, p.y));
  // deep shadow running down the middle of the back
  c *= mix(1.0, 0.5, smoothstep(0.4, 0.6, u) * (1.0 - smoothstep(0.7, 0.95, u)));
  // rim light on the left contour
  float leftSide = smoothstep(1008.0, 980.0, p.x);
  c += rgb(70.0, 96.0, 130.0) * exp(sd / 2.5) * leftSide * 0.9;
  // hood: rounded, lit on its crown and left side
  vec2 hp = (p - vec2(1001.0, 984.0)) / vec2(12.0, 13.0);
  float hood = smoothstep(1.2, 0.0, length(hp - vec2(-0.35, -0.4)));
  c += rgb(52.0, 70.0, 98.0) * hood * 0.9 * (1.0 - smoothstep(1000.0, 1004.0, p.y));
  c += rgb(40.0, 55.0, 80.0) * hood * 0.5;
  // shoulders lit on the left
  c += rgb(40.0, 56.0, 80.0) * exp(-pow(length((p - vec2(984.0, 1006.0)) / vec2(7.0, 6.0)), 2.0)) * 0.8;
  // hem: lit lower left edge and a pool of shadow at the feet
  c += rgb(40.0, 58.0, 84.0) * smoothstep(1130.0, 1146.0, p.y) * smoothstep(0.45, 0.0, u) * 0.6;
  // red bounce on the right edge
  float rightSide = smoothstep(1012.0, 1035.0, p.x);
  c += rgb(40.0, 8.0, 8.0) * exp(sd / 2.5) * rightSide * 0.6;
  return c;
}

// ---------------------------------------------------------------- scene
vec3 scene(vec2 p) {
  float hz = skyY(p.x);
  float rk = rockY(p.x);
  vec3 c;
  if (p.y < hz) {
    c = sky(p);
  } else if (p.y < rk) {
    c = groundColor(p, hz);
    c = farHills(p, c, hz);
    bool leftMesa = p.x < 430.0;
    bool rightMesa = p.x > 1540.0;
    if (leftMesa || rightMesa) {
      float baseY = leftMesa ? 876.0 + (fbm(vec2(p.x * 0.02, 0.5), 3) - 0.5) * 14.0
                             : mix(830.0, 792.0, smoothstep(1550.0, 1860.0, p.x)) + (fbm(vec2(p.x * 0.02, 3.5), 3) - 0.5) * 14.0;
      if (rightMesa && p.x > 1860.0) baseY = mix(800.0, 838.0, smoothstep(1860.0, 1940.0, p.x)) + (fbm(vec2(p.x * 0.03, 7.5), 3) - 0.5) * 12.0;
      float split = leftMesa ? mix(343.0, 333.0, clamp((p.y - 655.0) / 220.0, 0.0, 1.0))
                             : mix(1874.0, 1858.0, clamp((p.y - 476.0) / 314.0, 0.0, 1.0));
      float seed = leftMesa ? 1.0 : 7.0;
      if (p.y < baseY) {
        vec3 cc = p.x > split ? cliffShadow(p, hz, baseY, seed) : cliffLit(p, hz, baseY, seed);
        c = mix(cc, c, smoothstep(baseY - 12.0, baseY, p.y));
        if (p.x <= split) c += rgb(40.0, 52.0, 64.0) * exp(-(p.y - hz) / 2.0) * 0.7;
      } else if (p.x > split - 10.0) {
        // the slope below the shaded face stays in shadow
        float t = smoothstep(baseY, baseY + (leftMesa ? 60.0 : 70.0), p.y);
        float side = smoothstep(split - 10.0, split + 25.0, p.x);
        c = mix(c, c * 0.3, (1.0 - t) * side);
      }
    }
    // shaded slope descending to the right of the left mesa
    if (p.x > 320.0 && p.x < 820.0) {
      // boundary line from the foot of the shadowed face down to the plain
      float lineY = 878.0 + (p.x - 333.0) * 0.24 + (fbm(vec2(p.x * 0.03, 2.0), 3) - 0.5) * 10.0;
      float inside = smoothstep(-6.0, 6.0, lineY - p.y) * smoothstep(320.0, 345.0, p.x) * smoothstep(868.0, 880.0, p.y + max(p.x - 425.0, 0.0) * 4.0);
      float fade = 1.0 - smoothstep(560.0, 800.0, p.x);
      vec3 sc = mix(rgb(12.0, 11.0, 15.0), rgb(36.0, 35.0, 42.0), smoothstep(0.3, 0.75, fbm(vec2(p.x * 0.03, p.y * 0.1), 5)));
      sc = mix(sc, rgb(60.0, 22.0, 26.0), smoothstep(0.62, 0.8, fbm(vec2(p.x * 0.01, p.y * 0.07) + 5.0, 4)) * smoothstep(890.0, 940.0, p.y) * 0.6);
      c = mix(c, sc, inside * fade * 0.92);
    }
    if (p.y > 935.0) c = stones(p, c);
  } else {
    c = outcrop(p, rk);
  }
  float sd = figSD(p);
  if (sd < 0.6) {
    vec3 fc = figure(p, sd);
    c = mix(fc, c, smoothstep(-0.6, 0.6, sd));
  } else {
    vec2 sp = (p - vec2(1062.0, 1147.0)) / vec2(28.0, 5.0);
    c *= 1.0 - 0.8 * (1.0 - smoothstep(0.5, 1.0, length(sp)));
  }
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy - 0.5 + uJitter;
  vec2 p = vec2(frag.x, uRes.y - frag.y) * (REF / uRes);
  vec3 c = scene(p);
  outColor = vec4(max(c, 0.0), 1.0);
}
