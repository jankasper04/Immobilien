// theseus.js: "Das Schiff des Theseus", 58 s, 9:16. The storyboard is STORYBOARD_theseus.md.
// One world, one clock: everything below is a pure function of video time t. The shots only choose the camera and the
// transitions, so a plank that breaks in one shot is still gone in the next.
(() => {
  // ---------- world ----------
  const WY = 1300;                          // the waterline (world px); everything above it is mirrored below it
  const U = 21;                             // both Clawds' size unit
  const HL = 250, HH = 112;                 // hull half-length and height
  const SHORE = 300;                        // where the sand meets the water
  const AX = 600, BX = -30;                 // boat centres: Clawd's on the water, the builder's on the sand
  const SAND_Y = WY - 34;                   // the sand the old boat rests on
  const TOW = 500;                          // how far behind boat A the old boat sails once it's towed
  const WOOD = {
    old: { wood: '#7B5B46', dk: '#5E4436', grain: '#3F2C25' },
    new: { wood: '#EFC27F', dk: '#D9A15B', grain: '#B8834A' },
  };
  const HEART = '#D8394E', GAP = '#3A2A30', SAND = '#E4C893', SAIL_OLD = '#B6AA96', SAIL_NEW = '#FFF3DC', ROPE = '#9A7550';

  // Reflection pass: everything painted while REFL is on is mixed toward the water colour.
  let REFL = false, WATER = '#3E7C93', VIEW = null;
  const C = c => REFL ? mixCol(c, WATER, .5) : c;
  function withRefl(fn) {
    const saved = { ...PAL }; for (const k in PAL) PAL[k] = mixCol(PAL[k], WATER, .5);
    REFL = true; try { fn(); } finally { REFL = false; Object.assign(PAL, saved); }
  }
  // camera + the visible world rectangle, so big background shapes only cover what's on screen
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r, z, cx, cy };
  }
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  // A flat, hand-wobbled colour area for the big backgrounds (sky, water) and full-frame irises. A full-opacity wash is
  // flat colour anyway, and painting huge washes through p5.brush uploads a screen-sized mask per shape, which is very
  // slow on software WebGL. Only for shapes nothing is painted under, or that sit on top of everything.
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  // is a world box on screen? In the reflection pass the box is mirrored first
  const onScreen = (x0, y0, x1, y1, m = 60) => {
    if (REFL) [y0, y1] = [2 * WY - y1, 2 * WY - y0];
    return x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  };

  // ---------- time of day ----------
  const SKIES = {
    morning: { top: '#9CC6E2', mid: '#CFE0E4', hor: '#F7D6B2', sun: [.72, 520], sunCol: '#FFE3A6' },
    noon:    { top: '#7DB6E4', mid: '#A9D2EA', hor: '#DDEFF0', sun: [.55, 260], sunCol: '#FFF1C4' },
    sunset:  { top: '#5E5496', mid: '#C0739A', hor: '#F6A26E', sun: [.2, 760], sunCol: '#FFB36B' },
    night:   { top: '#1D2350', mid: '#2A336A', hor: '#3F4C86', moon: [.75, 360] },
    dawn:    { top: '#56649E', mid: '#A38BB4', hor: '#F3B790', sun: [.85, 820], sunCol: '#FFC98C' },
    grey:    { top: '#A3B1C0', mid: '#C4C9CB', hor: '#DCD7CC', sun: [.72, 520], sunCol: '#F4E9CF' },
    gold:    { top: '#8DB4DA', mid: '#E9C9A0', hor: '#FAC77E', sun: [.8, 640], sunCol: '#FFD27A' },
  };
  // the sky at time t: a name, or a blend of two (static, or eased between t0 and t1). Cuts switch it hard.
  const SKY_KEYS = [[0, 'morning'], [8.4, 'noon'], [11.4, 'sunset'], [12.6, 'night'], [13.8, 'night', 'dawn', .35], [15.0, 'dawn'],
                    [16.2, 'morning'], [29.2, 'morning', 'grey', 1, 30.6], [37.5, 'grey', 'morning', 1, 40], [46.6, 'morning', 'gold', 1, 49]];
  function skyAt(t) {
    let i = 0; while (i + 1 < SKY_KEYS.length && t >= SKY_KEYS[i + 1][0]) i++;
    const [t0, a, b, k = 0, t1] = SKY_KEYS[i], A = SKIES[a];
    if (!b) return A;
    const B = SKIES[b], m = t1 ? k * ease(seg(t, t0, t1)) : k;
    const S = {}; for (const f of ['top', 'mid', 'hor']) S[f] = mixCol(A[f], B[f], m);
    if (A.sun || B.sun) { S.sun = (m < .5 ? A.sun : B.sun) || B.sun || A.sun; S.sunCol = mixCol(A.sunCol || B.sunCol, B.sunCol || A.sunCol, m); S.sunK = A.sun && B.sun ? 1 : A.sun ? 1 - m : m; }
    if (A.moon || B.moon) { S.moon = A.moon || B.moon; S.moonK = A.moon && B.moon ? 1 : A.moon ? 1 - m : m; }
    return S;
  }
  const waterOf = S => mixCol(mixCol(S.top, S.hor, .35), '#2F6E86', .55);

  // ---------- background ----------
  function skyAndWater(t, S) {
    const { x0, x1, y0, y1 } = VIEW, m = 120, X = x0 - m, Wd = x1 - x0 + 2 * m;
    WATER = waterOf(S);
    if (y0 < WY) {
      // the sky in painted bands, top colour to horizon colour, each edge a soft wave anchored in the world
      const bands = [[y0 - m, S.top], [WY - 900, mixCol(S.top, S.mid, .5)], [WY - 620, S.mid], [WY - 380, mixCol(S.mid, S.hor, .55)], [WY - 190, S.hor]];
      const step = 120, xs = Math.floor(X / step) * step, xe = X + Wd + step;
      const edge = (i, x) => i >= bands.length ? WY + 4 : i ? bands[i][0] + 14 * Math.sin(x * .004 + i) + 2 * Math.sin(x * .05 + BOILN) : Math.min(bands[0][0], y0 - m);
      bands.forEach(([by, col], i) => {
        if (by > y1 + m) return;
        const P = []; for (let x = xs; x <= xe; x += step) P.push([x, edge(i, x)]);
        for (let x = Math.floor(xe / step) * step; x >= xs; x -= step) P.push([x, edge(i + 1, x) + 1]);
        flat(P, col);
      });
      // stars and moon at night, or the sun
      if (S.moon && S.moonK > .02) {
        for (let i = 0; i < 46; i++) {
          const sx = -900 + hash(i) * 3000, sy = WY - 1700 + hash(i + 50) * 1450; if (!onScreen(sx, sy, sx, sy)) continue;
          const tw = .55 + .45 * Math.sin(t * (2 + 2 * hash(i + 9)) + i);
          boilSeed('star' + i);
          paint(starPts(sx, sy, (3 + 4 * hash(i + 7)) * tw, .35, 4), { wash: '#FFF5E2', washOp: 255 * S.moonK * Math.min(1, .5 + tw), ink: null });
        }
        const mx = lerp(-300, 1400, S.moon[0]), my = WY - 1100 + S.moon[1];
        glow(mx, my, 190, '#FFF1C8', .7 * S.moonK);
        boilSeed('moon');
        paint(ellPts(mx, my, 46, 46, 22, 1), { wash: mixCol(S.top, '#FFF5E2', S.moonK), ink: null });
        paint(ellPts(mx - 12, my - 8, 10, 8, 10), { wash: mixCol(S.top, '#E9DFC8', S.moonK), ink: null });
      }
      if (S.sun) {
        const k = S.sunK ?? 1, sx = lerp(-300, 1400, S.sun[0]), sy = WY - 1100 + S.sun[1];
        glow(sx, sy, 260, S.sunCol, .8 * k);
        boilSeed('sun');
        paint(ellPts(sx, sy, 58, 58, 24, 1.2), { wash: mixCol(S.hor, S.sunCol, k), ink: null });
      }
      // far hills across the lake, pale and blue: depth by colour
      const hc = mixCol(mixCol(S.mid, S.top, .4), '#5F8597', .4), H2 = [], st = 90, hs = Math.floor(X / st) * st;
      for (let x = hs; x <= X + Wd + st; x += st) H2.push([x, WY - 26 - 95 * (.5 + .5 * Math.sin(x * .0029 + 1.3)) * (.55 + .45 * hash(Math.round(x / st)))]);
      flat(through(H2, 4).concat([[X + Wd + st, WY + 2], [hs, WY + 2]]), hc);
    }
    if (y1 > WY) {
      flat(rectPts(X, WY - 2, Wd, Math.max(10, y1 + m - WY)), WATER);
      // a sheen of sky just under the line
      const P = [], step = 150, xs = Math.floor(X / step) * step;
      for (let x = xs; x <= X + Wd + step; x += step) P.push([x, WY - 2]);
      for (let x = X + Wd + step; x >= xs; x -= step) P.push([x, WY + 150 + 30 * Math.sin(x * .005) + 2 * Math.sin(x * .04 + BOILN)]);
      flat(P, mixCol(WATER, S.hor, .45));
    }
  }
  // Ripples over the reflection: short pale strokes, anchored in the world, drifting. rings: [[x, t0, size]] spread
  // from a point on the water (a slap, a splash). wave: long swells rolling through (the cut into the last shot).
  function ripples(t, S, rings = [], wave = 0) {
    const col = mixCol(S.hor, '#FFFFFF', .3);
    for (let i = 0; i < 80; i++) {
      const bx = -1400 + hash(i + 400) * 3600 + ((t * 9 * (hash(i) + .4)) % 200), by = WY + 14 + Math.pow(hash(i + 800), 1.6) * 1300;
      if (!onScreen(bx - 60, by, bx + 60, by)) continue;
      const len = (30 + 60 * hash(i + 3)) * (1 + (by - WY) / 900), wv = Math.sin(t * 1.3 + i) * 4;
      boilSeed('rip' + i);
      inkLine([[bx - len / 2, by + wv], [bx, by - 2 + wv], [bx + len / 2, by + wv]], .55, col, 'inkfine', .5);
    }
    for (const [nx, t0, big] of rings) {
      const a = t - t0; if (a < 0 || a > 1.6) continue;
      for (let k = 0; k < 2; k++) {
        const r = (30 + 260 * easeOut(seg(a, k * .18, 1.6))) * big, al = 1 - seg(a, .2, 1.6);
        if (al <= 0 || !onScreen(nx - r, WY, nx + r, WY + 30)) continue;
        boilSeed('ring' + Math.round(nx) + k);
        inkLine([[nx - r, WY + 8], [nx - r * .5, WY + 14 + r * .04], [nx, WY + 16 + r * .05], [nx + r * .5, WY + 14 + r * .04], [nx + r, WY + 8]], 1.2 * al, col, 'inkfine', .6);
      }
    }
    if (wave > 0) for (let i = 0; i < 5; i++) {   // swells: long, slow, bright lines
      const y = VIEW.y0 + ((i / 5 + t * .12) % 1) * (VIEW.y1 - VIEW.y0), P = [];
      for (let k = 0; k <= 8; k++) { const x = lerp(VIEW.x0 - 40, VIEW.x1 + 40, k / 8); P.push([x, y + 10 * Math.sin(k * 1.3 + t * 2 + i)]); }
      boilSeed('swell' + i);
      inkLine(P, 1.3 * wave, col, 'ink', .5);
    }
  }
  function shore(t) {
    if (!onScreen(VIEW.x0 - 300, SAND_Y - 140, SHORE + 120, WY + 10)) return;
    boilSeed('shore');
    const x0 = Math.min(-600, Math.floor((VIEW.x0 - 300) / 120) * 120);
    const P = [[x0, WY + 6], [x0, SAND_Y - 8]];
    for (let x = x0 + 120; x < SHORE - 60; x += 120) P.push([x, SAND_Y - 6 * Math.sin(x * .02)]);
    P.push([SHORE - 30, SAND_Y + 2], [SHORE + 12, WY - 8], [SHORE + 45, WY + 6]);
    paint(P, { wash: C(SAND), ink: C(PAL.ink), sw: 1, curv: .4 });
    for (let i = 0; i < 9; i++) {   // sand texture: a few dry strokes
      const sx = SHORE - 80 - i * 95 - 40 * hash(i + 20); if (sx < x0) continue;
      boilSeed('sand' + i);
      inkLine([[sx, SAND_Y + 12 + 6 * hash(i)], [sx + 40, SAND_Y + 14 + 6 * hash(i)]], 1.2, C('#C9A66C'), 'dry', .3);
    }
    for (let i = 0; i < 7; i++) {   // reeds at the water's edge, swaying
      const rx = SHORE - 120 + i * 26 + hash(i) * 14, h = 70 + 50 * hash(i + 3), sw = wob(t, .35, hash(i) * 3) * 10;
      boilSeed('reed' + i);
      inkLine([[rx, SAND_Y + 4], [rx + sw * .4, SAND_Y - h * .55], [rx + sw, SAND_Y - h]], .9, C(mixCol(PAL.sap, PAL.ink, .25)), 'ink', .5);
    }
  }

  // ---------- the boat ----------
  // Hull in boat-local space: x along the boat (bow to the right), y up from the waterline. Two rows of planks
  // (0 = top, 1 = bottom) in three columns (0 = stern, 1 = middle, 2 = bow). Plank index = row * 3 + column.
  const top = s => -HH * (1 + .32 * s ** 4);
  const bot = s => -HH * 1.08 * Math.pow(Math.abs(s), 2.4);
  const midY = s => lerp(top(s), bot(s), .56);
  const COLS = [[-1, -.34], [-.34, .34], [.34, 1]];
  function plankPts(r, c, n = 7) {
    const [s0, s1] = COLS[c], up = r ? midY : top, lo = r ? bot : midY, P = [];
    for (let i = 0; i <= n; i++) { const s = lerp(s0, s1, i / n); P.push([s * HL, up(s)]); }
    for (let i = n; i >= 0; i--) { const s = lerp(s0, s1, i / n); P.push([s * HL, lo(s)]); }
    return P;
  }
  const centroid = P => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
  const PL = [0, 1].flatMap(r => [0, 1, 2].map(c => { const P = plankPts(r, c); return { r, c, P, ctr: centroid(P) }; }));
  const HEART_S = .66, HEART_AT = [HEART_S * HL, lerp(top(HEART_S), midY(HEART_S), .5)], HEART_R = 20;
  const STERN_POST = [-HL * .97, top(-.97) - 4], BOW_POST = [HL * .97, top(.97) - 4];
  const boatPt = (B, [x, y]) => { const c = Math.cos(B.rot), s = Math.sin(B.rot); return [B.x + x * c - y * s, B.y + x * s + y * c]; };

  // one plank around its own centre (P in plank-local coords), so it can sit in the hull or fly
  function plank(P, kind, key, o = {}) {
    const Wd = WOOD[kind];
    boilSeed(key);
    paint(P, { wash: C(Wd.wood), ink: C(PAL.ink), sw: .9 });
    const n = P.length / 2;
    for (const g of [.33, .68]) {   // grain: two strokes along the plank, broken where the hash says
      const L = []; for (let i = 0; i < n; i++) L.push([lerp(P[i][0], P[P.length - 1 - i][0], g), lerp(P[i][1], P[P.length - 1 - i][1], g)]);
      const a = Math.floor(hash(key.length * 7 + g * 10) * 2), b = n - Math.floor(hash(key.length + g * 13) * 2);
      if (b - a > 1) inkLine(L.slice(a, b), .5, C(Wd.grain), 'inkfine', .5);
    }
    if (kind === 'old') {   // weathering: a darker scuff and a nail
      const [cx, cy] = centroid(P);
      paint(ellPts(cx - 20, cy + 3, 22, 5, 10, 1), { wash: C(Wd.dk), ink: null });
      paint(ellPts(cx + 34, cy - 2, 2.4, 2.4, 6), { wash: C(PAL.ink), ink: null });
    }
    if (o.heart != null) heart(...o.heartAt, HEART_R * o.heart, o.broken || 0, key);
    if (o.crack > 0) crackLine(P, o.crack, key, o.crackAt ?? .5);
  }
  // the heart: whole, or broken in two along a zig-zag (broken = how far the halves have split)
  function heart(x, y, r, broken, key) {
    if (r < .5) return;
    boilSeed(key + 'heart');
    const n = 28, P = heartPts(x, y, r, n), ink = C(PAL.ink);
    if (broken <= 0) {
      paint(P, { wash: C(HEART), ink, sw: .7 });
      paint(ellPts(x - r * .45, y - r * .35, r * .22, r * .14, 8), { wash: C('#F4A0AE'), ink: null });
      return;
    }
    const Z = [[x, y - r * .3], [x - r * .2, y + r * .05], [x + r * .16, y + r * .35], [x - r * .08, y + r * .7]];
    const g = 2.5 * broken;
    const Rh = P.slice(0, n / 2 + 1).concat(Z.slice().reverse()).map(([a, b]) => [a + g, b]);
    const Lh = P.slice(n / 2).concat(Z).map(([a, b]) => [a - g, b + g * .3]);
    paint(Rh, { wash: C(HEART), ink, sw: .7 });
    paint(Lh, { wash: C(mixCol(HEART, '#8E2233', .2)), ink, sw: .7 });
  }
  // a crack zig-zagging across the plank, grown k = 0..1, at 'at' of the way along it
  function crackLine(P, k, key, at = .5) {
    const n = P.length / 2, i = Math.round(at * (n - 1)), a = P[i], b = P[P.length - 1 - i], Z = [];
    for (let j = 0; j <= 6; j++) { const q = j / 6; Z.push([lerp(a[0], b[0], q) + (j % 2 ? 7 : -5) * (j > 0 && j < 6), lerp(a[1], b[1], q)]); }
    const f = k * (Z.length - 1), m = Math.floor(f), Zk = Z.slice(0, m + 1);
    if (m < Z.length - 1) Zk.push([lerp(Z[m][0], Z[m + 1][0], f - m), lerp(Z[m][1], Z[m + 1][1], f - m)]);
    if (Zk.length < 2) return;
    boilSeed(key + 'crack');
    inkLine(Zk, 1.4, C(PAL.ink), 'ink', 0);
  }

  // the rig (mast and sail), drawn around the foot of the mast. kind old|new; fill billows the sail
  const MAST_X = -34, MAST_FOOT = -HH * .5, MAST_H = 330;
  function rigShape(kind, o = {}) {
    const mh = MAST_H, fill = o.fill || 0, ft = o.flutter || 0, bw = 14 + 60 * fill;
    boilSeed('rig' + (o.key || '') + kind);
    paint(rectPts(-6, -mh, 12, mh, 1), { wash: C(WOOD[kind].wood), ink: C(PAL.ink), sw: .8 });
    const S = through([[-8, -mh + 18], [-70 - bw * .3 + ft * 10, -mh * .62], [-150 - bw + ft * 6, -mh * .25], [-178 - bw * .5, -58]], 5);
    S.push([-8, -58]);
    paint(S, { wash: C(kind === 'old' ? SAIL_OLD : SAIL_NEW), ink: C(PAL.ink), sw: .9 });
    if (kind === 'old') {   // patches and a tear
      paint(rectPts(-70, -170, 34, 30, 1.5), { wash: C('#948873'), ink: C(PAL.ink), sw: .5 });
      paint(rectPts(-112, -110, 26, 24, 1.5), { wash: C('#A7967A'), ink: C(PAL.ink), sw: .5 });
      inkLine([[-40, -250], [-52, -232], [-44, -214], [-58, -200]], .8, C(PAL.ink), 'ink', 0);
    } else inkLine([[-12, -mh * .5], [-120 - bw * .6, -mh * .2]], 2.2, C(PAL.clay), 'dry', .4);
    inkLine([[-8, -58], [-178 - bw * .5, -58]], 1.4, C(WOOD[kind].dk), 'ink', 0);   // boom
  }
  function rig(kind, lift = 0, o = {}) { push(); translate(MAST_X, MAST_FOOT - lift); rotate(o.rot || 0); rigShape(kind, o); pop(); }

  // The whole boat. st: { key, planks: [{ kind, gap, crack, crackAt, heart, broken, pop, ox, oy, rot }], rig, crew, front }
  function boat(B, st) {
    push(); translate(B.x, B.y); rotate(B.rot);
    if (st.rig) rig(st.rig.kind, st.rig.lift || 0, { ...st.rig, key: st.key });
    if (st.crew) st.crew();
    PL.forEach((p, i) => {
      const s = st.planks[i], key = st.key + 'p' + i;
      if (s.gap) { boilSeed(key + 'gap'); paint(p.P, { wash: C(GAP), ink: C(PAL.ink), sw: .7 }); return; }
      const k = 1 + .12 * (s.pop || 0), [cx, cy] = p.ctr;
      push(); translate(cx + (s.ox || 0), cy + (s.oy || 0)); rotate(s.rot || 0); scale(k, 1 + .5 * (k - 1));
      plank(p.P.map(([a, b]) => [a - cx, b - cy]), s.kind, key, { heart: s.heart, broken: s.broken, heartAt: [HEART_AT[0] - cx, HEART_AT[1] - cy], crack: s.crack, crackAt: s.crackAt });
      pop();
    });
    // posts at bow and stern, for the rope
    boilSeed(st.key + 'posts');
    for (const [px, py] of [STERN_POST, BOW_POST]) paint(rectPts(px - 5, py - 12, 10, 18, .5), { wash: C(WOOD[st.planks[0].kind || 'old'].dk), ink: C(PAL.ink), sw: .6 });
    if (st.front) st.front();
    pop();
  }
  // a loose plank of slot i at (x, y), rotated a (its own centre)
  function loosePlank(i, x, y, a, kind, key, o = {}) {
    const p = PL[i], [cx, cy] = p.ctr;
    push(); translate(x, y); rotate(a);
    plank(p.P.map(([u, v]) => [u - cx, v - cy]), kind, key, { heart: o.heart, broken: o.broken, heartAt: [HEART_AT[0] - cx, HEART_AT[1] - cy], crack: o.crack, crackAt: o.crackAt });
    pop();
  }

  // ---------- acting helpers ----------
  // Where an arm's tip lands, replicating clawd()'s transforms, so held things touch the hand.
  function armTip(x, y, u, o, which = 'L') {
    const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which) || V.arms[0];
    const [px, dir] = A, a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
    let lx, ly;
    if (dir === 0) { const r = .7 - a; lx = px * u + Math.cos(r) * 2.1 * u; ly = -4.2 * u + Math.sin(r) * 2.1 * u; }
    else { const r = dir < 0 ? a : -a, root = (px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u; lx = root + Math.cos(r) * dir * 2.2 * u; ly = -4.5 * u + Math.sin(r) * dir * 2.2 * u; }
    const sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
    lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35); ly *= (o.sy ?? 1) * (1 - sq);
    const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    return [x + (o.dx || 0) * u + lx * c - ly * s, y + (o.dy || 0) * u + lx * s + ly * c];
  }
  // mood + pose: the pose wins for everything it sets, except offsets, which add up
  function merge(m, p) {
    const o = { ...m, ...p };
    o.dy = (m.dy || 0) + (p.dy || 0); o.sq = (m.sq || 0) + (p.sq || 0); o.rot = (m.rot || 0) + (p.rot || 0);
    return o;
  }
  const sparkle = (x, y, r, k) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: C('#FFF5E2'), washOp: 255 * (1 - k * k), ink: null }); };
  const crew = (x, y, o) => clawd(x, y, U, { noShadow: true, lt: C('#F5B394'), ...o });

  // Clawd's own "planks": seams appear, then six body panels renew one by one, like the boat (shot E), and stay renewed.
  const SEAM = [30.8, 31.6], FLIPS = [32.1, 32.6, 33.1, 33.6, 34.0, 34.4], FLIP_ORDER = [0, 5, 2, 1, 3, 4];
  function panelsHook(o, t) {
    const seamK = seg(t, ...SEAM); if (seamK <= 0) return undefined;
    const V = VIEWS[o.view] || VIEWS.front;
    return (u, sw) => {
      const xs = [0, 1, 2, 3].map(i => lerp(V.L + .12, V.R - .12, i / 3)), ys = [-7.88, -5, -2.12];
      for (let j = 0; j < 6; j++) {
        const ft = FLIPS[FLIP_ORDER.indexOf(j)], k = seg(t, ft, ft + .14); if (k <= 0) continue;
        const cI = j % 3, rI = Math.floor(j / 3), x0 = xs[cI] * u, x1 = xs[cI + 1] * u, y0 = ys[rI] * u, y1 = ys[rI + 1] * u;
        const col = k < .5 ? '#FFF5E2' : '#FDBE9C', dk = mixCol(col, o.dk || PAL.clayDk, .45);
        if (V.strip) {   // keep the darker side face in the 3/4 views
          const s0 = V.strip[0] * u, s1 = V.strip[1] * u, a = Math.max(x0, s0), b = Math.min(x1, s1);
          paint(rectPts(x0, y0, x1 - x0, y1 - y0, u * .03), { wash: C(col), ink: null });
          if (b > a) paint(rectPts(a, y0, b - a, y1 - y0, u * .03), { wash: C(dk), ink: null });
        } else paint(rectPts(x0, y0, x1 - x0, y1 - y0, u * .03), { wash: C(col), ink: null });
      }
      // the seams, growing
      const L = xs[0] * u, R = xs[3] * u;
      inkLine([[L, -5 * u], [lerp(L, R, seamK), -5 * u]], sw * .7, C(PAL.ink), 'inkfine', 0);
      for (const i of [1, 2]) inkLine([[xs[i] * u, -7.9 * u], [xs[i] * u, lerp(-7.9, -2.1, seamK) * u]], sw * .7, C(PAL.ink), 'inkfine', 0);
      if (V.face) {   // the face goes back on top
        const F = V.face;
        push(); translate(F.cx * u, 0); scale(F.fw, 1);
        if (o.blush) blush(u, sw, F, o.blush === true ? 1 : o.blush);
        eyes(u, o, sw, F.sides, clamp(o.smear || 0));
        push(); translate(F.mx * u, 0); mouth(u, o.mouth, sw); pop();
        pop();
      }
    };
  }

  // ---------- the story clock ----------
  const MONT = [11.4, 12.6, 13.8, 15.0], RIG_T = 16.2;
  // plank i → crack starts, bursts out, a new one rises in the hand, slapped in place
  const REP = {
    2: { crack: .6, burst: 1.95, rise: 4.8, slap: 5.2, dx: 62, arm: 'L', view: 'side' }, // the heart plank, pulled out by hand
    4: { crack: 8.45, burst: 8.95, rise: 9.55, slap: 10.12, dx: 0, arm: 'R' },
  };
  [[0, -70, 'L'], [1, 30, 'L'], [3, -70, 'L'], [5, 90, 'R']].forEach(([i, dx, arm], k) => {
    const tb = MONT[k]; REP[i] = { crack: tb, burst: tb + .15, rise: tb + .36, slap: tb + .62, dx, arm };
  });
  const SLAPS = Object.values(REP).map(r => r.slap).concat([16.9]);
  const PILE = [SHORE - 330, SAND_Y - 20];                                            // where thrown planks land (off screen)
  const HOLD = [1.95, 2.55, 4.44];                                                    // heart plank: pulled, held, let go
  const HAMMER = [20.4, 21.0, 21.6];
  const ROPE_T = { coil: 41.9, throw: 42.1, catch: 42.95, tie: [43.6, 44.3], taut: [45.4, 45.6] };
  const LAUNCH = [45.62, 46.35];
  const SAIL = [45.1, 45.5];

  const MOOD_A = [
    [0, 'happy'], [1.12, 'surprised', { lookX: .8, lookY: .6 }], [2.7, 'sad', { lookX: .6, lookY: -.3 }], [4.7, 'determined'],
    [6.75, 'happy'], [8.55, 'bored', { lookX: 0, lookY: .9 }], [10.3, 'relieved'], [11.55, 'determined'], [12.75, 'sleepy'],
    [13.95, 'determined', { emote: 'sweat' }], [15.15, 'hopeful'], [16.3, 'surprised'], [16.95, 'excited'], [17.5, 'proud'],
    [19.45, 'confused', { lookX: -1, lookY: 0 }], [22.95, 'surprised', { lookX: -.9 }], [23.8, 'confused'], [27.65, 'dizzy'],
    [29.7, 'neutral', { lookY: 1 }], [31.1, 'surprised', { lookY: 1 }], [32.35, 'scared', { lookY: 1 }],
    [36.2, 'thinking', { lookX: .2, lookY: .9 }], [40.9, 'idea'], [41.7, 'determined'], [42.35, 'hopeful', { lookX: .5 }],
    [43.35, 'happy'], [45.05, 'excited'], [46.8, 'love'], [49.2, 'happy'],
  ];
  const MOOD_B = [
    [0, 'determined'], [21.85, 'proud'], [22.35, 'smug', { lookX: .6 }], [42.7, 'surprised', { lookX: .8, lookY: -.5 }],
    [43.3, 'happy'], [44.5, 'proud'], [45.75, 'excited'], [46.9, 'love'], [49.3, 'happy'],
  ];

  // ---------- boats over time ----------
  const sailDist = t => t > 45.4 ? 35 * Math.pow(t - 45.4, 1.5) : 0;
  function boatA(t) {
    const dip = SLAPS.reduce((s, ts) => s + 5 * spring(t, ts, 6, 14), 0);
    return { x: AX + sailDist(t), y: WY + 3 * Math.sin(t * 1.4) + dip, rot: .015 * Math.sin(t * 1.1 + 1) + .01 * SLAPS.reduce((s, ts) => s + spring(t, ts, 6, 14), 0) };
  }
  function boatB(t) {
    if (t < LAUNCH[0]) return { x: BX, y: SAND_Y, rot: t > ROPE_T.taut[1] ? -.05 * Math.sin(Math.PI * seg(t, ROPE_T.taut[1], LAUNCH[0])) : 0 };
    const tx = boatA(t).x - TOW;
    if (t < LAUNCH[1]) {
      const k = seg(t, ...LAUNCH);
      return { x: lerp(BX, tx, ease(k)), y: lerp(SAND_Y, WY, easeIn(k)) - 14 * Math.sin(Math.PI * k), rot: .09 * Math.sin(Math.PI * k) };
    }
    return { x: tx - 12 * Math.sin(t * .9), y: WY + 3 * Math.sin(t * 1.4 + 1.7) + 10 * spring(t, LAUNCH[1], 5, 12), rot: .015 * Math.sin(t * 1.1 + 2.4) + .06 * spring(t, LAUNCH[1], 4, 10) };
  }
  const heartA = t => boatPt(boatA(t), HEART_AT);
  const heartB = t => boatPt(boatB(t), HEART_AT);

  // plank state of boat A
  function plankA(i, t) {
    const R = REP[i];
    if (t < R.burst) return { kind: 'old', crack: seg(t, R.crack, R.crack + .4), crackAt: i === 2 ? .485 : .45, heart: i === 2 ? 1 : null, broken: i === 2 ? seg(t, 1.0, 1.3) : 0 };
    if (t < R.slap) return { gap: true };
    return { kind: 'new', pop: spring(t, R.slap, 7, 22), heart: i === 2 ? backOut(seg(t, 5.55, 6.7)) : null };
  }
  function rigA(t) {
    if (t < RIG_T + .1) return { kind: 'old', rot: .05 * Math.sin(t * 40) * seg(t, RIG_T, RIG_T + .1) };
    if (t < RIG_T + .3) return null;
    const fill = ease(seg(t, ...SAIL)), flutter = spring(t, 16.9, 4, 16) + (t > SAIL[0] ? .4 * Math.sin(t * 7) : 0);
    return { kind: 'new', lift: -330 * (1 - backOut(seg(t, RIG_T + .3, 16.9))), fill, flutter };
  }
  // boat B's heart plank sits proud until it's hammered home
  function plankB(i, t) {
    const s = { kind: 'old', crack: 1, crackAt: i === 2 ? .485 : .45, heart: i === 2 ? 1 : null, broken: i === 2 ? 1 : 0 };
    if (i === 2) {
      const n = HAMMER.filter(h => t >= h).length, hit = HAMMER[n - 1];
      s.oy = [-16, -10, -5, 0][n] + (hit ? 3 * spring(t, hit, 9, 30) : 0); s.rot = [.1, .06, .03, 0][n];
    }
    return s;
  }

  // ---------- Clawd (A) ----------
  function poseA(t) {
    const m = emotions(t, MOOD_A);
    let dx = 40, p = {};
    if (t < 1.5) p = {};
    else if (t < 2.55) {           // turn to the bow, reach down, pull the broken plank up
      p = { ...turn(t, 1.5, 1.66, 0, .25), aL: kf(t, [[1.66, .2], [1.9, -.55], [2.0, -.55], [2.55, .85]]), rot: kf(t, [[1.6, 0], [1.9, .16], [2.1, .16], [2.5, 0]]) };
      dx = kf(t, [[1.5, 40], [1.85, 62]]);
    } else if (t < 4.0) {          // hold it up and look at the heart
      p = { view: 'side', aL: .85 + .05 * Math.sin(t * 2), rot: -.04 };
      dx = 62;
    } else if (t < 4.6) {          // turn away, wind up, toss it to the shore
      p = { ...turn(t, 4.0, 4.24, .25, -.25), aL: kf(t, [[4.24, .85], [4.36, .25], [4.44, 1.35], [4.6, .5]], easeOut),
            sq: .12 * Math.sin(Math.PI * seg(t, 4.24, 4.44)), rot: kf(t, [[4.24, 0], [4.36, .1], [4.46, -.12], [4.6, 0]]) };
      dx = kf(t, [[4.0, 62], [4.5, 30]]);
    } else if (t < 5.35) {         // turn back, lift a new plank and slam it in
      p = { ...turn(t, 4.6, 4.78, -.25, .25), aL: kf(t, [[4.78, .2], [4.92, -.6], [5.02, .95], [5.12, .2], [5.25, -.1]]),
            sq: .1 * Math.sin(Math.PI * seg(t, 4.8, 4.95)), rot: kf(t, [[4.8, .1], [5.0, -.05], [5.15, .15], [5.3, .12]]) };
      dx = kf(t, [[4.7, 30], [5.0, 62]]);
    } else if (t < 6.9) {          // paint a new heart
      const k = seg(t, 5.5, 6.7);
      p = { view: 'side', aL: -.1 + .1 * Math.sin(t * 17) * (k > 0 && k < 1 ? 1 : 0), rot: .07 };
      dx = 66;
    } else if (t < 8.4) { p = turn(t, 6.9, 7.06, .25, 0); dx = kf(t, [[6.9, 66], [7.3, 40]]); }
    else if (t < 17.4) {           // shot B and the montage: something bursts, flinch, lift a new one, slam it in
      const i = t < 11.4 ? 4 : t < RIG_T ? [0, 1, 3, 5][Math.min(3, Math.floor((t - 11.4) / 1.2))] : null;
      if (i != null) {
        const R = REP[i], tk = take(t, R.burst, .8);
        dx = R.dx;
        p = { view: 'front', [R.arm === 'L' ? 'aL' : 'aR']: kf(t, [[R.rise - .14, .2], [R.rise, -.75], [R.rise + .14, 1.0], [R.slap - .06, .3], [R.slap, -.35], [R.slap + .3, .2]]),
              sq: tk.sq + .16 * Math.sin(Math.PI * seg(t, R.rise - .16, R.rise + .06)), dy: tk.dy };
      } else {                     // the new rig: arms up to heave it in
        const tk = take(t, RIG_T + .1, .9), up = kf(t, [[RIG_T + .3, .2], [RIG_T + .45, 1.45], [17.0, 1.45], [17.3, .4]]);
        dx = 30; p = { view: 'front', aL: up, aR: up, sq: tk.sq, dy: tk.dy };
      }
    } else if (t < 29.2) {         // proud, then looking back and forth between the two boats
      dx = 30;
      if (t > 23.95 && t < 25.6) p = { lookX: kf(t, [[23.95, -.2], [24.05, -1], [24.5, -1], [24.6, 1], [24.95, 1], [25.05, -1], [25.3, -1], [25.4, 1]], easeOut), lookY: kf(t, [[24.5, 0], [24.6, .7], [24.95, .7], [25.05, 0], [25.3, 0], [25.4, .7]]) };
    } else if (t < 40) {           // lean over the side and look into the water
      dx = 30;
      p = { dy: -.25 * ease(seg(t, 29.5, 30.2)) + .25 * ease(seg(t, 37.6, 38.3)), rot: .04 * Math.sin(t * .9) };
      if (t > 38.3) p = { ...p, lookX: .9, lookY: .6 };
    } else if (t < 41.6) { dx = 40; p = t < 40.9 ? { lookX: .9, lookY: .7 } : {}; }
    else if (t < 45.0) {           // turn to the builder and throw the rope
      dx = 20;
      p = { ...turn(t, 41.62, 41.82, 0, -.25), aL: kf(t, [[41.82, .3], [41.95, .1], [42.08, -.4], [42.14, 1.35], [42.5, .7], [43.2, .4]], easeOut),
            rot: kf(t, [[41.95, 0], [42.08, .1], [42.16, -.12], [42.5, 0]]) };
    } else if (t < 46.7) { dx = 30; p = { ...turn(t, 45.0, 45.2, -.25, .25), aL: kf(t, [[45.2, .3], [45.35, 1.2]]) }; }
    else {
      dx = 30; p = { ...turn(t, 46.7, 46.86, .25, 0), lookX: -.9 };
      if (t > 49.4 && t < 51.8) p.aL = 1.2 + .45 * Math.sin((t - 49.4) * 12);   // waving back
    }
    return { dx, o: merge(m, p) };
  }
  // ---------- the builder (B) ----------
  function poseB(t) {
    const m = emotions(t, MOOD_B);
    let dx = 60, p = {};
    if (t < 21.8) {                // hammering the heart plank home, on the beat
      const a = HAMMER.reduce((v, h) => t > h - .35 && t < h + .3 ? kf(t, [[h - .35, 1.3], [h - .06, 1.4], [h, .12], [h + .12, .22], [h + .3, 1.3]]) : v, 1.3);
      p = { view: 'side', aL: a, rot: .1 };
    } else if (t < 42.6) { p = turn(t, 21.8, 21.95, .25, 0); dx = kf(t, [[21.8, 60], [22.2, 30]]); }
    else if (t < 43.55) { dx = 30; p = { aR: kf(t, [[42.7, .2], [42.85, 1.4], [43.25, 1.3], [43.5, .6]], easeOut), lookX: .8 }; }
    else if (t < 44.5) { dx = kf(t, [[43.55, 30], [43.9, 70]]); p = { ...turn(t, 43.55, 43.72, 0, .25), aL: kf(t, [[43.72, .4], [44.0, -.35], [44.3, -.3], [44.45, .3]]), rot: kf(t, [[43.72, 0], [44.0, .15], [44.35, .15], [44.5, 0]]) }; }
    else { dx = 70; p = turn(t, 44.5, 44.66, .25, 0); if (t > 49.6 && t < 51.8) p.aR = 1.2 + .45 * Math.sin((t - 49.6) * 12 + 1); }
    return { dx, o: merge(m, p) };
  }

  // where held things sit relative to the hand (boat-local), so the hand-off between layers never jumps
  const heldNew = (R, q) => { const [hx, hy] = armTip(q.dx, -1.5 * U, U, q.o, R.arm), side = R.view === 'side' ? (q.o.flip ? -1 : 1) : R.arm === 'L' ? -1 : 1; return [hx + side * 30, hy - 14]; };
  const heldHeart = q => { const [hx, hy] = armTip(q.dx, -1.5 * U, U, q.o, 'L'); return [hx + (q.o.flip ? -10 : 10), hy - 34]; };
  const heldHeartRot = t => -.35 + .04 * Math.sin(t * 3);

  // ---------- drawing the boats with their crews ----------
  function drawBoatA(t) {
    const B = boatA(t);
    if (!onScreen(B.x - HL - 60, B.y - 520, B.x + HL + 60, B.y + 20)) return;
    const { dx, o } = poseA(t), cy = -1.5 * U;
    const R2 = REP[2], rig = rigA(t);
    boat(B, {
      key: 'A', planks: PL.map((_, i) => plankA(i, t)), rig,
      crew: () => {
        crew(dx, cy, { ...o, boilKey: 'A', draw: panelsHook(o, t) });
        // a new plank rising in the hand, still behind the hull
        for (const [i, R] of Object.entries(REP)) if (t >= R.rise && t < R.slap - .18) loosePlank(+i, ...heldNew(R, { dx, o }), 0, 'new', 'An' + i);
      },
      front: () => {
        // the heart plank: pulled from its slot into the hand, then held
        if (t >= HOLD[0] && t < HOLD[2]) {
          const p = PL[2], [hx, hy] = heldHeart({ dx, o }), k = ease(seg(t, HOLD[0], HOLD[1]));
          const at = [lerp(p.ctr[0], hx, k), lerp(p.ctr[1], hy, k) - 30 * Math.sin(Math.PI * k)];
          loosePlank(2, ...at, lerp(0, heldHeartRot(t), k), 'old', 'Ap2', { heart: 1, broken: 1, crack: 1, crackAt: .485 });
        }
        // a new plank slammed from the hand into its slot
        for (const [i, R] of Object.entries(REP)) if (t >= R.slap - .18 && t < R.slap) {
          const [hx, hy] = heldNew(R, poseA(R.slap - .18)), p = PL[+i], k = easeIn(seg(t, R.slap - .18, R.slap));
          loosePlank(+i, lerp(hx, p.ctr[0], k), lerp(hy, p.ctr[1], k), 0, 'new', 'An' + i);
        }
        // the paintbrush, from the hand down to the heart
        if (t > 5.3 && t < 6.9) {
          const [hx, hy] = armTip(dx, cy, U, o, 'L'), k = seg(t, 5.5, 6.7), g = backOut(seg(t, 5.3, 5.45)) * (1 - seg(t, 6.75, 6.9));
          const w = k > 0 && k < 1 ? [8 * Math.sin(t * 17), 5 * Math.cos(t * 13)] : [0, 0];
          const tip = [lerp(hx, HEART_AT[0] + w[0], g), lerp(hy, HEART_AT[1] + w[1] - 4, g)];
          boilSeed('brush');
          const bx = lerp(hx, tip[0], .78), by = lerp(hy, tip[1], .78);
          inkLine([[hx, hy], [bx, by]], 1.3, C('#6B4230'), 'ink', 0);
          paint(ribbon([[bx, by], tip], 7, 2), { wash: C(HEART), ink: C(PAL.ink), sw: .35 });
        }
        // the rope coil in the hand before the throw
        if (t >= 41.7 && t < ROPE_T.throw) {
          const [hx, hy] = armTip(dx, cy, U, o, 'L');
          boilSeed('coil');
          for (let k = 0; k < 3; k++) inkLine(ellPts(hx - 4 + k * 3, hy + 6, 16, 11, 12, .6), 1.4, C(ROPE), 'ink', .6);
        }
      },
    });
  }
  function drawBoatB(t) {
    const B = boatB(t);
    if (!onScreen(B.x - HL - 60, B.y - 520, B.x + HL + 60, B.y + 20)) return;
    const { dx, o } = poseB(t), cy = -1.5 * U;
    boat(B, {
      key: 'B', planks: PL.map((_, i) => plankB(i, t)), rig: { kind: 'old', fill: t > SAIL[0] ? .5 : 0, flutter: t > SAIL[0] ? .5 * Math.sin(t * 6) : 0 },
      crew: () => crew(dx, cy, { ...o, boilKey: 'B', hat: 'hard' }),
      front: () => {
        if (t < 21.8) {   // the hammer: a handle from the hand, the head at its end
          const [hx, hy] = armTip(dx, cy, U, o, 'L');
          const a = Math.atan2(hy - (-1.5 * U - 4.2 * U), hx - (dx + 1.6 * U)), L = 38, ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
          boilSeed('hammer');
          inkLine([[hx, hy], [ex, ey]], 3, C('#8A5A3C'), 'ink', 0);
          push(); translate(ex, ey); rotate(a);
          paint(rectPts(-6, -14, 12, 28, .5), { wash: C('#6C6A78'), ink: C(PAL.ink), sw: .6 });
          pop();
        }
      },
    });
  }

  // ---------- things in the air ----------
  function flights(t) {
    // old planks thrown to the shore
    for (const [i, R] of Object.entries(REP)) {
      const t0 = +i === 2 ? HOLD[2] : R.burst, a = t - t0; if (a < 0 || a > .7) continue;
      const p0 = boatPt(boatA(t0), +i === 2 ? heldHeart(poseA(t0)) : PL[+i].ctr), a0 = +i === 2 ? heldHeartRot(t0) : 0;
      const k = easeOut(a / .7), [x, y] = arcPt(p0, PILE, 260, k);
      loosePlank(+i, x, y, a0 - a * 9, 'old', 'Af' + i, +i === 2 ? { heart: 1, broken: 1, crack: 1, crackAt: .485 } : { crack: 1 });
    }
    // the old rig, heaved out and flying the same way
    const ra = t - (RIG_T + .1);
    if (ra > 0 && ra < .8) {
      const p0 = boatPt(boatA(RIG_T), [MAST_X, MAST_FOOT - 150]), k = easeOut(ra / .8), [x, y] = arcPt(p0, [PILE[0] - 60, PILE[1] - 120], 200, k);
      push(); translate(x, y); rotate(-ra * 5); translate(0, 150); rigShape('old', { key: 'fly' }); pop();
    }
    // wood chips flying in from the builder, off screen left
    for (const [j, t0] of [19.2, 19.8].entries()) {
      const a = t - t0; if (a < 0 || a > .55) continue;
      const [x, y] = arcPt([AX - 520, WY - 300], [AX - 190 + j * 60, WY + 4], 120, a / .55);
      boilSeed('chip' + j);
      push(); translate(x, y); rotate(a * 14 + j);
      paint(rectPts(-11, -4, 22, 8, .5), { wash: C(WOOD.old.wood), ink: C(PAL.ink), sw: .5 });
      pop();
    }
    // sparkles: every slap, and the glint running along the finished boat
    for (const ts of SLAPS) {
      const a = t - ts; if (a < 0 || a > .45) continue;
      const i = Object.entries(REP).find(([, R]) => R.slap === ts), B = boatA(ts);
      const c = i ? boatPt(B, PL[+i[0]].ctr) : boatPt(B, [MAST_X, MAST_FOOT - 200]);
      for (let k = 0; k < 4; k++) { const ang = k * TAU / 4 + .6; sparkle(c[0] + Math.cos(ang) * 60 * easeOut(a / .45), c[1] + Math.sin(ang) * 40 * easeOut(a / .45), 12, a / .45); }
    }
    for (let j = 0; j < 6; j++) {   // Clawd's panels renewing
      const ft = FLIPS[FLIP_ORDER.indexOf(j)], a = t - ft; if (a < 0 || a > .45) continue;
      const q = poseA(t), px = q.dx + lerp(-5, 5, (j % 3 + .5) / 3) * U, py = -1.5 * U + (Math.floor(j / 3) ? -3.5 : -6.5) * U + (q.o.dy || 0) * U;
      const [x, y] = boatPt(boatA(t), [px, py]);
      for (let k = 0; k < 4; k++) { const ang = k * TAU / 4 + .3; sparkle(x + Math.cos(ang) * 50 * easeOut(a / .45), y + Math.sin(ang) * 40 * easeOut(a / .45), 11, a / .45); }
    }
    for (let k = 0; k < 8; k++) {
      const s = -.85 + k * .24, a = t - (17.6 + k * .12); if (a < 0 || a > .45) continue;
      const [x, y] = boatPt(boatA(t), [s * HL, top(s) - 4]);
      sparkle(x, y, 22, a / .45);
    }
    // the rope, from boat A's stern post to wherever its end is
    if (t >= ROPE_T.coil) {
      const A = boatA(t), p0 = boatPt(A, STERN_POST);
      let end, slack;
      const tipA = tt => { const q = poseA(tt); return boatPt(boatA(tt), armTip(q.dx, -1.5 * U, U, q.o, 'L')); };
      const tipB = (tt, w) => { const q = poseB(tt); return boatPt(boatB(tt), armTip(q.dx, -1.5 * U, U, q.o, w)); };
      if (t < ROPE_T.throw) { end = tipA(t); slack = 30; }
      else if (t < ROPE_T.catch) { const k = seg(t, ROPE_T.throw, ROPE_T.catch); end = arcPt(tipA(ROPE_T.throw), tipB(ROPE_T.catch, 'R'), 170, easeOut(k)); slack = 40 + 60 * k; }
      else if (t < ROPE_T.tie[0]) { end = tipB(t, 'R'); slack = 90; }
      else { const k = ease(seg(t, ...ROPE_T.tie)); end = mixCam(tipB(ROPE_T.tie[0], 'R'), boatPt(boatB(t), BOW_POST), k); slack = 90; }
      slack *= 1 - seg(t, ...ROPE_T.taut);
      if (t > ROPE_T.taut[1]) slack = 6 + 4 * Math.sin(t * 3) + 30 * spring(t, ROPE_T.taut[1], 5, 14) * (t < LAUNCH[1] ? 0 : 1);
      const mid = [(p0[0] + end[0]) / 2, (p0[1] + end[1]) / 2 + slack];
      boilSeed('rope');
      inkLine(through([p0, [lerp(p0[0], mid[0], .5), lerp(p0[1], mid[1], .8)], mid, [lerp(end[0], mid[0], .5), lerp(end[1], mid[1], .8)], end], 4), 2.2, C(ROPE), 'ink', .5);
    }
    // the splash as the old boat hits the water
    const sa = t - (LAUNCH[1] - .08);
    if (sa > 0 && sa < .7) for (let k = 0; k < 9; k++) {
      const ang = -Math.PI / 2 + (k - 4) * .28, v = 160 + 90 * hash(k + 3), x = SHORE + 20 + Math.cos(ang) * v * sa * 1.4, y = WY - 10 + Math.sin(ang) * v * sa * 1.6 + 500 * sa * sa;
      boilSeed('drop' + k);
      paint(ellPts(x, y, 7 * (1 - sa), 9 * (1 - sa), 8), { wash: C(mixCol(WATER, '#FFFFFF', .5)), ink: C(PAL.ink), sw: .4 });
    }
    // wind: streaks across the sky once the sail fills
    if (t > SAIL[0] && t < 48.5) for (let k = 0; k < 5; k++) {
      const ph = frac((t - SAIL[0]) * .7 + hash(k)), x = boatA(t).x - 500 + ph * 1100, y = WY - 520 - k * 70 - 40 * hash(k + 5), al = Math.sin(ph * Math.PI);
      boilSeed('wind' + k);
      inkLine([[x - 90, y], [x, y - 8], [x + 70, y + 4]], 1.6 * al, C('#FFFFFF'), 'dry', .5);
    }
  }
  // wakes behind the moving boats
  function wakes(t, S) {
    if (t < 45.4) return;
    const col = mixCol(S.hor, '#FFFFFF', .45);
    for (const B of [boatA(t), boatB(t)]) for (let k = 0; k < 3; k++) {
      const x = B.x - HL - 20 - k * 70 - ((t * 60) % 70);
      boilSeed('wake' + Math.round(B.x / 500) + k);
      inkLine([[x, WY + 10 + k * 6], [x - 60, WY + 18 + k * 10]], 1.1 * (1 - k * .25), col, 'inkfine', .3);
    }
  }
  // everything above the waterline (painted twice: mirrored for the reflection, then for real)
  function above(t) { shore(t); drawBoatB(t); drawBoatA(t); flights(t); }

  // ---------- one frame, from any camera ----------
  const RINGS = Object.entries(REP).filter(([i]) => +i >= 3).map(([i, R]) => [AX + PL[+i].ctr[0], R.slap, .35])
    .concat([[AX - 190, 19.2 + .55, .25], [AX - 130, 19.8 + .55, .25], [SHORE + 40, LAUNCH[1], 1.3]]);
  function frame(t, c, o = {}) {
    const S = skyAt(t);
    cam(c);
    skyAndWater(t, S);
    withRefl(() => { push(); translate(0, 2 * WY); scale(1, -1); above(t); pop(); });
    ripples(t, S, RINGS, o.wave || 0);
    wakes(t, S);
    above(t);
    camEnd();
  }
  // full-frame effects, in screen space
  function heartIris(x, y, r) {
    flushBrush();
    const box = [[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]];
    flat(box, PAL.ink, r < 3 ? null : heartPts(x, y + r * .15, r, 40));
  }
  function whip(k, dir) {   // speed streaks over a whip pan
    const a = Math.sin(Math.PI * clamp(k)); if (a < .05) return;
    for (let i = 0; i < 14; i++) {
      const y = (i + .5) / 14 * H + jit(20), x = W / 2 + dir * (hash(i) - .5) * W * .6, L = 300 + 500 * hash(i + 3);
      boilSeed('whip' + i);
      inkLine([[x - L / 2, y], [x + L / 2, y + jit(6)]], 3 * a, i % 3 ? '#FFFFFF' : PAL.ink, 'dry', .2);
    }
  }

  // ---------- shots ----------
  const MED_A = t => { const B = boatA(t); return [B.x + 30, WY - 160, 1.32]; };

  // A 0–8.4: the heart breaks; the plank is replaced and the heart painted again
  function shotA(t, lt) {
    const Hh = heartA(t), med = [AX + 40 + 8 * Math.sin(t * .5), WY - 170, 1.62 + .01 * t], pnt = [AX + 140, WY - 120, 2.6 + .06 * (t - 5.3)];
    let c;
    if (t < 1.05) c = [Hh[0], Hh[1], lerp(5.0, 5.3, t / 1.05)];
    else if (t < 5.3) {   // pull back fast; push in on the held heart while Clawd grieves; back out for the throw
      const hold = [AX + 110, WY - 190, 2.5], k = easeOut(seg(t, 1.05, 1.42)), h = ease(seg(t, 2.6, 3.2)) * (1 - ease(seg(t, 3.9, 4.3)));
      c = mixCam(mixCam([Hh[0], Hh[1], 5.3], med, k), hold, h);
    }
    else if (t < 6.8) c = mixCam(med, pnt, ease(seg(t, 5.3, 5.7)));
    else c = mixCam(pnt, med, ease(seg(t, 6.8, 7.4)));
    frame(t, c);
    if (lt < .6) heartIris(...scr(Hh, c), lerp(0, 2600, easeIn(lt / .6)));
  }
  // B 8.4–11.4: noon, the next plank
  function shotB(t) { frame(t, [AX + 10 + 12 * (t - 8.4), WY - 180, 1.45 + .015 * (t - 8.4)]); }
  // C 11.4–17.4: the montage, a hard cut on every beat, from a different angle each time
  const CC = [[-110, -120, 2.3], [0, -200, 1.5], [-130, -80, 2.6], [150, -110, 2.3], [60, -300, 1.35]];   // never left of x 230: the old boat stays hidden
  function shotC(t) {
    const k = Math.min(4, Math.floor((t - 11.4) / 1.2)), lk = t - 11.4 - k * 1.2, [ox, oy, z] = CC[k];
    frame(t, [AX + ox + 12 * lk * (k % 2 ? 1 : -1), WY + oy, z * (1 + .03 * lk)]);
  }
  // D 17.4–29.2: the new boat; the builder and the old boat; two boats, two hearts
  const MED_B = [BX + 90, WY - 180, 1.7], TWO = [285, WY - 190, .92];
  function shotD(t) {
    const mA = t2 => [AX + 30 - 6 * (t2 - 17.4), WY - 170, 1.6 + .02 * (t2 - 17.4)];
    let c, wk = -1, wd = 0;
    if (t < 20.0) c = mA(t);
    else if (t < 20.3) { wk = seg(t, 20.0, 20.3); wd = -1; c = mixCam(mA(20.0), MED_B, ease(wk)); }
    else if (t < 22.6) c = [MED_B[0] + 6 * (t - 20.3), MED_B[1], MED_B[2] + .02 * (t - 20.3)];
    else if (t < 22.9) { wk = seg(t, 22.6, 22.9); wd = 1; c = mixCam([MED_B[0] + 13.8, MED_B[1], MED_B[2] + .046], [AX + 30, WY - 170, 1.6], ease(wk)); }
    else if (t < 25.6) c = mixCam([AX + 30, WY - 170, 1.6], TWO, ease(seg(t, 23.3, 24.2)));
    else if (t < 27.6) {   // match cuts between the two hearts, faster each time
      const cuts = [25.6, 26.15, 26.65, 27.05, 27.35], n = cuts.filter(x => t >= x).length - 1, Hh = n % 2 ? heartA(t) : heartB(t);
      c = [Hh[0], Hh[1], 6 + .2 * (t - cuts[n])];
    } else c = [AX + 30, WY - 170, 1.65, .03 * Math.sin(t * 3.2)];
    frame(t, c);
    if (wk >= 0) whip(wk, wd);
  }
  // E 29.2–40: the reflection: Clawd renews too
  function shotE(t) {
    const B = boatA(t), fy = B.y - 1.5 * U - 6 * U - .25 * U, faceR = [B.x + 30, 2 * WY - fy];
    // the mirror shot: Clawd above the line, the reflection below it, framed symmetrically
    const med = [B.x + 30, WY - 170, 1.65], refl = [B.x + 30, WY - 20, 2.15 + .06 * (t - 30.6)], eyes = [faceR[0], faceR[1] + 6, 3.8], up = [B.x + 30, WY - 160, 1.75];
    let c;
    if (t < 30.6) c = mixCam(med, refl, ease(seg(t, 29.3, 30.6)));
    else if (t < 35.0) c = refl;
    else if (t < 37.5) c = mixCam(refl, eyes, ease(seg(t, 35.0, 36.0)));
    else c = mixCam(eyes, up, ease(seg(t, 37.5, 39.0)));
    frame(t, c);
  }
  // F 40–53.6: the idea, the rope, sailing off together
  function shotF(t) {
    const A = boatA(t), Bb = boatB(t);
    let c;
    if (t < 41.6) c = [A.x + 110, WY - 140, 2.4 + .04 * (t - 40)];
    else {
      const mid = (A.x + Bb.x) / 2, two = [Math.max(TWO[0], mid + 40), TWO[1] + 20, 1.05];
      c = mixCam(two, [mid + 160, WY - 560, .52], ease(seg(t, 48.0, 53.6)));
    }
    frame(t, c);
  }
  // G 53.6–58: the heart's reflection; the heart iris closes (and opens the loop again)
  function shotG(t) {
    // the heart and its reflection; the camera settles on the heart itself, where the next loop begins
    const Hh = heartA(t), k = ease(seg(t, 54.6, 56.6)), c = [Hh[0], lerp(WY + 10, Hh[1], k), lerp(2.6, 5.0, k)];
    frame(t, c, { wave: 1 - seg(t, 53.6, 55.0) * .6 });
    if (t > 56.7) heartIris(...scr(Hh, c), kf(t, [[56.7, 2600], [57.85, 0]], easeIn));
  }

  shots([[0, shotA], [8.4, shotB], [11.4, shotC], [17.4, shotD], [29.2, shotE], [40, shotF], [53.6, shotG]]);
})();
