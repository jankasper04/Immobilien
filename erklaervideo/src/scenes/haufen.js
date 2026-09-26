// haufen.js: "Das Haufen-Paradox (Sorites)", 32 s, 9:16. The storyboard is STORYBOARD_haufen.md.
// One beach, one clock: the heap's size, the gull's pecks, the sun and Clawd are pure functions of video time t. The
// shots only choose cameras and transitions. The heap is a flat body with speckles; only the grains the camera is close
// to (the ridge by the gull's beak, the last handful, the new pile) are painted one by one.
(() => {
  // ---------- world ----------
  const GY = 2000, HX = 540, H0 = 950, K = .78;      // ground line, heap centre, full height, half-width per unit height
  const U = 24, G = 7;                                // Clawd's unit, a grain's radius
  const HORIZON = GY - 470, SHORE = GY - 250;
  const CX0 = HX + K * H0 * .92 + 150;                // Clawd beside the full heap
  const STAND_D = HX + 168, LIE = HX + 190;           // Clawd by the handful; Clawd lying by the last grain
  const INK = PAL.ink, GRAIN_INK = '#6B4A32';
  const GULL = { body: '#F7F3EA', shade: '#DCDDE3', wing: '#A6B1C1', tip: '#35303C', beak: '#F2C14E', spot: '#D8394E', leg: '#E9A36A' };

  let VIEW = null, Z = 1;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot); Z = z;
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
  }
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  // camera move: zoom in log space, the centre in view-size space, so a big pull back feels even
  function camMix(a, b, k) {
    const za = a[2], zb = b[2], z = Math.exp(lerp(Math.log(za), Math.log(zb), k));
    const m = Math.abs(1 / zb - 1 / za) < 1e-4 ? k : (1 / z - 1 / za) / (1 / zb - 1 / za);
    return [lerp(a[0], b[0], m), lerp(a[1], b[1], m), z, lerp(a[3] || 0, b[3] || 0, k)];
  }
  // flat colour for the big backgrounds and the iris (huge washes are slow on software WebGL)
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const lin = (t, Kk) => kf(t, Kk, x => x);
  const inView = (x, y, m = 60) => x > VIEW.x0 - m && x < VIEW.x1 + m && y > VIEW.y0 - m && y < VIEW.y1 + m;
  const boxIn = (x0, y0, x1, y1, m = 40) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;

  // ---------- the heap's shape ----------
  const shapeOf = s => s >= 1 ? 0 : Math.pow(1 - Math.pow(s, 1.6), 1.7);
  const prof = (x, h) => h < 1 ? GY : GY - h * shapeOf(Math.abs(x - HX) / (K * h));

  // ---------- the clock ----------
  // the time of day (hours): noon, the time lapse races, the checks nearly stop it, sunset at the last grain
  const DAY = [[0, 12], [8.8, 12.2], [9.8, 13.3], [10.7, 13.4], [11.6, 14.6], [12.5, 14.7], [13.1, 15.5], [14.0, 15.6], [14.4, 15.9],
               [17.4, 16.6], [21.0, 17.8], [26.4, 18.6], [32, 19.2]];
  const dayOf = t => lin(t, DAY);
  // the heap's height: whole, then the time lapse (holding still at each check), then one peck at a time
  const HK = [[0, H0], [8.8, H0], [9.8, 720], [10.7, 712], [11.6, 480], [12.5, 474], [13.1, 330], [14.0, 326], [14.4, 215]];
  const C2P = [15.0, 15.6, 16.2, 16.8];
  function heightOf(t) {
    if (t < 14.4) return lin(t, HK);
    let h = 215; for (const tp of C2P) h -= 26 * easeOut(seg(t, tp, tp + .15)); return h;
  }
  const DISC = 17.4;                                   // from here on the pile is single grains
  // the handful, in the order it was piled up (the gull takes them from the top down, the last one is the centre)
  const ORDER = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [-.5, 1], [.5, 1], [-1.5, 1], [1.5, 1], [0, 2]];
  const DP = [17.7, 18.0, 18.3, 18.6, 18.9, 19.2, 19.5, 19.95, 20.4];
  const countOf = t => { let n = 10; for (const tp of DP) if (t >= tp) n--; return n; };
  const slot = ([c, r]) => [HX + c * 2 * G * 1.02 + (hash(c * 7 + r * 3 + 1) - .5) * 2, GY - G * .85 - r * 2 * G * .86 + (hash(c * 5 + r + 9) - .5) * 1.5];
  // the new pile: Clawd picks a grain out of the sand and places it
  const PLACE = [
    { s: [1, 0], pick: 27.25, rel: 27.98, land: 28.2 },
    { s: [2, 0], pick: 28.85, rel: 29.22, land: 29.4 },
    { s: [1.5, 1], pick: 29.78, rel: 30.44, land: 30.6 },
  ];

  // the gull's pecks: tp = the beak closes on the grain (on the beat), d = speed (1 = normal), toss = where it goes
  const PECKS = [{ tp: .6, d: 1.15, toss: 'clawd', tossAt: 3.0, tossD: 1 }, { tp: 6.6, d: 1, toss: 'back' }];
  for (const [a, b] of [[8.9, 9.8], [10.7, 11.6], [12.5, 13.1], [13.95, 14.4]]) for (let tp = a; tp < b - .02; tp += .3) PECKS.push({ tp, d: .4, toss: 'back' });
  for (const tp of C2P) PECKS.push({ tp, d: .8, toss: 'back' });
  DP.forEach((tp, i) => PECKS.push({ tp, d: i < 7 ? .45 : .85, toss: i < 8 ? 'back' : null, slot: ORDER[9 - i] }));
  PECKS.sort((a, b) => a.tp - b.tp);
  const FLY = [20.62, 21.5];                           // the gull flies off with the second-to-last grain
  const PLANT = 8.82;                                  // Clawd lets go of the spade

  // ---------- sky ----------
  const SKIES = {
    noon:   { top: '#78B2E2', mid: '#A8D3EC', hor: '#E4F1EC', sea: '#3F93A8', seaHi: '#8CC7CF', sand: '#EFD9A8', wet: '#D8BD8A', heap: '#E4BF80', heapDk: '#C99A5C', sun: '#FFF3CC', cloud: '#FFFBF2' },
    gold:   { top: '#7FA6D4', mid: '#DCC6A4', hor: '#F8CC8C', sea: '#4A87A0', seaHi: '#E6C48E', sand: '#F0CF96', wet: '#D3AE78', heap: '#E5B274', heapDk: '#BE8A52', sun: '#FFD98A', cloud: '#FFF1DC' },
    sunset: { top: '#58509A', mid: '#C27497', hor: '#F7A56E', sea: '#5E5A92', seaHi: '#E79A86', sand: '#E8B48C', wet: '#C98E78', heap: '#D99E6E', heapDk: '#A96E5A', sun: '#FFC27A', cloud: '#F6C2B0' },
    dusk:   { top: '#343A74', mid: '#735C98', hor: '#DE9080', sea: '#434C82', seaHi: '#BE8290', sand: '#CFA290', wet: '#AA8080', heap: '#C0907A', heapDk: '#8E6468', sun: '#FFA070', cloud: '#D8A6B0' },
  };
  const SKY_K = [[12, 'noon'], [15.4, 'gold'], [17.9, 'sunset'], [19.6, 'dusk']];
  function skyOf(d) {
    let i = 0; while (i + 1 < SKY_K.length && d >= SKY_K[i + 1][0]) i++;
    const A = SKIES[SKY_K[i][1]]; if (i + 1 >= SKY_K.length) return A;
    const B = SKIES[SKY_K[i + 1][1]], k = ease(seg(d, SKY_K[i][0], SKY_K[i + 1][0])), S = {};
    for (const f in A) S[f] = mixCol(A[f], B[f], k);
    return S;
  }
  const sunOf = d => kf(d, [[12, [HX + 560, GY - 1540]], [15.5, [HX + 640, GY - 1060]], [17, [HX + 690, GY - 720]], [18.3, [HX + 720, HORIZON - 30]], [19.2, [HX + 740, HORIZON + 90]]], x => x);

  // ---------- background ----------
  function background(t, S, day) {
    const { x0, x1, y0, y1 } = VIEW, m = 120, step = 120;
    const xs = Math.floor((x0 - m) / step) * step, xe = Math.ceil((x1 + m) / step) * step;
    const band = (ya, yb, col, wa, wb) => {   // a flat band between two gently waving edges
      if (yb < y0 - m || ya > y1 + m) return;
      const P = []; for (let x = xs; x <= xe; x += step) P.push([x, Math.max(ya, y0 - m) + (ya > y0 - m ? wa(x) : 0)]);
      for (let x = xe; x >= xs; x -= step) P.push([x, Math.min(yb, y1 + m) + (yb < y1 + m ? wb(x) : 0) + 1]);
      flat(P, col);
    };
    const wv = j => x => 14 * Math.sin(x * .004 + j) + 2 * Math.sin(x * .05 + BOILN);
    const none = () => 0;
    // sky
    const SB = [[-1e5, S.top], [HORIZON - 1500, mixCol(S.top, S.mid, .5)], [HORIZON - 1000, S.mid], [HORIZON - 560, mixCol(S.mid, S.hor, .55)], [HORIZON - 260, S.hor]];
    SB.forEach(([ya, col], i) => band(ya, i + 1 < SB.length ? SB[i + 1][0] : HORIZON + 6, col, i ? wv(i) : none, i + 1 < SB.length ? wv(i + 1) : none));
    // the sun, then the sea in front of it
    const [sx, sy] = sunOf(day);
    if (inView(sx, sy, 300)) {
      glow(sx, sy, 300, S.sun, .8);
      boilSeed('sun'); paint(ellPts(sx, sy, 62, 62, 24, 1.2), { wash: mixCol(S.sun, '#FFFFFF', .2), ink: null });
    }
    // clouds race in the time lapse
    for (let i = 0; i < 4; i++) {
      const span = 2600, cx = -900 + ((i * 760 + 1600 - (day - 12) * 520 - t * 7) % span + span) % span, cy = GY - 2150 + i * 190 + 60 * hash(i + 4), s = .8 + .5 * hash(i + 9);
      if (!boxIn(cx - 200 * s, cy - 70 * s, cx + 200 * s, cy + 40 * s)) continue;
      boilSeed('cloud' + i);
      paint(through([[cx - 190 * s, cy + 24 * s], [cx - 120 * s, cy - 20 * s], [cx - 40 * s, cy - 60 * s], [cx + 50 * s, cy - 44 * s], [cx + 120 * s, cy - 10 * s], [cx + 190 * s, cy + 24 * s]], 5).concat([[cx - 190 * s, cy + 24 * s]]), { wash: S.cloud, ink: null });
    }
    // sea
    band(HORIZON, SHORE + 20, S.sea, none, none);
    band(HORIZON, HORIZON + 46, mixCol(S.sea, S.seaHi, .45), none, x => 4 * Math.sin(x * .01));
    for (let i = 0; i < 12; i++) {   // glitter on the water, under the sun
      const gx = sx - 260 + hash(i + 40) * 520 + 30 * Math.sin(t * .8 + i), gy = HORIZON + 30 + hash(i + 60) * (SHORE - HORIZON - 60);
      if (!inView(gx, gy)) continue;
      boilSeed('glit' + i);
      inkLine([[gx - 22, gy], [gx + 22, gy + jit(1)]], .8, S.seaHi, 'inkfine', 0);
    }
    // wet sand, foam, dry sand
    const surf = x => 6 * Math.sin(x * .006 + t * .9) + 10 * Math.sin(t * .7);
    band(SHORE - 12, SHORE + 60, S.wet, surf, x => 8 * Math.sin(x * .005 + 1));
    band(SHORE + 50, GY + 3000, S.sand, x => 8 * Math.sin(x * .005 + 1), none);
    if (boxIn(x0, SHORE - 30, x1, SHORE + 10)) {
      for (let k = 0; k < 3; k++) {
        const P = []; for (let x = xs; x <= xe; x += 60) P.push([x, SHORE - 12 + surf(x) + 4 * Math.sin(x * .03 + k)]);
        for (let a = 0; a < P.length - 2; a += 8) { boilSeed('foam' + k + '_' + a); inkLine(P.slice(a, a + 9), 1.1, '#FFF8EC', 'inkfine', .5); }
        break;
      }
    }
    // a few dry strokes and shells in the sand, for texture and scale
    for (let i = 0; i < 16; i++) {
      const px = -500 + hash(i + 3) * 2400, py = SHORE + 120 + hash(i + 13) * 1000; if (!inView(px, py, 40)) continue;
      boilSeed('sd' + i);
      inkLine([[px - 30, py], [px + 30, py + 3]], 1.1, mixCol(S.sand, S.heapDk, .5), 'dry', 0);
    }
  }

  // ---------- grains ----------
  const grainCols = S => [S.heap, mixCol(S.heap, S.sand, .6), mixCol(S.heap, S.heapDk, .5), mixCol(S.heap, '#FFF6E0', .35)];
  function grain(x, y, S, k, key, o = {}) {
    boilSeed(key);
    const c = grainCols(S)[Math.floor(hash(k * 3.7 + 1) * 4)], r = G * (o.sc || 1);
    paint(ellPts(x, y, r * (.92 + .16 * hash(k + 1)), r * (.8 + .12 * hash(k + 2)), 9, 0, hash(k + 3) * 3), { wash: c, ink: GRAIN_INK, sw: .34 });
    if (o.hero) paint(ellPts(x - r * .32, y - r * .3, r * .3, r * .2, 7), { wash: '#FFF8E8', ink: null });
  }
  function sparkleAt(x, y, r, k, col = '#FFF5E2') { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: col, washOp: 255 * (1 - k * k), ink: null }); }
  function puff(x, y, t0, t, s = 1) {   // a little spray of sand where a grain lands or leaves
    const a = t - t0; if (a < 0 || a > .45) return;
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI * (.1 + .8 * i / 4), d = (6 + 16 * easeOut(a / .45)) * s;
      boilSeed('puff' + i);
      paint(ellPts(x + Math.cos(ang) * d, y + Math.sin(ang) * d * .7, 2.2 * s * (1 - a / .45) + .4, 2 * s * (1 - a / .45) + .4, 6), { wash: '#FFF1D6', ink: null });
    }
  }

  // ---------- the heap ----------
  function heapShadow(h, S, day) {
    const w = K * h, L = lerp(40, 900, seg(day, 12, 18.6)) * Math.min(1, h / 300 + .1);
    if (!boxIn(HX - w - L, GY - 20, HX + w, GY + 60)) return;
    flat(ellPts(HX - w * .25 - L * .5, GY + 10, w * .8 + L * .5, 16 + h * .025, 30), mixCol(S.sand, S.heapDk, .42));
  }
  function heapBody(h, S, day) {
    const w = K * h;
    if (h < 2 || !boxIn(HX - w, GY - h - 10, HX + w, GY)) return;
    const n = 48, P = [];
    for (let i = 0; i <= n; i++) {
      const v = -1 + 2 * i / n, s = Math.sign(v) * Math.pow(Math.abs(v), 1.2), x = HX + s * w * 1.03;
      P.push([x, prof(x, h) + (i && i < n ? 1.2 * Math.sin(i * 2.3 + BOILN * .7) : 0)]);
    }
    flat(P.concat([[HX + w * 1.03, GY + 14], [HX - w * 1.03, GY + 14]]), S.heap);
    // the side away from the sun is in shade; it widens as the sun sinks
    const sf = lerp(.3, .55, seg(day, 12, 18.5)), Q = P.slice(0, n / 2 + 1);
    for (let j = 10; j >= 0; j--) { const vv = j / 10; Q.push([HX - w * (.03 + sf * Math.pow(vv, 1.15)), GY - h * .97 * (1 - vv) + (j ? 0 : 14)]); }
    Q.push([HX - w * 1.03, GY + 14]);
    flat(Q, mixCol(S.heap, S.heapDk, .75));
    speckles(h, S);
    // outline, in canvas-sized pieces
    const col = mixCol(INK, S.heapDk, .25);
    for (let a = 0; a < n; a += 8) {
      const piece = P.slice(a, a + 9);
      let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity; for (const p of piece) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); }
      if (!boxIn(bx0, by0, bx1, GY)) continue;
      boilSeed('hline' + a);
      inkLine(piece, 1.05, col, 'ink', .4);
    }
  }
  // speckles: fixed in the world, shown where the heap still is (so the surface sweeps down over them as it shrinks)
  function speckles(h, S) {
    const w = K * h, fine = Z > 2.2, sp = fine ? 17 : 46, skip = Z < .85 ? 2 : 1;
    const i0 = Math.floor(Math.max(HX - w, VIEW.x0 - 10) / sp), i1 = Math.ceil(Math.min(HX + w, VIEW.x1 + 10) / sp);
    const j0 = Math.max(0, Math.floor((GY - VIEW.y1 - 10) / sp)), j1 = Math.ceil(Math.min(h, GY - VIEW.y0 + 10) / sp);
    const cA = mixCol(S.heap, S.heapDk, .7), cB = mixCol(S.heap, '#FFF6E0', .45);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (skip > 1 && (i + j) % 2) continue;
      const key = i * 131.7 + j * 71.3 + (fine ? 5000 : 0), x = (i + hash(key)) * sp, y = GY - (j + hash(key + 7)) * sp;
      if (y < prof(x, h) + (fine ? 16 : 10) || y > GY - 3) continue;
      const r = (fine ? 2.2 : 3.4) + 1.6 * hash(key + 3);
      flat(ellPts(x, y, r, r * .75, 6, 0, hash(key + 5) * 3), hash(key + 11) > .5 ? cA : cB);
    }
  }
  // the grains along the ridge by the gull: painted one by one, more rows the closer the camera is
  function ridge(h, S, hide) {
    if (Z < 1.15) return;
    const w = K * h, rows = Z > 3.2 ? 4 : Z > 2.2 ? 2 : 1, xr = Math.min(Z > 2.2 ? 250 : 120, w * .95), st = 2 * G * .96;
    for (let r = rows - 1; r >= 0; r--) {
      const off = (r % 2) * st / 2;
      for (let i = Math.floor(-xr / st); i <= Math.ceil(xr / st); i++) {
        const k = i * 3 + r * 101 + 7, x0 = HX + i * st + off, x = x0 + (hash(k) - .5) * 3;
        const y = prof(x, h) + G * .15 + r * G * 1.5 + (hash(k + 1) - .5) * 2.5;
        if (y > GY - G || !inView(x, y, 20)) continue;
        if (hide && Math.hypot(x - hide[0], y - hide[1]) < G * 1.4) continue;
        grain(x, y, S, k, 'rg' + k);
      }
    }
  }
  const peakGrain = h => { const x = HX + 6; return [x, prof(x, h) - G * .8]; };

  // ---------- the gull ----------
  // gull(x, y, s, o): (x, y) = the feet; faces right unless o.flip. Body-local units at s = 1. o.head = head centre
  // (body-local), o.ang = head angle (+ = beak down), o.r = body lean, o.open = beak 0..1, o.carry = grain in the beak,
  // o.fly = wing phase (null = standing).
  const HEAD_REST = [44, -104], BEAK_TIP = [47, 3];
  const rotP = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  function gullLocalToWorld(G_, p) { const q = rotP(p, G_.r || 0); return [G_.x + (G_.flip ? -1 : 1) * G_.s * q[0], G_.y + G_.s * q[1]]; }
  const beakTipWorld = G_ => { const b = rotP(BEAK_TIP, G_.ang || 0); return gullLocalToWorld(G_, [G_.head[0] + b[0], G_.head[1] + b[1]]); };
  function gull(G_, S) {
    const f = G_.flip ? -1 : 1, s = G_.s, [hx, hy] = G_.head, a = G_.ang || 0;
    const R = p => { const q = rotP(p, a); return [hx + q[0], hy + q[1]]; };
    const sw = .95 / s;
    boilSeed('gull');
    push(); translate(G_.x, G_.y); scale(f * s, s);
    if (G_.fly == null) for (const [xa, xb] of [[-6, -10], [12, 16]]) {   // legs and webbed feet
      inkLine([[xa, -36], [xb, -3]], 1.3 / s, GULL.leg, 'ink', 0);
      paint([[xb - 9, 1], [xb + 13, 1], [xb + 2, -5]], { wash: GULL.leg, ink: INK, sw: sw * .45 });
    }
    rotate(G_.r || 0);
    const wing = (far) => {   // a flapping wing, as drawn keys: up, level, down
      const ph = G_.fly, k = Math.cos(ph), o = far ? [14, -6] : [0, 0], c = far ? mixCol(GULL.wing, INK, .2) : GULL.wing;
      const P = [[26, 0], [12, -60], [-6, -112], [-40, -152], [-56, -142], [-46, -100], [-40, -50], [-32, 0]].map(([x, y]) => [x + o[0] - 4, -80 + o[1] + y * k * (far ? .85 : 1)]);
      paint(through(P, 3), { wash: c, ink: INK, sw: sw * .8 });
      paint([P[2], P[3], P[4], P[5]], { wash: GULL.tip, ink: null });
    };
    if (G_.fly != null) wing(true);
    // body, neck and head: one outline
    const P = [[-88, -60], [-58, -73], [-20, -83], [16, -87],
      R([-18, 8]), R([-15, -11]), R([-3, -22]), R([11, -19]), R([20, -6]), R([19, 7]), R([9, 16]), R([-3, 19]),
      [40, -64], [36, -44], [18, -31], [-16, -29], [-52, -41], [-80, -53]];
    paint(through(P.concat([P[0]]), 3), { wash: GULL.body, ink: INK, sw });
    paint(through([[-60, -40], [-20, -32], [16, -34], [-10, -42], [-50, -48]], 3), { wash: GULL.shade, ink: null });
    if (G_.fly == null) {   // the folded wing
      paint(through([[28, -76], [-4, -83], [-44, -77], [-84, -67], [-112, -61], [-86, -52], [-44, -50], [-2, -56], [24, -65], [28, -76]], 3), { wash: GULL.wing, ink: INK, sw: sw * .85 });
      paint([[-80, -64], [-112, -61], [-88, -53]], { wash: GULL.tip, ink: null });
    } else wing(false);
    // beak: upper and lower half, the lower one hinges open
    const op = (G_.open || 0) * .55, hinge = [16, 5], L = ([x, y]) => { const q = rotP([x - hinge[0], y - hinge[1]], op); return R([hinge[0] + q[0], hinge[1] + q[1]]); };
    paint([[15, 5], [16, 8], [30, 10], [42, 9], [44, 6], [30, 5]].map(L), { wash: mixCol(GULL.beak, '#E0A030', .3), ink: INK, sw: sw * .6 });
    paint(ellPts(...L([37, 8]), 2.6, 2.2, 8), { wash: GULL.spot, ink: null });
    paint([[14, -5], [30, -6], [43, -3], [49, 2], [46, 5], [30, 4], [15, 5]].map(R), { wash: GULL.beak, ink: INK, sw: sw * .6 });
    // eye with a little brow: the gull looks sly
    const e = R([5, -8]);
    paint(ellPts(e[0], e[1], 3.4, 3.8, 10), { wash: INK, ink: null });
    paint(ellPts(e[0] - .8, e[1] - 1.4, 1.1, 1.1, 6), { wash: '#FFFFFF', ink: null });
    inkLine([R([-2, -14]), R([8, -15]), R([13, -11])], sw * .7, INK, 'inkfine', .5);
    pop();
  }

  // the gull's pose at t: where it stands, and what the latest peck is doing
  function peckOf(t) { let p = null; for (const q of PECKS) if (t >= q.tp - .34 * q.d) p = q; return p; }
  function gullFeet(t) {
    if (t >= DISC) return [HX - 88, GY + 4];
    const h = heightOf(t), x = HX - Math.min(64, .38 * K * h);
    return [x, prof(x, h) + 3];
  }
  function gullAt(t) {
    const [fx, fy] = gullFeet(t), g = { x: fx, y: fy, s: 1, flip: false, r: 0, head: HEAD_REST.slice(), ang: 0, open: 0, carry: false, fly: null };
    const idle = Math.sin(t * 2.3) * 2;
    g.head[1] += idle;
    if (t < .6) { g.ang = .35; g.head[0] += 3; g.head[1] += 4; }
    const p = peckOf(t);
    if (p) {
      const d = p.d, u = t - p.tp;
      let dive = 0, toss = 0;
      if (u < 0) { dive = ease(seg(u, -.34 * d, -.04 * d)); g.open = Math.sin(Math.PI * seg(u, -.22 * d, -.02 * d)); }
      else {
        dive = 1 - easeOut(seg(u, 0, .22 * d)); g.carry = true;
        if (p.toss) {
          const ts = (p.tossAt ?? p.tp + .24 * d) - p.tp, td = .32 * (p.tossD ?? d);
          if (u > ts) { const k = seg(u, ts, ts + td); toss = Math.sin(Math.PI * k); if (k > .45) g.carry = false; if (k > .35) g.open = Math.sin(Math.PI * seg(k, .35, 1)); }
        }
      }
      if (dive > 0) {
        // where the beak has to go: the peak grain, or the next grain of the handful
        const tgt = p.slot ? slot(p.slot) : peakGrain(heightOf(p.tp));
        const r = .45, loc = rotP([(tgt[0] - fx) / g.s, (tgt[1] - fy) / g.s], -r), b = rotP(BEAK_TIP, 1.05);
        const hd = [loc[0] - b[0], loc[1] - b[1]];
        g.r = r * dive; g.ang = 1.05 * dive;
        g.head = [lerp(g.head[0], hd[0], dive), lerp(g.head[1], hd[1], dive)];
      }
      if (toss > 0) {
        if (p.toss === 'clawd') { g.head = [g.head[0] + 16 * toss, g.head[1] - 10 * toss]; g.ang = -.35 * toss; g.r = .1 * toss; }
        else { g.head = [g.head[0] - 16 * toss, g.head[1] - 18 * toss]; g.ang = -.75 * toss; g.r = -.14 * toss; }
      }
    }
    if (t > FLY[0]) {   // off it goes, with the grain
      const k = seg(t, FLY[0], FLY[1]);
      g.fly = (t - FLY[0]) * 16; g.x = fx - 60 * k - 700 * Math.pow(k, 2.2); g.y = fy - 40 * ease(seg(t, FLY[0], FLY[0] + .12)) - 1000 * Math.pow(k, 1.4); g.r = -.3; g.head = [HEAD_REST[0] + 6, HEAD_REST[1] + 16]; g.ang = 0; g.carry = true; g.open = 0;
    }
    return g;
  }
  // grains the gull tosses away: a pure function of the peck list
  function flights(t, S) {
    PECKS.forEach((p, i) => {
      if (!p.toss) return;
      const ts = p.tossAt ?? p.tp + .24 * p.d, td = .32 * (p.tossD ?? p.d), rel = ts + td * .45;
      const dur = p.toss === 'clawd' ? .78 : .8, k = seg(t, rel, rel + dur);
      if (t < rel) return;
      const g = gullAt(rel), a = beakTipWorld(g);
      const b = p.toss === 'clawd' ? CLAWD_LAND : [a[0] - 420 - 260 * hash(i + 3), Math.max(a[1] + 200, GY + 40 + 60 * hash(i + 5))];
      if (k >= 1) { if (p.toss === 'clawd' && inView(b[0], b[1])) { grain(b[0], b[1], S, 77, 'landed'); puff(b[0], b[1] + 4, rel + dur, t); } return; }
      const [x, y] = arcPt(a, b, p.toss === 'clawd' ? 190 : 160, k);
      if (!inView(x, y)) return;
      if (p.toss === 'clawd') {   // the first grain gets a trail and a glint, so the eye follows it into the next shot
        const T = [0, 1, 2, 3].map(j => arcPt(a, b, 190, Math.max(0, k - j * .045)));
        boilSeed('trail'); inkLine(T, 1.4, '#FFF6E2', 'dry', .5);
        sparkleAt(x + 12, y - 12, 26, frac(t * 2.5));
      }
      grain(x, y, S, 90 + i, 'fl' + i, { hero: true });
    });
  }
  const CLAWD_LAND = [CX0 - 235, GY - 4];

  // ---------- the new pile, and the handful ----------
  function handful(t, S) {
    if (t < DISC) return;
    const n = countOf(t), pk = peckOf(t), inBeak = pk && pk.slot && t >= pk.tp;
    for (let i = 0; i < n; i++) { const [x, y] = slot(ORDER[i]); if (inView(x, y)) grain(x, y, S, i * 13 + 3, 'h' + i, { hero: i === 0 && t > 20.5 }); }
    for (const tp of DP) puff(...slot(ORDER[Math.max(0, countOf(tp - .01) - 1)]), tp, t, .8);
    // the new grains Clawd adds
    for (let i = 0; i < PLACE.length; i++) {
      const P = PLACE[i], [sx, sy] = slot(P.s);
      if (t >= P.land) { grain(sx, sy, S, 200 + i, 'np' + i, { hero: i === PLACE.length - 1 }); puff(sx, sy + 5, P.land, t, .8); if (i === PLACE.length - 1) sparkleAt(sx + 12, sy - 14, 18, seg(t, P.land, P.land + .6)); }
      else if (t >= P.rel) {
        const tip = clawdTip(P.rel), k = seg(t, P.rel, P.land);
        grain(lerp(tip[0], sx, k), lerp(tip[1] + G * .6, sy, easeIn(k)), S, 200 + i, 'np' + i);
      }
    }
    return inBeak;
  }

  // ---------- Clawd ----------
  function armPt(x, y, u, o, which = 'L', len = null) {
    const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which) || V.arms[0];
    const [px, dir] = A, a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
    let lx, ly;
    if (dir === 0) { const r = .7 - a, L = len ?? 2.1; lx = px * u + Math.cos(r) * L * u; ly = -4.2 * u + Math.sin(r) * L * u; }
    else { const r = dir < 0 ? a : -a, L = len ?? 2.2, root = (px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u; lx = root + Math.cos(r) * dir * L * u; ly = -4.5 * u + Math.sin(r) * dir * L * u; }
    const sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
    lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35); ly *= (o.sy ?? 1) * (1 - sq);
    const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    return [x + (o.dx || 0) * u + lx * c - ly * s, y + (o.dy || 0) * u + lx * s + ly * c];
  }
  const MOOD = [
    [0, 'proud'],
    [3.82, 'surprised', { lookX: .5, lookY: .8 }], [4.4, 'thinking', { lookX: .6, lookY: -1 }], [4.95, 'happy'], [5.75, 'smug', { lookX: .5, lookY: -.3 }],
    [7.3, 'neutral', { lookX: .7, lookY: -1 }], [7.8, 'happy'], [8.3, 'smug', { lookX: .6, lookY: -.4 }],
    [9.62, 'neutral', { lookX: .7, lookY: -1 }], [10.0, 'happy'], [10.62, 'neutral', { lookX: .5, lookY: -.6 }],
    [11.55, 'thinking', { lookX: .7, lookY: -.8 }], [11.95, 'neutral', { lookX: .6, lookY: -.5 }], [12.55, 'neutral', { lookX: .5, lookY: -.5 }],
    [13.05, 'suspicious', { lookX: .9, lookY: -.3 }], [13.5, 'nervous', { lookX: .8, lookY: -.3 }],
    [14.4, 'nervous', { lookX: .8, lookY: -.2 }], [15.15, 'thinking', { lookX: .6, lookY: -.3, emote: null }],
    [17.4, 'confused', { lookX: .8, lookY: .5, emote: null }],
    [20.5, 'surprised', { lookX: .7, lookY: -1 }], [20.85, 'neutral', { lookX: .8, lookY: .8 }],
    [21.0, 'neutral', { lookX: 1, lookY: .55 }], [22.25, 'confused', { lookX: 1, lookY: .4, emote: null }],
    [25.22, 'dizzy'], [26.65, 'determined', { lookX: .9, lookY: .6 }],
    [28.25, 'thinking', { lookX: 1, lookY: .6, emote: '?' }], [28.85, 'determined', { lookX: 1, lookY: .6 }],
    [29.45, 'thinking', { lookX: 1, lookY: .6, emote: '?' }], [29.72, 'determined', { lookX: 1, lookY: .6 }],
    [30.66, 'hopeful', { lookX: 1, lookY: .7, emote: '?' }],
  ];
  // checks: [time, strength]: a nod toward the heap
  const NODS = [[4.98, 1], [7.84, .9], [10.04, .8], [12.0, .5], [13.62, .28]];
  const TICKS = [[4.98, 1, .18, 0], [7.84, 1, .16, 0], [10.04, .92, .2, 0], [12.0, .8, .45, .25], [13.6, .72, .9, 1]];
  function nod(t) {
    let d = 0; for (const [t0, a] of NODS) { const k = seg(t, t0, t0 + .55 + .3 * (1 - a)); if (k > 0 && k < 1) d += a * Math.pow(Math.sin(k * TAU), 2); }
    return d;
  }
  function clawdX(t) {
    if (t < 8.8) return CX0;
    if (t < DISC) return HX + K * heightOf(t) * .92 + 150;
    if (t < 21.0) return STAND_D;
    return LIE;
  }
  // arm keys for building the new pile (the far arm, R, reaches out on the heading side)
  const BUILD_ARM = [[26.9, -1.5], [27.25, -1.8], [27.6, -.7], [27.98, 0], [28.3, -.3], [28.6, -1.4], [28.85, -1.8], [29.05, -.6], [29.22, -.3], [29.5, -.6],
                     [29.6, -1.4], [29.78, -1.8], [30.1, -.8], [30.44, -.2], [30.7, -.4], [31.0, -1.2]];
  function clawdAt(t) {
    const m = emotions(t, MOOD, { take: .7 }), x = clawdX(t), y = GY + 6, p = {};
    const lying = t >= 21.0;
    if (t < 3.7) { p.view = 'front'; p.aR = 1.25 + .06 * Math.sin(t * 5); }
    else { Object.assign(p, turn(t, 3.72, 3.92, 0, -.125)); }
    if (t > 3.7 && t < PLANT) p.aR = kf(t, [[3.7, 1.25], [4.0, -1.3]], easeOut);   // the spade goes down like a staff; let go when the time lapse starts
    else if (t >= PLANT && t < PLANT + .35) p.aR = lerp(-1.3, m.aR ?? .2, easeOut(seg(t, PLANT, PLANT + .35)));
    // walking with the shrinking heap
    if (t >= 8.8 && t < 14.4) { const w = (CX0 - x) / (4 * U); p.walk = w; if (Math.abs(heightOf(t + .05) - heightOf(t)) > .5) p.dy = -.35 * Math.abs(Math.sin(w * Math.PI)); }
    // the nods: lean in toward the heap and dip
    const nd = nod(t);
    p.rot = -.13 * nd; p.sq = .1 * nd; p.dyN = .25 * nd;
    if (t > 13.05 && t < 14.3) p.rot += -.12 * ease(seg(t, 13.05, 13.4)) * (1 - ease(seg(t, 14.0, 14.3)));   // leans in, unsure
    // torn: the head tips toward the tick, then toward the question, on every beat
    if (t > 15.15 && t < 17.35) { const s = tornSide(t); p.rot += .09 * s; p.lookX = .2 + .6 * s; p.lookY = -.4; }
    // the drop to the sand at the end of the handful
    if (t > 20.85 && t < 21.0) { p.sq = .3 * ease(seg(t, 20.85, 21.0)); }
    const o = { ...m, ...p, dy: (m.dy || 0) + (p.dy || 0) + (p.dyN || 0), sq: (m.sq || 0) + (p.sq || 0), rot: (m.rot || 0) * .6 + (p.rot || 0) };
    delete o.dyN;
    if (t >= 3.7) o.flip = true;
    if (t < 8.83) o.armR = (u, sw) => spade(sw);
    if (lying) {   // on its belly in the sand: no legs, the body rests on the ground
      o.view = 'q'; o.flip = true; o.noLegs = true;
      o.sq = .06 + (o.sq || 0) * .5; o.dy = 2 * (1 - o.sq) + (o.dy || 0) * .25; o.rot = (o.rot || 0) * .4;
      if (t > 26.8) o.aR = kf(t, BUILD_ARM, ease);
      if (t < 26.9) { o.aR = -2.0; o.aL = -1.8; }
    }
    return { x, y, o };
  }
  const clawdTip = t => { const c = clawdAt(t); return armPt(c.x, c.y, U, c.o, 'R'); };
  function spade(sw) {   // in arm space: the grip at the hand, the shaft along +x, the blade at the far end
    paint(rectPts(-5, -9, 9, 18, .5), { wash: '#B98A5A', ink: INK, sw: sw * .6 });
    paint(rectPts(0, -3.5, 72, 7, .5), { wash: '#C99A64', ink: INK, sw: sw * .6 });
    paint(through([[68, -13], [96, -12], [110, 0], [96, 12], [68, 13], [68, -13]], 3), { wash: '#5B93C9', ink: INK, sw: sw * .7 });
  }
  // let go: the spade topples over its blade and lies in the sand
  function droppedSpade(t) {
    const c = clawdAt(PLANT), a = armPt(c.x, c.y, U, c.o, 'R', 2.2), b = armPt(c.x, c.y, U, c.o, 'R', 3.2);
    const a0 = Math.atan2(b[1] - a[1], b[0] - a[0]), tip = [a[0] + Math.cos(a0) * 110, a[1] + Math.sin(a0) * 110];
    const k = easeIn(seg(t, PLANT, PLANT + .32)), ang = lerp(a0, 0, k) + .08 * spring(t, PLANT + .32, 8, 26);
    if (!inView(tip[0] - 60, tip[1], 160)) return;
    boilSeed('spade');
    push(); translate(tip[0] - Math.cos(ang) * 110, tip[1] - Math.sin(ang) * 110); rotate(ang); spade(1.1); pop();
  }
  function bucket(x) {
    if (!inView(x, GY - 60, 120)) return;
    boilSeed('bucket');
    paint([[x - 46, GY - 88], [x + 46, GY - 88], [x + 36, GY + 4], [x - 36, GY + 4]], { wash: '#D8573E', ink: INK, sw: 1 });
    paint(ellPts(x, GY - 88, 46, 10, 18), { wash: '#A8402E', ink: INK, sw: .8 });
    inkLine([[x - 44, GY - 84], [x - 30, GY - 132], [x, GY - 142], [x + 30, GY - 132], [x + 44, GY - 84]], 1, INK, 'ink', .6);
    inkLine([[x - 30, GY - 40], [x + 30, GY - 40]], 1.6, '#F3EBDC', 'dry', 0);
  }
  // the tick over Clawd's head: firm and quick at first, later small, slow and shaky
  function tickMark(x, y, s, prog, pop, col, wob, age, key) {
    const p = backOut(pop); if (p < .02 || prog <= .01) return;
    const A = [-1, -.05], B = [-.3, .72], C = [1.15, -1.1];
    const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]), l2 = Math.hypot(C[0] - B[0], C[1] - B[1]), d = prog * (l1 + l2);
    let P = d <= l1 ? [A, [lerp(A[0], B[0], d / l1), lerp(A[1], B[1], d / l1)]] : [A, B, [lerp(B[0], C[0], (d - l1) / l2), lerp(B[1], C[1], (d - l1) / l2)]];
    const rt = -.06 + wob * .2 * Math.sin(age * 11), c = Math.cos(rt), sn = Math.sin(rt);
    P = P.map(([a, b], i) => { const w = wob * .1 * Math.sin(age * 23 + i * 2); return [x + (a * c - b * sn + w) * s * p, y + (a * sn + b * c) * s * p]; });
    boilSeed(key);
    paint(ribbon(P, .52 * s * p, .36 * s * p), { wash: col, ink: INK, sw: clamp(s / 24, .35, 1.4) });
  }
  const tornSide = t => Math.sin(bpOf(t) * Math.PI);
  function headOf(c) { const o = c.o, sq = o.sq || 0; return [c.x + (o.dx || 0) * U, c.y + (o.dy || 0) * U - 8 * U * (1 - sq)]; }
  function marks(t, c) {
    const [hx, hy] = headOf(c);
    for (const [t0, s, dr, wob] of TICKS) {
      const life = t0 > 13 ? 1.2 : 1.0, a = t - t0; if (a < 0 || a > life) continue;
      const pop = seg(a, 0, .12) * (1 - seg(a, life - .22, life)), prog = easeOut(seg(a, 0, dr));
      const col = mixCol('#6FAE5C', PAL.ochre, wob * .5);
      const big = Math.max(1, 1 / Math.pow(Z, .8));
      tickMark(hx - 1.2 * U * big, hy - 2.6 * U * big, U * 1.05 * s * big, prog, pop, col, wob, a, 'tick' + t0);
    }
    if (t > 15.15 && t < 17.4) {   // torn: tick and question mark take turns
      const sd = tornSide(t), k = seg(t, 15.15, 15.4) * (1 - seg(t, 17.2, 17.4));
      tickMark(hx - 3.6 * U, hy - 2.4 * U, U * (.55 + .35 * Math.max(0, -sd)), 1, k, mixCol('#6FAE5C', PAL.ochre, .35), .5, t, 'torn1');
      emote('?', hx + 1.6 * U, hy - 1.5 * U, U * (.55 + .4 * Math.max(0, sd)), k, t);
    }
    if (t > 17.4 && t < 20.5) {   // the handful: the question grows with every grain that goes
      const k = seg(t, 17.5, 17.8) * (1 - seg(t, 20.4, 20.5)), n = countOf(t);
      emote('?', hx - 1.2 * U, hy - 1.6 * U, U * (.85 + .09 * (10 - n)), k, t - 17.5);
    }
    if (t > 25.25 && t < 26.6) {   // dizzy: a big question mark
      const k = seg(t, 25.3, 25.6) * (1 - seg(t, 26.4, 26.58));
      emote('?', hx - 1.5 * U, hy - 3.2 * U, U * 1.35, k, t - 25.3);
    }
  }

  // ---------- the ghost outlines: every size the heap has been ----------
  const GHOSTS = [30, 60, 110, 180, 270, 380, 510, 660, 810, 950];
  function ghosts(t) {
    if (t < 22.55 || t > 25.2) return;
    const n = GHOSTS.length, scan = seg(t, 24.15, 24.95), hi = scan > 0 && scan < 1 ? n - 1 - Math.floor(scan * n) : -1;
    GHOSTS.forEach((gh, i) => {
      const ta = 22.62 + i * .125, k = easeOut(seg(t, ta, ta + .35)); if (k <= 0) return;
      const h = gh * k, w = K * gh, P = [];
      if (!boxIn(HX - w, GY - h, HX + w, GY)) return;
      for (let j = 0; j <= 24; j++) { const v = -1 + 2 * j / 24, x = HX + Math.sign(v) * Math.pow(Math.abs(v), 1.2) * w; P.push([x, GY - h * shapeOf(Math.abs(x - HX) / w)]); }
      const on = i === hi, sw = (on ? 2.6 : 1.5) / Math.pow(Z, .6), col = on ? '#FFD27A' : '#FFF4DE';
      if (on) glow(HX, GY - h, 120 / Math.sqrt(Z), '#FFD27A', .6);
      for (let a = 0; a < 24; a += 6) { boilSeed('gh' + i + '_' + a); inkLine(P.slice(a, a + 7), sw, col, on ? 'ink' : 'dry', .5); }
    });
  }

  // ---------- frame ----------
  function frame(t, c, fx = {}) {
    const day = dayOf(t), S = skyOf(day), h = heightOf(t);
    cam(c);
    background(t, S, day);
    const disc = t >= DISC;
    if (!disc) heapShadow(h, S, day);
    bucket(CX0 + 175);
    if (t > PLANT) droppedSpade(t);
    if (!disc) {
      heapBody(h, S, day);
      const pk = peckOf(t), g0 = pk && !pk.slot && t < pk.tp ? peakGrain(heightOf(pk.tp)) : null;
      ridge(h, S, pk && t >= pk.tp && !pk.slot ? peakGrain(h) : null);
      if (g0 && inView(...g0)) { grain(g0[0], g0[1], S, 5, 'peak', { hero: true }); if (t < .62) sparkleAt(g0[0] + 7, g0[1] - 7, 9, seg(t, .05, .55)); }
    }
    if (t > 20.9 && t < 26.6) { const [lx, ly] = slot(ORDER[0]); glow(lx, ly - 2, 46 + 8 * Math.sin(t * 3), '#FFD9A0', .55 * seg(t, 20.9, 21.4)); }
    handful(t, S);
    ghosts(t);
    // Clawd
    const cl = clawdAt(t);
    clawd(cl.x, cl.y, U, { ...cl.o, boilKey: 'A' });
    // the grain in Clawd's hand while building
    for (const P of PLACE) if (t >= P.pick && t < P.rel) {
      const tip = armPt(cl.x, cl.y, U, cl.o, 'R');
      grain(tip[0], tip[1] + G * .6, S, 300, 'hand');
      puff(tip[0], tip[1] + G * 1.4, P.pick, t, .7);
    }
    // the gull
    const g = gullAt(t);
    if (boxIn(g.x - 160, g.y - 200, g.x + 160, g.y + 20)) {
      gull(g, S);
      if (g.carry) { const b = beakTipWorld(g); grain(b[0] - 1, b[1] + G * .35, S, 5, 'beak', { hero: true }); }
    }
    flights(t, S);
    marks(t, cl);
    if (t < 3.6 && t > .6) { const b = beakTipWorld(g); if (g.carry && t < 1.5) sparkleAt(b[0] + 14, b[1] - 10, 12, seg(t, .65, 1.25)); }
    camEnd();
    if (fx.whip != null) whipFX(fx.whip);
    if (fx.iris != null) iris2(fx.iris);
  }
  function whipFX(k) {
    const a = Math.sin(Math.PI * clamp(k)); if (a < .05) return;
    for (let i = 0; i < 11; i++) {
      const x = (i + .5) / 11 * W + jit(30), L = 600 + 700 * hash(i + 3), y = H / 2 + (hash(i) - .5) * H * .6;
      boilSeed('whip' + i);
      inkLine([[x, y - L / 2], [x + jit(6), y + L / 2]], 2.4 * a, i % 4 ? '#FFF4DE' : '#F2C49A', 'dry', 0);
    }
  }
  function iris2([x, y, r]) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], INK, r < 3 ? null : ellPts(x, y, r, r, 48));
  }

  // ---------- shots ----------
  const PEAK0 = peakGrain(H0);
  const ECU0 = [PEAK0[0] - 8, PEAK0[1] - 30, 7.0];
  const WIDE = [HX + 330, GY - 470, .64];
  // A 0–3.6: the beak takes a grain; pull back: a gull on a huge heap, Clawd proud at its foot
  function shotA(t) {
    let c;
    const up = ease(seg(t, .62, 1.3));
    if (t < 1.3) c = [ECU0[0] - 12 * up, ECU0[1] - 55 * up, ECU0[2] + .2 * t - 1.2 * up];
    else if (t < 3.0) c = camMix([ECU0[0] - 12, ECU0[1] - 55, ECU0[2] + .26 - 1.2], WIDE, ease(seg(t, 1.3, 3.0)));
    else c = [WIDE[0], WIDE[1], WIDE[2] + .05 * seg(t, 3.0, 3.6)];
    const at = scr(PEAK0, c);
    frame(t, c, t < .36 ? { iris: [at[0], at[1], lerp(30, 1500, easeOut(t / .36))] } : {});
  }
  // B 3.6–8.4: Clawd checks: still a heap. The gull takes the next one.
  const B1 = [CX0 - 175, GY - 205, 1.33];
  function shotB1(t) {
    const up = ease(seg(t, 4.3, 4.8)) * (1 - ease(seg(t, 5.2, 5.9)));
    frame(t, [B1[0] - 20 * seg(t, 3.6, 6), B1[1] - 150 * up, B1[2] + .06 * seg(t, 3.6, 6)]);
  }
  function shotB2(t) { frame(t, [HX - 5, GY - H0 - 35, 2.55 + .15 * seg(t, 6, 7.2)]); }
  const B3 = [CX0 - 150, GY - 215, 1.42];
  function shotB3(t) { frame(t, [B3[0] + 15 * seg(t, 7.2, 8.4), B3[1], B3[2] + .04 * seg(t, 7.2, 8.4)]); }   // continues into C's pull back
  // C 8.4–14.4: time lapse. The camera cranes down with the top of the heap.
  const TL = h => { const q = seg(950 - h, 0, 740); return camMix([HX + 400, GY - 510, .74], [HX + 190, GY - 190, 1.45], q); };
  function shotC(t) {
    const c = t < 9.4 ? camMix([B3[0] + 15, B3[1], B3[2] + .04], TL(heightOf(9.4)), ease(seg(t, 8.4, 9.4))) : TL(heightOf(t));
    frame(t, c);
  }
  // C2 14.4–17.4: a small pile. Torn.
  function shotC2(t) { const lt = t - 14.4; frame(t, [HX + 175, GY - 175, 1.72 + .03 * lt]); }
  // D 17.4–21.0: a handful; the gull flies off with the second-to-last grain
  function shotD(t) { const lt = t - 17.4; frame(t, [HX + 62, GY - 125 - 40 * ease(seg(t, 20.5, 20.95)), 2.02 + .06 * lt]); }
  // E 21.0–26.6: the last grain; all the heap's outlines; the search for the boundary; dizzy
  const E1 = [HX + 52, GY - 60, 3.9], TOP = [HX + 80, GY - 480, .72], E3 = [LIE - 30, GY - 115, 2.3];
  function shotE(t) {
    let c, fx = {};
    if (t < 22.5) c = [E1[0], E1[1], E1[2] + .12 * (t - 21.0)];
    else if (t < 24.95) c = camMix([E1[0], E1[1], E1[2] + .18], [TOP[0], TOP[1] + 40 * ease(seg(t, 24.15, 24.95)), TOP[2] * (1 + .05 * seg(t, 23.9, 24.95))], ease(seg(t, 22.5, 23.9)));
    else if (t < 25.2) { const k = easeIn(seg(t, 24.95, 25.2)); c = [TOP[0], lerp(TOP[1] + 40, TOP[1] + 520, k), TOP[2] * 1.05]; fx.whip = k * .5; }
    else { const k = seg(t, 25.2, 25.45); c = [E3[0] + 12 * Math.sin(t * 2.2), E3[1] - 70 * (1 - easeOut(k)), E3[2], .03 * Math.sin(t * 3.1)]; if (k < 1) fx.whip = .5 + k * .5; }
    frame(t, c, fx);
  }
  // F 26.4–32.0: grain by grain, again. Push in to the new pile; iris shut on its top grain.
  const F1 = [HX + 66, GY - 45, 2.9], F2 = [HX + 32, GY - 58, 4.1];
  function shotF(t) {
    const c = t < 29.6 ? [F1[0] - 4 * (t - 26.6), F1[1], F1[2] + .05 * (t - 26.6)] : camMix([F1[0] - 12, F1[1], F1[2] + .15], [F2[0], F2[1], F2[2] + .15 * seg(t, 30.5, 32)], ease(seg(t, 29.6, 30.45)));
    const top = slot(PLACE[2].s), at = scr(top, c);
    frame(t, c, t > 31.2 ? { iris: [at[0], at[1], lerp(1300, 0, easeIn(seg(t, 31.2, 31.92)))] } : {});
  }

  shots([[0, shotA], [3.6, shotB1], [6.0, shotB2], [7.2, shotB3], [8.4, shotC], [14.4, shotC2], [17.4, shotD], [21.0, shotE], [26.6, shotF]]);
})();
