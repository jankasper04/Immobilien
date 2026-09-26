// achilles.js: "Achilles und die Schildkröte (Zenon)", 32 s, 9:16. The storyboard is STORYBOARD_achilles.md.
// One race on one clock. Clawd's nose and the tortoise's tail are points on a track that runs from the start (0) to
// the point where Clawd catches up (1); the tortoise starts halfway and is half as fast, so Clawd runs 1/2, 1/4, 1/8 …
// The deep zoom never puts the camera deep: every frame is drawn in "level space", where level L magnifies the track
// 2^L times around the catch point (screen x = FX), the characters keep their size, and the world's grass, stones and
// critters come in generations that grow with the zoom. So coordinates stay small at any depth. The shots only pick
// the camera, the level and the transitions; the race itself is a pure function of story time.
(() => {
  // ---------- world ----------
  const GY = 1180;                              // the ground line in level space: the characters stand on it
  const PATH0 = GY - 40, CURB0 = GY + 14, CURB1 = GY + 72;   // far edge of the path; the curb (the bar) along its front
  const FX = 760, S = 460;                      // the catch point sits at FX; one track unit is S px at level 0
  const U = 26, TS = 1.1;                       // Clawd's unit, the tortoise's scale
  const FIN = 1 + 320 / S;                      // the finish line, just past the spot where the tortoise gets caught
  const C_LAND = 1 + 540 / S;                   // where Clawd's nose lands after the hop
  const COL = {
    red: '#D8394E', cream: '#FFF5E2', stone: '#D6CCBC', goldR: '#F0A03C', goldC: '#FFE59A',
    path: '#E8D4A6', pathDk: '#D9BF8C', meadow: '#A9C893', soil: '#B48C62', soilDk: '#9C774F',
    shell: '#6F9150', shellDk: '#4E6B37', shellLt: '#9DBB72', skin: '#CFCB8E', skinDk: '#A3A067',
    petal: '#FFD35A', petalDk: '#E8A93A', stem: '#4F8A3E',
  };
  const HAT = 'sweatband';

  // ---------- the clock ----------
  const GO = 1.09;                              // the start, on beat 2
  // each step: run, react (arrive, look), push (zoom into the new gap); they get faster and faster
  const PH = [[1.35, .9, .45], [.95, .85, .42], [.8, .7, .38], [.68, .55, .33], [.58, .42, .29], [.5, .32, .25], [.43, .24, .22], [.37, .17, .19], [.32, .12, .17], [.28, 0, 0]];
  const STEP = []; { let t = GO; PH.forEach(([r, a, p], k) => { STEP.push({ k, a: t, b: t + r, d: t + r + a, e: t + r + a + p }); t += r + a + p; }); }
  const NST = STEP.length, LAST = STEP[NST - 1];
  const ARR = LAST.b;                           // 14.32: the tenth flower; no more pushes
  const SIT = ARR + .45;                        // Clawd flops down, dizzy
  const PB0 = 16.0, PB1 = 18.6;                 // the pull back out of all the levels
  const SP0 = 18.8, SP1 = 21.0;                 // the spark runs the curb at a steady pace
  const HOP0 = 22.05, HOP1 = 22.7;              // the hop over the tortoise
  const LAUGH = 23.6;
  const RW0 = 26.3, RW1 = 28.5;                 // the rewind back to the start
  const WINK = 29.7, IRIS1 = 31.25;

  const Ck = k => 1 - Math.pow(2, -k);          // Clawd's nose after k steps; flower k stands at Ck(k + 1)
  const runE = k => .45 * k + .55 * ease(k);    // a dash: quick off the mark, a short skid at the end
  // Clawd's nose on the track at story time te
  function cOf(te) {
    if (te < GO) return 0;
    let c = 0;
    for (const s of STEP) { if (te < s.a) return c; if (te < s.b) return lerp(Ck(s.k), Ck(s.k + 1), runE(seg(te, s.a, s.b))); c = Ck(s.k + 1); }
    if (te < HOP0) return c;
    return lerp(c, C_LAND, seg(te, HOP0, HOP1));
  }
  const pOf = c => Math.min(1, .5 + c / 2);     // the tortoise's tail: half as fast, from halfway
  // which step te is in, and how far through its run
  function stepAt(te) { let s = null; for (const q of STEP) if (te >= q.a) s = q; return s; }
  const running = te => { const s = stepAt(te); return s && te < s.b; };
  // the zoom level at video time t
  function levelOf(t) {
    if (t >= RW0) return 0;
    if (t >= PB0) return (NST - 1) * (1 - ease(seg(t, PB0, PB1)));
    for (const s of STEP) { if (t < s.d) return s.k; if (s.e > s.d && t < s.e) return s.k + ease(seg(t, s.d, s.e)); if (s === LAST) return s.k; }
    return NST - 1;
  }
  // story time: the video's clock, except the rewind runs it backwards to the start
  const storyT = t => t < RW0 ? t : t < RW1 ? lerp(RW0, 0, ease(seg(t, RW0, RW1))) : 0;
  // flower k sprouts where the tortoise's tail is when Clawd starts step k
  const sproutT = k => k === 0 ? GO + .02 : STEP[k - 1].b + .1;
  const passT = k => SP0 + (SP1 - SP0) * Ck(k + 1);    // the spark reaches flower k

  // ---------- level space ----------
  let LV = 0, SC = S, VIEW = null, DZ = 0;
  const setLevel = L => { LV = L; SC = S * Math.pow(2, L); DZ = clamp(L / 9); };
  const lx = x => FX - (1 - x) * SC;            // track → level-space x
  const gsz = g => S * Math.pow(2, LV - g);     // px per unit of generation g
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
  }
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  const inView = (x0, x1, y0, y1, m = 60) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  // flat colour for big areas (see theseus.js); flushBrush() first when it must cover brush strokes painted before it
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  // a long ink line, in pieces no longer than ~700 px (p5.brush loses the outline of shapes much bigger than the canvas)
  function inkLong(P, sw, col, br = 'ink') {
    let piece = [P[0]], len = 0;
    for (let i = 1; i < P.length; i++) {
      len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); piece.push(P[i]);
      if (len > 700 || i === P.length - 1) { inkLine(piece, sw, col, br, .3); piece = [P[i]]; len = 0; }
    }
  }
  const sky = (a, b) => mixCol(a, b, .6 * DZ);  // deeper levels drift toward a violet, dreamlike light

  // ---------- background ----------
  function backdrop(t) {
    const { x0, x1, y0 } = VIEW, m = 140, X = x0 - m, X1 = x1 + m, step = 120, xs = Math.floor(X / step) * step;
    const bands = [[y0 - m, sky('#8FC1E4', '#7C68B4')], [GY - 1150, sky('#A5CDE8', '#9985C6')], [GY - 800, sky('#C3DCE6', '#BCA3D4')], [GY - 480, sky('#E2E4D2', '#E3C4D2')]];
    const edge = (i, x) => i >= bands.length ? GY - 200 : i ? bands[i][0] + 16 * Math.sin(x * .004 + i) + 2 * Math.sin(x * .05 + BOILN) : Math.min(bands[0][0], y0 - m);
    bands.forEach(([by, col], i) => {
      const P = []; for (let x = xs; x <= X1 + step; x += step) P.push([x, edge(i, x)]);
      for (let x = Math.floor((X1 + step) / step) * step; x >= xs; x -= step) P.push([x, edge(i + 1, x) + 1]);
      flat(P, col);
    });
    // clouds, drifting (far away: they do not zoom)
    for (let i = 0; i < 3; i++) {
      const cx = X + ((i * 460 + t * 12 + 200) % (X1 - X + 300)) - 150, cy = GY - 1250 + i * 170;
      if (!inView(cx - 130, cx + 130, cy - 50, cy + 30)) continue;
      boilSeed('cloud' + i);
      paint(through([[cx - 120, cy + 22], [cx - 76, cy - 22], [cx, cy - 44], [cx + 76, cy - 24], [cx + 120, cy + 22]], 5).concat([[cx - 120, cy + 22]]), { wash: sky('#FFF8EC', '#F4E6F0'), ink: null });
    }
    // far hills, then the meadow behind the path
    const H2 = [], st = 90, hs = Math.floor(X / st) * st;
    for (let x = hs; x <= X1 + st; x += st) H2.push([x, GY - 150 - 110 * (.5 + .5 * Math.sin(x * .0031 + .4)) * (.6 + .4 * hash(Math.round(x / st)))]);
    flat(through(H2, 4).concat([[X1 + st, PATH0 + 2], [hs, PATH0 + 2]]), sky('#B5CDA6', '#B4A7C9'));
    const M = []; for (let x = hs; x <= X1 + st; x += st) M.push([x, GY - 105 + 10 * Math.sin(x * .006 + 1)]);
    flat(M.concat([[X1 + st, PATH0 + 2], [hs, PATH0 + 2]]), sky(COL.meadow, '#A6B59C'));
  }
  // grass, dandelions and critters behind the path, in generations: generation g is 2^g times smaller, so each zoom
  // level brings the next generation up to full size and blows the earlier ones up into giants
  const NB = 8, NS = 6;
  // distance from the catch point, log-uniform: every generation has things near the gap, so every level has giants
  const rhoOf = (h, h2) => (h2 < .28 ? -.5 : 1) * 1.7 * Math.pow(2, -5.5 * h);
  function behindItems(t) {
    const out = [], gl = Math.floor(LV);
    for (let g = Math.max(0, gl - 5); g <= gl + 3; g++) for (let i = 0; i < NB; i++) {
      const h1 = hash(g * 37.1 + i * 11.3), h2 = hash(g * 53.7 + i * 5.9 + 1), h3 = hash(g * 19.3 + i * 23.1 + 2);
      const kind = i < 5 ? 'blade' : i < 7 ? 'tuft' : 'dand', z = gsz(g), rho = rhoOf(h1, hash(g * 3.3 + i * 29.9));
      const hgt = (kind === 'blade' ? .13 + .09 * h2 : kind === 'tuft' ? .07 + .04 * h2 : .17 + .06 * h2) * z;
      const x = FX - rho * z;
      if (hgt < 16 || hgt > 5200) continue;
      if (x + hgt * .4 < VIEW.x0 - 40 || x - hgt * .4 > VIEW.x1 + 40) continue;
      out.push({ kind, x, hgt, seed: h3, key: g + '_' + i });
    }
    out.sort((a, b) => b.hgt - a.hgt);   // giants at the back
    return out;
  }
  function blade(it, t) {
    const { x, hgt, seed } = it, base = PATH0 + 6, lean = (seed - .5) * .6 + .03 * Math.sin(t * 1.3 + seed * 6), w = hgt * .11;
    const P = [[x, base], [x + lean * .2 * hgt, base - .5 * hgt], [x + lean * hgt, base - hgt]];
    const R = ribbon(P, w, 1), col = sky(['#B2D08A', '#A3C878', '#BFD99A'][Math.floor(seed * 3)], '#A9B89A');
    flat(R, col);
    const n = R.length / 2, sw = clamp(hgt / 300, .6, 2.2);
    boilSeed('bl' + it.key);
    inkLong(R.slice(0, n), sw, PAL.ink); inkLong(R.slice(n), sw, PAL.ink);
    if (hgt > 200) inkLong(through(P, 5).slice(0, -3), sw * .7, mixCol(col, '#FFFFFF', .35), 'inkfine');
  }
  function tuft(it, t) {
    const { x, hgt, seed } = it, base = PATH0 + 4, sw = clamp(hgt / 70, .6, 3);
    boilSeed('tu' + it.key);
    for (const k of [-1, -.3, .4, 1]) {
      const sway = .06 * hgt * Math.sin(t * 1.5 + seed * 5 + k);
      inkLine([[x + k * hgt * .12, base], [x + k * hgt * .3 + sway, base - hgt * (.75 + .25 * hash(seed * 9 + k))]], sw, sky('#5E8F48', '#6B7A76'), 'ink', .4);
    }
  }
  function dandelion(it, t) {
    const { x, hgt, seed } = it, base = PATH0 + 6, sway = .03 * hgt * Math.sin(t * 1.1 + seed * 4), sw = clamp(hgt / 140, .6, 3.4);
    const top = [x + sway + (seed - .5) * .2 * hgt, base - hgt], r = hgt * .19;
    boilSeed('da' + it.key);
    inkLine([[x, base], [x + sway * .4, base - hgt * .5], top], sw * 1.4, sky(COL.stem, '#6E7F74'), 'ink', .5);
    paint(ellPts(top[0], top[1], r, r, 22, r * .04), { wash: sky('#FBF6EA', '#F4EEF6'), ink: PAL.ink, sw: sw * .7 });
    if (r > 10) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + seed; inkLine([[top[0], top[1]], [top[0] + Math.cos(a) * r * .8, top[1] + Math.sin(a) * r * .8]], sw * .35, '#C9BFB0', 'inkfine', 0); }
    paint(ellPts(top[0], top[1], r * .16, r * .16, 10), { wash: '#C9A96B', ink: null });
  }
  // the ant: generation 4, so it is tortoise-sized around level 4; it walks along behind the path
  function ant(t) {
    const z = gsz(4), len = .23 * z; if (len < 14 || len > 900) return;
    const rho = 1.25 - .085 * (t - 6), x = FX - rho * z, y = PATH0 + 2;
    if (x + len < VIEW.x0 || x - len > VIEW.x1) return;
    const sw = clamp(len / 90, .6, 3), ph = t * 9, c = '#5B3A2E';
    boilSeed('ant');
    for (let i = 0; i < 3; i++) {   // legs
      const lx0 = x + (i - 1) * len * .16, sw2 = Math.sin(ph + i * 2) * len * .06;
      inkLine([[lx0, y - len * .22], [lx0 + sw2 - len * .05, y - len * .12], [lx0 + sw2 + len * .02, y]], sw, PAL.ink, 'ink', .3);
    }
    paint(ellPts(x - len * .3, y - len * .24, len * .22, len * .15, 16), { wash: c, ink: PAL.ink, sw });
    paint(ellPts(x, y - len * .24, len * .12, len * .09, 12), { wash: c, ink: PAL.ink, sw });
    paint(ellPts(x + len * .24, y - len * .3, len * .13, len * .11, 14), { wash: c, ink: PAL.ink, sw });
    paint(ellPts(x + len * .28, y - len * .33, len * .03, len * .03, 8), { wash: PAL.cream, ink: null });
    for (const d of [-1, 1]) inkLine([[x + len * .3, y - len * .38], [x + len * .38, y - len * .55 + d * len * .03], [x + len * .5, y - len * .52 + d * len * .05]], sw * .8, PAL.ink, 'ink', .5);
  }
  // the path, the start line and the finish line
  function track(t) {
    const { x0, x1 } = VIEW, X = x0 - 100, X1 = x1 + 100;
    flushBrush();
    flat([[X, PATH0], [X1, PATH0], [X1, CURB0 + 2], [X, CURB0 + 2]], mixCol(COL.path, '#D8C3A8', .4 * DZ));
    flat([[X, PATH0], [X1, PATH0], [X1, PATH0 + 7], [X, PATH0 + 7]], COL.pathDk);
    boilSeed('pathedge'); inkLong([[X, PATH0], [(X + X1) / 2, PATH0 + 1], [X1, PATH0]], .9, mixCol(COL.pathDk, PAL.ink, .4));
    const sx = lx(0);
    if (sx > X && sx < X1) {   // the start: a chalk line across the path
      boilSeed('start');
      paint([[sx - 7, PATH0 + 2], [sx + 7, PATH0 + 2], [sx + 12, CURB0 - 1], [sx - 3, CURB0 - 1]], { wash: '#FBF7EE', ink: null });
    }
    const fx = lx(FIN), sq = 13;
    if (fx > X - 40 && fx < X1) {   // the finish: a chequered band across the path, and the flag at its far end
      boilSeed('finline');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const y0 = PATH0 + 2 + r * sq, sk = (y0 - PATH0) * .1, xx = fx - sq + c * sq + sk;
        paint([[xx, y0], [xx + sq, y0], [xx + sq + 1.3, y0 + sq], [xx + 1.3, y0 + sq]], { wash: (r + c) % 2 ? PAL.ink : '#FBF7EE', ink: null });
      }
    }
  }
  function flag(t, wave = 0) {
    const fx = lx(FIN) + 2, top = PATH0 - 330;
    if (fx < VIEW.x0 - 200 || fx > VIEW.x1 + 40) return;
    boilSeed('pole');
    paint(rectPts(fx - 5, top, 10, PATH0 + 4 - top, .6), { wash: '#9A8A7A', ink: PAL.ink, sw: .9 });
    paint(ellPts(fx, top - 4, 10, 10, 10), { wash: COL.petal, ink: PAL.ink, sw: .8 });
    // the flag: 4 × 3 squares on a waving sheet
    const fw = 118, fh = 78, pt = (u, v) => [fx - 5 - u * fw, top + 8 + v * fh + (6 + 10 * wave) * Math.sin(u * 4.5 - t * (5 + 5 * wave)) * u];
    boilSeed('flag');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const P = [pt(i / 4, j / 3), pt((i + 1) / 4, j / 3), pt((i + 1) / 4, (j + 1) / 3), pt(i / 4, (j + 1) / 3)];
      paint(P, { wash: (i + j) % 2 ? PAL.ink : '#FBF7EE', ink: null });
    }
    const O = []; for (let i = 0; i <= 6; i++) O.push(pt(i / 6, 0)); for (let i = 6; i >= 0; i--) O.push(pt(i / 6, 1));
    paint(O, { ink: PAL.ink, sw: .9 });
  }

  // ---------- the bar: the curb along the front of the path ----------
  function curb(te) {
    const { x0, x1 } = VIEW, X = x0 - 60, X1 = x1 + 60, c = Math.min(1, cOf(te));
    const spark = seg(te, SP0, SP1), sparkOn = te > SP0;
    flushBrush();
    flat([[X, CURB0], [X1, CURB0], [X1, CURB1], [X, CURB1]], COL.stone);
    const edges = [];
    for (let k = 0; k < 40; k++) {
      const a = Ck(k), b = Math.min(Ck(k + 1), c); if (b <= a) break;
      const xa = lx(a), xb = lx(b); if (xb - xa < .6) break;
      edges.push(xa);
      if (xb < X || xa > X1) continue;
      const lit = sparkOn && spark >= Ck(k + 1) - 1e-9;
      const col = k % 2 ? (lit ? COL.goldC : COL.cream) : (lit ? COL.goldR : COL.red);
      flat([[Math.max(xa, X), CURB0], [Math.min(xb, X1), CURB0], [Math.min(xb, X1), CURB1], [Math.max(xa, X), CURB1]], col);
      // the spark is inside this piece: light it up to the spark
      if (sparkOn && !lit && spark > a) {
        const xs = lx(Math.min(spark, b));
        flat([[Math.max(xa, X), CURB0], [Math.min(xs, X1), CURB0], [Math.min(xs, X1), CURB1], [Math.max(xa, X), CURB1]], k % 2 ? COL.goldC : COL.goldR);
      }
    }
    // top and bottom edges, and a tick at each piece's start
    boilSeed('curbedge');
    inkLong([[X, CURB0], [(X + X1) / 2, CURB0 + 1], [X1, CURB0]], 1.1, PAL.ink);
    inkLong([[X, CURB1], [(X + X1) / 2, CURB1 - 1], [X1, CURB1]], 1.1, PAL.ink);
    edges.forEach((xa, i) => { if (xa > X && xa < X1 && (i === 0 || xa - edges[i - 1] > 3)) { boilSeed('tick' + i); inkLine([[xa, CURB0], [xa, CURB1]], i > 5 ? .5 : .9, PAL.ink, 'inkfine', 0); } });
  }
  // the soil under the curb, with stones in generations (they grow with the zoom around the catch point)
  function soil(t) {
    const { x0, x1, y1 } = VIEW, X = x0 - 60, X1 = x1 + 60, Y1 = y1 + 80;
    flat([[X, CURB1], [X1, CURB1], [X1, Y1], [X, Y1]], mixCol(COL.soil, '#8E7390', .35 * DZ));
    const L2 = []; for (let x = Math.floor(X / 100) * 100; x <= X1 + 100; x += 100) L2.push([x, GY + 520 + 20 * Math.sin(x * .005)]);
    flat(L2.concat([[X1 + 100, Y1], [X, Y1]]), mixCol(COL.soilDk, '#6E5874', .35 * DZ));
    const gl = Math.floor(LV);
    for (let g = Math.max(0, gl - 4); g <= gl + 3; g++) for (let i = 0; i < NS; i++) {
      const z = gsz(g), rr = .022 + .05 * hash(g * 7.7 + i * 3.3), r = rr * z, rho = rhoOf(hash(g * 41.3 + i * 9.1), hash(g * 5.1 + i * 2.7)), d = rr + .03 + 1.2 * Math.pow(2, -4.5 * hash(g * 13.9 + i * 17.7));
      const x = FX - rho * z, y = CURB1 + d * z;
      if (r < 7 || r > 900 || y - r < CURB1 + 4) continue;
      if (!inView(x - r, x + r, y - r, y + r)) continue;
      const cc = ['#C8B597', '#B3A184', '#D6C7A8', '#A99479'][i % 4];
      boilSeed('st' + g + '_' + i);
      paint(ellPts(x, y, r * 1.25, r * .8, 18, r * .05, hash(i + g) - .5), { wash: mixCol(cc, '#B7A2C0', .3 * DZ), ink: PAL.ink, sw: clamp(r / 30, .5, 3) });
      if (r > 14) paint(ellPts(x - r * .35, y - r * .3, r * .35, r * .18, 10, 0, -.3), { wash: mixCol(mixCol(cc, '#B7A2C0', .3 * DZ), '#FFFFFF', .35), ink: null });
    }
  }

  // ---------- the markers: a yellow flower where the tortoise just was ----------
  function flowerMark(x, s, age, bounce, key) {
    const k = backOut(clamp(age / .32)), stemK = ease(clamp(age / .18));
    if (k < .02 || s < .1) return;
    const base = CURB0 + 2, h = 66 * s * stemK, sw = clamp(s, .4, 1);
    const top = [x + 3 * bounce * s, base - h - 6 * bounce * s];
    boilSeed('fl' + key);
    inkLine([[x, base], [x + 1, base - h * .5], top], 1.8 * sw, COL.stem, 'ink', .4);
    if (s > .3) paint(ellPts(x - 10 * s, base - h * .45, 11 * s * k, 5 * s * k, 10, 0, -.5), { wash: '#6FA257', ink: PAL.ink, sw: .6 * sw });
    const R = 22 * s * k * (1 + .25 * bounce), P = [];
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU + .3, rr = R * (.55 + .45 * Math.abs(Math.cos(a * 2.5))); P.push([top[0] + Math.cos(a) * rr, top[1] + Math.sin(a) * rr]); }
    paint(P, { wash: COL.petal, ink: PAL.ink, sw: .8 * sw });
    paint(ellPts(top[0], top[1], R * .34, R * .34, 10), { wash: COL.petalDk, ink: PAL.ink, sw: .5 * sw });
  }
  function flowers(te) {
    for (let k = 0; k <= NST; k++) {
      const age = te - sproutT(k); if (age <= 0) continue;
      const x = lx(Ck(k + 1)); if (x < VIEW.x0 - 60 || x > VIEW.x1 + 60) continue;
      const s = clamp(Math.pow(2, LV - k + 1), 0, 1);   // markers from deeper levels are small when seen from far away
      const bounce = spring(te, passT(k), 7, 24) * (te > SP0 ? 1 : 0);
      flowerMark(x, s, age, bounce, k);
      const pa = te - passT(k); if (pa > 0 && pa < .45) sparkles(x, CURB0 - 30 * s, 40 * s + 20, pa / .45, 5, 'fs' + k);
    }
  }
  function sparkles(x, y, r, a, n, key) {
    boilSeed(key);
    for (let i = 0; i < n; i++) { const ang = i * TAU / n + .4, d = r * easeOut(a); paint(starPts(x + Math.cos(ang) * d, y + Math.sin(ang) * d * .8, 14 * (1 - a) + 3, .3, 4), { wash: '#FFF3C4', ink: null }); }
  }
  // the spark that runs the curb at a steady pace
  function spark(te) {
    if (te < SP0 || te > SP1 + .5) return;
    const k = seg(te, SP0, SP1), x = lx(k), y = (CURB0 + CURB1) / 2;
    if (te < SP1) {
      glow(x, y, 90, '#FFD27A', .9);
      boilSeed('spark');
      paint(starPts(x, y, 26 + 6 * Math.sin(te * 40), .32, 4, te * 4), { wash: '#FFF6D6', ink: PAL.ink, sw: .6 });
    }
    const a = seg(te, SP1, SP1 + .5);
    if (a > 0 && a < 1) { glow(lx(1), y - 60, 260 * easeOut(a), '#FFE3A0', 1 - a); sparkles(lx(1), y - 50, 150, a, 8, 'arrive'); }
  }

  // ---------- the tortoise ----------
  // (x, y) is the tail end on the ground; it faces right. o: walk (phase), look (-1 back … 1 ahead), eye (smug, wide,
  // happy, laugh, worried), mouth (smile, open, laugh), headUp (-1 pulled into the shell … 1 raised), bob, sq
  function tortoise(x, y, s, o = {}) {
    const w = (o.walk || 0) * TAU, hu = o.headUp || 0, tuck = clamp(-hu), bob = o.bob || 0, sq = o.sq || 0;
    const rs = part => boilSeed('tort ' + part);
    push(); translate(x, y); scale(s * (1 + sq * .5), s * (1 - sq));
    const leg = (x0, far, ph, key) => {
      const lift = Math.max(0, Math.sin(ph)) * 9, dx = Math.cos(ph) * 7;
      rs('leg' + key); paint(rrPts(x0 - 13 + dx, -34 - lift, 26, 34, 9), { wash: far ? COL.skinDk : COL.skin, ink: PAL.ink, sw: .8 });
    };
    rs('shadow'); paint(ellPts(98, 2, 110, 12, 18), { fill: PAL.ink, fillOp: 80, bleed: .2, tex: .3, border: .1, ink: null });
    leg(44, 1, w + Math.PI, 'a'); leg(132, 1, w, 'b');
    rs('tail'); paint([[22, -36], [2, -27 + 3 * Math.sin(w)], [22, -22]], { wash: COL.skin, ink: PAL.ink, sw: .7 });
    // neck and head (drawn before the shell, so a tucked head hides behind it)
    const hx = 206 - 58 * tuck + 5 * Math.max(0, hu), hy = -60 - 22 * Math.max(0, hu) + 20 * tuck - 3 * bob;
    rs('neck'); if (tuck < .9) paint(ribbon([[146, -42], [172, -48 - 8 * Math.max(0, hu)], [hx - 18, hy + 8]], 36, 28), { wash: COL.skin, ink: PAL.ink, sw: .9 });
    rs('head'); paint(ellPts(hx, hy, 31, 24, 20, 0, -.12 * hu), { wash: COL.skin, ink: PAL.ink, sw: 1 });
    tortFace(hx, hy, o);
    // the shell: a dome with plates
    rs('shell');
    const D = through([[16, -30], [22, -70], [52, -104], [98, -116], [142, -102], [168, -70], [176, -30]], 6);
    paint(D.concat([[98, -24]]), { wash: COL.shell, ink: PAL.ink, sw: 1.2, curv: .2 });
    paint(ellPts(80, -92, 34, 12, 14, 0, -.25), { wash: COL.shellLt, ink: null });
    const plate = [[62, -40], [56, -78], [98, -98], [138, -78], [132, -40], [98, -32]];
    paint(plate, { wash: mixCol(COL.shell, COL.shellLt, .3), ink: COL.shellDk, sw: .9, curv: .3 });
    for (const [a, b] of [[[56, -78], [30, -64]], [[98, -98], [98, -113]], [[138, -78], [164, -66]], [[62, -40], [30, -38]], [[132, -40], [166, -38]]]) inkLine([a, b], .8, COL.shellDk, 'inkfine', 0);
    rs('rim'); paint(ribbon([[12, -32], [60, -24], [98, -22], [138, -24], [180, -32]], 13, 13), { wash: COL.shellDk, ink: PAL.ink, sw: .8 });
    leg(68, 0, w, 'c'); leg(156, 0, w + Math.PI, 'd');
    pop();
  }
  function tortFace(hx, hy, o) {
    const ex = hx + 9, ey = hy - 8, look = o.look ?? 1, e = o.eye || 'smug', m = o.mouth || 'smile';
    boilSeed('tort face');
    if (e === 'happy' || e === 'laugh') inkLine([[ex - 8, ey + 3], [ex, ey - 5], [ex + 8, ey + 3]], 1.2, PAL.ink, 'ink', .4);
    else {
      const big = e === 'wide' ? 1.3 : 1, r = 8.5 * big;
      paint(ellPts(ex, ey, r, r * 1.08, 14), { wash: '#FBF7EE', ink: PAL.ink, sw: .8 });
      paint(ellPts(ex + look * 3.5, ey + 1, 3.6 * (e === 'wide' ? .8 : 1), 4.2, 10), { wash: PAL.ink, ink: null });
      if (e === 'smug') { paint([[ex - 10, ey - 10], [ex + 10, ey - 10], [ex + 10, ey - 1], [ex - 10, ey - 2]], { wash: COL.skin, ink: null }); inkLine([[ex - 9, ey - 1.5], [ex + 9, ey - 1]], 1, PAL.ink, 'ink', 0); }
      if (e === 'worried') inkLine([[ex - 8, ey - 12], [ex + 7, ey - 16]], 1, PAL.ink, 'ink', .3);
    }
    if (m === 'laugh' || m === 'open') {
      const op = m === 'laugh' ? 1 : .6;
      paint([[hx + 6, hy + 5], [hx + 29, hy + 1], [hx + 24, hy + 5 + 12 * op], [hx + 12, hy + 5 + 10 * op]], { wash: '#5A2A34', ink: PAL.ink, sw: .7, curv: .4 });
    } else inkLine([[hx + 8, hy + 9], [hx + 18, hy + 11], [hx + 28, hy + 5]], .9, PAL.ink, 'ink', .5);
    paint(ellPts(hx + 27, hy - 3, 1.6, 1.6, 6), { wash: PAL.ink, ink: null });
    if (o.blush) paint(ellPts(hx - 2, hy + 8, 7, 4, 10), { fill: PAL.rose, fillOp: 150, bleed: .2, ink: null });
  }

  // ---------- acting ----------
  const MOOD = [
    [0, 'determined'],
    [STEP[0].b + .08, 'surprised', { lookX: 1 }], [STEP[1].a - .12, 'determined'],
    [STEP[1].b + .08, 'confused', { lookX: 1 }], [STEP[2].a - .12, 'determined'],
    [STEP[2].b + .08, 'angry', { lookX: 1 }],
    [STEP[3].b + .06, 'furious'],
    [STEP[4].b + .05, 'nervous'],
    [STEP[5].b + .02, 'dizzy'],
    [PB1 - .4, 'thinking'],
    [SP1 + .04, 'surprised', { lookX: .4, lookY: .8 }],
    [SP1 + .5, 'idea'],
    [HOP0 - .3, 'excited'],
    [HOP1 + .12, 'proud'],
    [LAUGH, 'laugh'],
  ];
  const END_MOOD = [[0, 'determined'], [WINK, 'playful'], [WINK + .8, 'determined']];
  // heading (in turns: 0 front, .25 facing right) over the react of step s: side → front, hold, → side for the next run
  function reactHeading(te, s) {
    if (te < s.b + .15) return lerp(.25, 0, ease(seg(te, s.b, s.b + .15)));
    if (te < s.e - .13) return 0;
    return lerp(0, .25, ease(seg(te, s.e - .13, s.e)));
  }
  const headView = (h, t0, t1, te) => ({ ...spinView(h), smear: te > t0 && te < t1 ? .5 * Math.sin(Math.PI * seg(te, t0, t1)) : 0, smearDir: 0 });
  // Clawd at video time t (story time te): { x, o }, x = the ground point between the feet
  function clawdAt(t, te) {
    const c = cOf(te), nose = lx(c), x = nose - 3.1 * U;
    // the rewind: everything runs backwards, Clawd skids back on his heels
    if (t >= RW0 && t < RW1) {
      const hop = te > HOP0 - .15 && te < HOP1 + .3 ? jump(te, HOP0, HOP1, 10) : { dy: 0, sq: 0 };
      return { x, o: { ...feel('surprised', t), view: 'side', walk: c * 9, dy: hop.dy, sq: hop.sq, smear: .5, smearDir: -1, aL: 1.3, aR: 1.1, rot: -.1, hat: HAT } };
    }
    // at the start line: crouched and revving (the opening, and the ending again)
    if (te < GO) {
      const end = t >= RW1, m = end ? emotions(t, END_MOOD) : emotions(t, MOOD), rev = pulse(t, 5), deep = end ? 0 : ease(seg(t, GO - .28, GO - .04));
      const h = end ? lerp(.25, .125, ease(seg(t, RW1, RW1 + .2))) : .125;
      return { x, o: { ...m, ...spinView(h), sq: .15 + .07 * rev + .15 * deep + (m.sq || 0) * .3, dy: 0, dx: (m.dx || 0) * .3, rot: -.04 - .06 * deep + (m.rot || 0) * .3,
        aL: -.9 + .2 * rev, aR: -.6, lookX: m.lookX ?? .9, hat: HAT } };
    }
    const m = emotions(t, MOOD), s = stepAt(te);
    // running a step
    if (s && te < s.b) {
      const pr = seg(te, s.a, s.b), walk = (s.k + pr) * 4.5, dash = s.k === 0 ? 1 - seg(te, GO, GO + .45) : 0, sp = clamp((s.k - 3) / 5);
      const h = s.k === 0 ? lerp(.125, .25, seg(te, GO, GO + .08)) : .25;
      return { x, o: { ...m, ...spinView(h), walk, rot: .15 + (m.rot || 0) * .3, dx: (m.dx || 0) * .2, dy: -Math.abs(Math.sin(walk * TAU)) * .5 + (m.dy || 0) * .2,
        sq: -.1 * dash + (m.sq || 0) * .3, aL: .2 + .9 * Math.sin(walk * TAU), aR: .2 - .9 * Math.sin(walk * TAU), smear: Math.max(.9 * dash, .4 * sp), smearDir: 1, lookX: 1, hat: HAT } };
    }
    // arrived at a flower: skid, look at the tortoise (turn to the front on the early steps), then the zoom pushes in
    if (s && te < ARR) {
      const skid = spring(te, s.b, 7, 20), early = s.k <= 4;
      const h = early ? reactHeading(te, s) : .25;
      return { x, o: { ...m, ...headView(h, s.b, s.b + .15, te), rot: -.12 * skid + (m.rot || 0), sq: (m.sq || 0) + .22 * Math.max(0, skid), lookX: m.lookX ?? 1, hat: HAT } };
    }
    // the tenth flower: wobble, flop down dizzy; the spark; stand up with the idea
    if (te < HOP0 - .35) {
      const h = lerp(.25, 0, ease(seg(te, ARR, ARR + .15))), sit = easeOut(seg(te, SIT, SIT + .16)) * (1 - ease(seg(te, SP1 + .05, SP1 + .3)));
      const bump = spring(te, SIT + .16, 8, 22) * (te < SP1 ? 1 : 0), look = te > SP0 - .3 && te < SP1 ? { lookX: lerp(-1, .6, seg(te, SP0, SP1)), lookY: .7 } : {};
      const back = ease(seg(te, ARR, ARR + .15)) * (1 - ease(seg(te, HOP0 - .35, HOP0 - .2))) * (1.9 + 1.2 * sit) * U;
      return { x: x - back, o: { ...m, ...headView(h, ARR, ARR + .15, te), ...look, sq: (m.sq || 0) * (1 - sit) + .3 * sit + .1 * bump, rot: (m.rot || 0) * (1 - .6 * sit) + .08 * sit, dx: (m.dx || 0) * (1 - sit),
        dy: (m.dy || 0) * (1 - sit), aL: sit > .5 ? -1.1 : m.aL, aR: sit > .5 ? -.9 : m.aR, hat: HAT } };
    }
    // the hop over the tortoise
    if (te < HOP1 + .1) {
      const h = lerp(0, .25, ease(seg(te, HOP0 - .35, HOP0 - .2))), j = jump(te, HOP0, HOP1, 10), air = seg(te, HOP0, HOP1);
      const back = (1 - ease(seg(te, HOP0 - .35, HOP0 - .2))) * 1.9 * U;
      return { x: x - back, o: { ...m, ...headView(h, HOP0 - .35, HOP0 - .2, te), dy: j.dy, sq: j.sq, rot: .3 * Math.sin(Math.PI * air), aL: 1.3, aR: 1.1, dx: 0, lookX: 1, hat: HAT } };
    }
    // landed: proud; then turn back to the tortoise and laugh
    const h = te < LAUGH - .35 ? lerp(.25, 0, ease(seg(te, HOP1 + .12, HOP1 + .28))) : lerp(0, -.125, ease(seg(te, LAUGH - .35, LAUGH - .15)));
    const land = jump(te, HOP0, HOP1, 10);
    return { x, o: { ...m, ...headView(h, te < LAUGH - .35 ? HOP1 + .12 : LAUGH - .35, te < LAUGH - .35 ? HOP1 + .28 : LAUGH - .15, te), sq: (m.sq || 0) + land.sq, lookX: te > LAUGH - .35 ? -.6 : m.lookX, hat: HAT } };
  }
  // the tortoise at video time t: { x (tail), o }
  function tortAt(t, te) {
    const c = cOf(te), x = lx(pOf(c)), s = stepAt(te), moving = s && te < s.b && te >= s.a;
    const walk = te < GO ? 0 : (s ? s.k + seg(te, s.a, s.b) : 0) * 2.3;
    const beat = pulse(t, 4);
    let o = { walk, eye: 'smug', look: -1, headUp: .3 + .1 * beat, bob: 0, mouth: 'smile' };
    if (t >= RW0 && t < RW1) return { x, o: { walk, eye: 'wide', look: -1, headUp: .2, mouth: 'open' } };
    if (t >= RW1 || te < GO) return { x, o };
    if (moving) o = { walk, eye: 'smug', look: 1, headUp: .05, bob: Math.abs(Math.sin(walk * TAU)), mouth: 'smile' };
    else if (s && te < ARR + .3) o = { walk, eye: 'smug', look: te > s.b + .12 ? -1 : 1, headUp: te > s.b + .12 ? .35 : .05, mouth: 'smile' };
    else if (te < SP1) o = { walk, eye: 'worried', look: -1, headUp: .25, mouth: 'smile' };
    else if (te < HOP0 - .25) o = { walk, eye: 'wide', look: -1, headUp: .3, mouth: 'open' };
    else if (te < HOP1 + .15) { const k = seg(te, HOP0 - .25, HOP0 - .05) * (1 - seg(te, HOP1 - .05, HOP1 + .15)); o = { walk, eye: 'wide', look: -1, headUp: -k, mouth: 'open' }; }
    else if (te < LAUGH) o = { walk, eye: 'wide', look: 1, headUp: .45, mouth: 'open' };
    else { const l = Math.abs(Math.sin((te - LAUGH) * TAU * 2.2)); o = { walk, eye: 'laugh', look: 1, headUp: .7 + .2 * l, mouth: 'laugh', bob: l, sq: .06 * l, blush: 1 }; }
    return { x, o };
  }

  // ---------- effects ----------
  // dust puffs: opaque paint that swells and then shrinks away (fading washes cost a full pigment mix)
  function dust(x, y, age, dir, key, big = 1) {
    if (age < 0 || age > .7) return;
    boilSeed('dust' + key);
    for (let i = 0; i < 6; i++) {
      const a = age / .7, r = (16 + 22 * hash(i + 3)) * big * (.6 + 1.2 * easeOut(a)) * (1 - a * a);
      if (r < 2) continue;
      paint(ellPts(x - dir * (20 + 90 * hash(i) * easeOut(a)) * big, y - 14 - 40 * hash(i + 7) * easeOut(a) * big, r, r * .7, 12, 1.5), { wash: mixCol('#FBF1DA', COL.path, a * .6), ink: null });
    }
  }
  function confetti(te) {
    const a = te - (HOP1 + .05); if (a < 0 || a > 2.2) return;
    const cx = lx(FIN), cols = [COL.red, COL.petal, '#6FB7D8', PAL.cream, '#8CC56E'];
    for (let i = 0; i < 16; i++) {
      const ang = -Math.PI / 2 + (hash(i) - .5) * 2.2, v = 380 + 300 * hash(i + 4), x = cx + Math.cos(ang) * v * a, y = PATH0 - 300 + Math.sin(ang) * v * a + 420 * a * a;
      boilSeed('conf' + i);
      push(); translate(x, y); rotate(a * 8 * (hash(i + 9) - .5) + i);
      paint(rectPts(-8, -4, 16, 8), { wash: cols[i % 5], ink: null }); pop();
    }
  }
  // screen space: zoom lines rushing out from the gap (push in) or back in (pull back)
  function zoomLines(cx, cy, k, key) {
    if (k < .03) return;
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + hash(i + 3) * .2, r0 = 420 + 300 * hash(i + 11) + 200 * (1 - k), L = (160 + 260 * hash(i)) * k;
      boilSeed(key + i);
      inkLine([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * (r0 + L), cy + Math.sin(a) * (r0 + L)]], (i % 4 ? 1.1 : .7) * k, i % 4 ? '#FFFBF0' : mixCol(PAL.ink, '#FFFFFF', .3), 'inkfine', 0);
    }
  }
  function rewindFX(k) {
    for (let i = 0; i < 16; i++) {
      const y = (i + .5) / 16 * H + jit(20), L = 400 + 500 * hash(i + 3), x = W / 2 + (hash(i) - .5) * W * .6;
      boilSeed('rew' + i);
      inkLine([[x - L / 2, y], [x + L / 2, y + jit(8)]], 3.2 * k, i % 3 ? '#FFFFFF' : '#5F7FC0', 'dry', .2);
    }
  }
  function iris2([x, y, r]) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], PAL.ink, r < 3 ? null : ellPts(x, y, r, r, 48));
  }

  // ---------- cameras ----------
  const CAM_OPEN = [612, GY - 250, .9];
  const CAM_STEP = [522, GY - 230, 1.2];
  const CAM_WIDE = [680, GY - 250, .95];
  const CAM_FIN = [FX + 210, GY - 230, 1.0];
  const CAM_LAUGH = [FX + 295, GY - 185, 1.55];
  // the zoom section: level space keeps the gap the same; the camera only drifts, leans in on reactions and sways
  function stepCam(t) {
    const te = t, s = stepAt(te) || STEP[0];
    const run = seg(te, s.a, s.b), push = s.e > s.d ? ease(seg(te, s.d, s.e)) : 0;
    let c = [CAM_STEP[0] + 26 * run - 26 * push, CAM_STEP[1], 1 + .03 * seg(te, s.a, s.d) * (1 - push)];
    if (s.k <= 3 && te > s.b) {   // lean in on Clawd's reaction, back out with the push
      const cx = lx(cOf(te)) - 3.1 * U;
      c = mixCam(c, [cx + 110, GY - 170, 1.2], ease(seg(te, s.b + .05, s.b + .45)) * (1 - push));
    }
    const sway = clamp((levelOf(t) - 4) / 4);
    return [c[0], c[1], c[2], .03 * sway * Math.sin(t * 4.2)];
  }
  function camAt(t) {
    if (t >= RW1) return [CAM_OPEN[0], CAM_OPEN[1], CAM_OPEN[2] * (1 + .035 * seg(t, RW1 + .3, 32))];
    if (t >= RW0) { const k = ease(seg(t, RW0, RW1)); return [...mixCam(CAM_LAUGH, CAM_OPEN, k).slice(0, 3), .04 * Math.sin(Math.PI * k)]; }
    if (t < GO) return [CAM_OPEN[0], CAM_OPEN[1], CAM_OPEN[2] * (1 + .03 * t / GO)];
    if (t < STEP[0].b + .4) return mixCam([CAM_OPEN[0], CAM_OPEN[1], CAM_OPEN[2] * 1.03, 0], stepCam(t), ease(seg(t, GO + .1, STEP[0].b + .35)));
    if (t < ARR) return stepCam(t);
    const collapse = [lx(cOf(ARR)) - 3.1 * U + 170, GY - 190, 1.08, 0];
    if (t < PB0) { const k = ease(seg(t, ARR, ARR + .8)); const c = mixCam(stepCam(ARR - .001), collapse, k); return [c[0], c[1], c[2], .04 * Math.sin(t * 3.4) * (1 - seg(t, PB0 - .4, PB0))]; }
    if (t < PB1) { const k = ease(seg(t, PB0, PB1)); return mixCam(collapse, CAM_WIDE, k); }
    if (t < SP1 + .15) return [CAM_WIDE[0] + 30 * seg(t, PB1, SP1), CAM_WIDE[1], CAM_WIDE[2] * (1 + .03 * seg(t, PB1, SP1)), 0];
    const wideEnd = [CAM_WIDE[0] + 30, CAM_WIDE[1], CAM_WIDE[2] * 1.03, 0];
    if (t < HOP0) return mixCam(wideEnd, CAM_FIN, ease(seg(t, SP1 + .15, HOP0 - .15)));
    if (t < HOP1 + .5) return [CAM_FIN[0] + 60 * ease(seg(t, HOP0, HOP1 + .4)), CAM_FIN[1], CAM_FIN[2], 0];
    const finEnd = [CAM_FIN[0] + 60, CAM_FIN[1], CAM_FIN[2], 0];
    return mixCam(finEnd, [CAM_LAUGH[0], CAM_LAUGH[1], CAM_LAUGH[2] * (1 + .04 * seg(t, LAUGH, RW0)), 0], ease(seg(t, HOP1 + .5, LAUGH + .5)));
  }

  // ---------- the frame ----------
  function frame(t) {
    const te = storyT(t);
    setLevel(levelOf(t));
    const c = camAt(t);
    cam(c);
    backdrop(t);
    boilSeed('behind');
    for (const it of behindItems(t)) it.kind === 'blade' ? blade(it, t) : it.kind === 'tuft' ? tuft(it, t) : dandelion(it, t);
    ant(t);
    track(t);
    flag(t, te > HOP1 && te < RW0 ? 1 - seg(te, HOP1 + 1.5, HOP1 + 3) : 0);
    // the tortoise, then Clawd (in front of it when he hops over)
    const tt = tortAt(t, te);
    tortoise(tt.x, GY, TS, tt.o);
    const cl = clawdAt(t, te);
    clawd(cl.x, GY, U, { ...cl.o, boilKey: 'A' });
    // dust: the dash, each skid, the hop
    if (te < STEP[0].b) dust(lx(0) - 3.1 * U, GY, te - GO, 1, 'go', 1.3);
    for (const s of STEP) if (te > s.b && te < s.b + .7) dust(lx(Ck(s.k + 1)) - 3.1 * U, GY, te - s.b, -1, 'skid' + s.k, s.k < 4 ? 1 : .7);
    dust(lx(cOf(te)) - 3.1 * U, GY, te - HOP1, -1, 'land', 1.2);
    curb(te);
    soil(t);
    flowers(te);
    spark(te);
    confetti(te);
    // zoom lines on each push, and on the pull back
    const zc = toScreen(FX, GY - 80);
    camEnd();
    for (const s of STEP) if (s.e > s.d && t > s.d && t < s.e) zoomLines(zc[0], zc[1], Math.sin(Math.PI * seg(t, s.d, s.e)), 'zl');
    if (t > PB0 && t < PB1) zoomLines(zc[0], zc[1], .8 * Math.sin(Math.PI * seg(t, PB0, PB1)), 'pb');
    if (t > RW0 && t < RW1) rewindFX(Math.sin(Math.PI * seg(t, RW0, RW1)));
    // iris in on Clawd at the start, iris out on Clawd at the end: the loop's seam
    const head = () => { cam(c); const p = toScreen(cl.x + .5 * U, GY - 5 * U); camEnd(); return p; };
    if (t < .45) iris2([...head(), lerp(0, 1500, easeIn(t / .45))]);
    if (t > IRIS1) iris2([...head(), lerp(1500, 0, ease(seg(t, IRIS1, DUR - .04)))]);
  }

  shots([[0, frame]]);
})();
