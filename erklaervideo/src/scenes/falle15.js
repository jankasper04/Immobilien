// falle15.js: "Die 15 Prozent Falle nach dem Kauf", 58 s, 9:16. The storyboard is STORYBOARD_falle15.md.
// Two timelines of the same story, told on one clock: the wrong one (renovate everything at once) and the right one
// (wait three years). The world is a pure function of (timeline, story time s); the video maps its time onto them,
// including the rewinds, so rewinding is just story time running backwards.
(() => {
  // ---------- world ----------
  const GY = 1500;                         // the ground line
  const HX = 520, HW = 560, WALL = 520, ROOF = 280;   // house centre, width, wall height, roof height
  const HOUSE_H = WALL + ROOF;             // 800: the building's value, drawn as its height
  const COIN_H = 14, LINE_COINS = 8.5;     // one coin in the pile; the line sits at 15 % of the house: 120 px = 8.5 coins
  const LINE_Y = GY - .15 * HOUSE_H;
  const PX = 930, CX = 700, U = 26;        // the coin pile, Clawd
  const TREE_X = 60, DISH_X = 560;
  const GOLD = '#F2C14E', GOLD_DK = '#B8862B', RED = '#D8394E';
  const COL = { wallOld: '#A8A298', wallNew: '#F2C96B', roofOld: '#7D5C4A', roofNew: '#C8543E', glassOld: '#3E3A44', glassNew: '#9FD0EA', frame: '#F3EBDC' };

  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
  }
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  // flat colour for the big backgrounds and irises (see theseus.js: huge washes are slow on software WebGL)
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  // piecewise-linear keys (story time → value)
  const lin = (s, K) => kf(s, K, x => x);

  // ---------- the two timelines ----------
  // renovations: item, story time Clawd pays, coins. Same four jobs in both; only the timing differs.
  const RENO = {
    bad:  [['roof', 6.7, 5], ['windows', 9.7, 3], ['heating', 12.7, 4], ['paint', 17.0, 5]],
    good: [['roof', 6.8, 5], ['windows', 9.0, 3], ['heating', 15.8, 4], ['paint', 17.5, 5]],
  };
  // the good timeline starts where the bad one had just bought the house (s 6.5), so both share their first 6.5 s
  const GOOD0 = 6.5;
  // years since the purchase
  const YEARS = {
    bad: [[0, .02], [6.5, .08], [21.5, .8], [27.8, 1.05], [34, 8.0], [37.2, 8.08]],
    good: [[0, .02], [6.5, .08], [11.3, .35], [15.0, 3.0], [25, 3.35]],
  };
  const yearOf = (tl, s) => lin(s, YEARS[tl]);
  const LINE_FADE = 15.0;                  // good timeline: three full years are over, the line fades
  const SNAIL1 = [24, 27.5];               // bad: the first refund arrives by snail
  const LAPSE = [27.8, 34];                // bad: the years go by
  const LAST_SNAIL = [33.5, 37.2];         // bad: the snail of the opening shot
  const SACK = [19.0, 19.6];               // good: the refund falls from the sky
  const END_SNAIL = [21.0, 25.5];          // good: the snail passes by, harmless

  // the video's clock → (timeline, story time)
  function story(t) {
    if (t < 3.1) return { tl: 'bad', s: 34 + t };
    if (t < 4.0) { const k = seg(t, 3.1, 4.0); return { tl: 'bad', s: lerp(37.1, 0, easeIn(k)), rew: Math.sin(Math.PI * k) }; }
    if (t < 38.0) return { tl: 'bad', s: t - 4 };
    if (t < 39.5) { const k = seg(t, 38.0, 39.5); return { tl: 'bad', s: lerp(34, GOOD0, ease(k)), rew: Math.sin(Math.PI * k) }; }
    return { tl: 'good', s: GOOD0 + (t - 39.5) };
  }

  // coins on the pile at story time s, and how fresh the last landing is
  function pileOf(tl, s) {
    let n = 0, land = -9;
    for (const [, s0, c] of RENO[tl]) { const tl0 = s0 + .65; if (s >= tl0) { n += c; land = tl0; } }
    return { n, land };
  }
  // how far each job is done (0..1)
  function fixOf(tl, s, item) { const r = RENO[tl].find(x => x[0] === item); return r ? ease(seg(s, r[1] + 1.0, r[1] + 1.6)) : 0; }
  // the line: painted (0..1), alarm (0..1, pulsing), gone (0..1)
  function lineOf(tl, s) {
    const drawn = seg(s, 1.6, 3.2), over = pileOf(tl, s).n > LINE_COINS && (tl === 'bad' || s < LINE_FADE);
    return { drawn, alarm: over ? .5 + .5 * Math.sin(s * 12) : 0, gone: tl === 'good' ? ease(seg(s, LINE_FADE, LINE_FADE + .7)) : 0 };
  }
  // snails: [x, coin carried?] for everything crawling at story time s
  function snailsOf(tl, s) {
    const out = [];
    if (tl === 'bad') {
      if (s > SNAIL1[0] && s < SNAIL1[1] + 2) {
        const k = seg(s, SNAIL1[0], SNAIL1[1]), x = s < SNAIL1[1] ? lerp(1250, DISH_X + 110, easeOut(k)) : lerp(DISH_X + 110, 200, seg(s, SNAIL1[1] + .4, SNAIL1[1] + 2));
        out.push({ x, coin: s < SNAIL1[1], key: 's1' });
      }
      for (let yk = 2; yk <= 7; yk++) {   // the time lapse: one snail a year, fast
        const s0 = lin(yk + .2, [[1.05, LAPSE[0]], [8.0, LAPSE[1]]]), a = s - s0;
        if (a > 0 && a < .75) out.push({ x: lerp(1250, 150, a / .75), coin: a < .42, key: 's' + yk });
      }
      if (s > LAST_SNAIL[0]) out.push({ x: lerp(1300, 1010, easeOut(seg(s, ...LAST_SNAIL))), coin: true, key: 'last' });
    } else if (s > END_SNAIL[0]) out.push({ x: lerp(1300, 820, seg(s, ...END_SNAIL)), coin: true, key: 'end' });
    return out;
  }
  // coins in Clawd's refund dish (bad timeline: one per snail)
  function dishOf(tl, s) {
    if (tl !== 'bad') return 0;
    let n = s > SNAIL1[1] ? 1 : 0;
    for (let yk = 2; yk <= 7; yk++) if (s > lin(yk + .2, [[1.05, LAPSE[0]], [8.0, LAPSE[1]]]) + .42) n++;
    return n;
  }

  // ---------- set pieces ----------
  function skyGround(t) {
    const { x0, x1, y0, y1 } = VIEW, m = 120, X = x0 - m, Wd = x1 - x0 + 2 * m;
    const bands = [[y0 - m, '#8FC1E4'], [GY - 1300, '#A9CFE8'], [GY - 900, '#C6DDE6'], [GY - 520, '#E3E2D3'], [GY - 220, '#F2DDB8']];
    const step = 120, xs = Math.floor(X / step) * step, xe = X + Wd + step;
    const edge = (i, x) => i >= bands.length ? GY + 4 : i ? bands[i][0] + 16 * Math.sin(x * .004 + i) + 2 * Math.sin(x * .05 + BOILN) : Math.min(bands[0][0], y0 - m);
    bands.forEach(([by, col], i) => {
      if (by > y1 + m) return;
      const P = []; for (let x = xs; x <= xe; x += step) P.push([x, edge(i, x)]);
      for (let x = Math.floor(xe / step) * step; x >= xs; x -= step) P.push([x, edge(i + 1, x) + 1]);
      flat(P, col);
    });
    const sx = 860, sy = GY - 1180;
    glow(sx, sy, 240, '#FFE3A6', .7);
    boilSeed('sun'); paint(ellPts(sx, sy, 56, 56, 24, 1.2), { wash: '#FBE3A0', ink: null });
    for (let i = 0; i < 3; i++) {   // clouds drifting
      const cx = -200 + ((i * 520 + t * 14) % 1500), cy = GY - 1350 + i * 160;
      boilSeed('cloud' + i);
      paint(through([[cx - 110, cy + 20], [cx - 70, cy - 20], [cx, cy - 40], [cx + 70, cy - 22], [cx + 110, cy + 20]], 5).concat([[cx - 110, cy + 20]]), { wash: '#FFF8EC', ink: null });
    }
    // far hills and the meadow
    const hc = '#A8C49A', H2 = [], st = 90, hs = Math.floor(X / st) * st;
    for (let x = hs; x <= X + Wd + st; x += st) H2.push([x, GY - 40 - 80 * (.5 + .5 * Math.sin(x * .0033 + .4)) * (.6 + .4 * hash(Math.round(x / st)))]);
    flat(through(H2, 4).concat([[X + Wd + st, GY + 2], [hs, GY + 2]]), hc);
    if (y1 > GY) {
      flat(rectPts(X, GY - 2, Wd, y1 + m - GY + 2), '#86B06A');
      flat([[X, GY + 60], [X + Wd, GY + 60], [X + Wd, y1 + m], [X, y1 + m]], '#79A45E');
    }
    for (let i = 0; i < 26; i++) {   // grass tufts
      const gx = -600 + hash(i + 70) * 2300, gy = GY + 20 + hash(i + 90) * 260; if (gx < VIEW.x0 - 50 || gx > VIEW.x1 + 50) continue;
      const sw = wob(t, .4, hash(i) * 3) * 4;
      boilSeed('tuft' + i);
      for (const k of [-1, 0, 1]) inkLine([[gx + k * 7, gy], [gx + k * 10 + sw, gy - 18 - 6 * hash(i + k)]], .7, '#4F7A40', 'inkfine', .4);
    }
  }
  // the apple tree: the seasons show the years going by
  function tree(y) {
    const f = frac(y), x = TREE_X, base = GY + 10;
    boilSeed('trunk');
    paint([[x - 26, base], [x - 16, base - 250], [x - 60, base - 380], [x - 40, base - 390], [x, base - 290], [x + 40, base - 400], [x + 60, base - 390], [x + 18, base - 250], [x + 28, base]], { wash: '#7A5A44', ink: PAL.ink, sw: 1 });
    // crown colour through the year: blossom, green, orange, bare
    const cK = [[0, '#B9D7A0'], [.22, '#6FA257'], [.5, '#5E9A4B'], [.62, '#E0953F'], [.74, '#C9663A'], [.8, null]];
    let col = null, size = 1;
    if (f < .8) { let i = 0; while (i + 1 < cK.length && f >= cK[i + 1][0]) i++; const [a, ca] = cK[i], [b, cb] = cK[i + 1]; col = cb ? mixCol(ca, cb, (f - a) / (b - a)) : ca; size = f > .74 ? 1 - seg(f, .74, .8) : 1; }
    else size = seg(f, .96, 1) * .6;
    if (!col) col = '#B9D7A0';
    const blobs = [[-70, -420, 120], [60, -440, 125], [0, -520, 135], [-10, -400, 110]];
    blobs.forEach(([dx, dy, r], i) => {
      if (size < .05) return;
      boilSeed('crown' + i);
      paint(ellPts(x + dx, base + dy, r * size, r * .8 * size, 22, 3), { wash: col, ink: PAL.ink, sw: .9 });
    });
    if (f < .2 && size > .5) for (let i = 0; i < 14; i++) {   // blossoms
      boilSeed('bl' + i);
      paint(ellPts(x - 150 + hash(i) * 300, base - 560 + hash(i + 20) * 240, 8, 8, 8), { wash: '#F6C3D0', ink: null });
    }
    if (f > .5 && f < .74) for (let i = 0; i < 6; i++) {   // apples
      boilSeed('ap' + i);
      paint(ellPts(x - 120 + hash(i + 40) * 240, base - 520 + hash(i + 60) * 200, 12, 12, 10), { wash: RED, ink: PAL.ink, sw: .5 });
    }
    if (f >= .8) {   // winter: bare branches with snow
      for (const [dx, dy] of [[-120, -470], [110, -480], [0, -560], [-60, -520], [70, -520]]) {
        boilSeed('br' + dx);
        inkLine([[x, base - 330], [x + dx * .6, base + dy * .85], [x + dx, base + dy]], 1.6, '#5E4436', 'ink', .5);
        paint(ellPts(x + dx, base + dy - 4, 18, 6, 10), { wash: '#FFFFFF', ink: null });
      }
    }
  }
  // the fence, with a chalk mark for every full year
  function fence(years) {
    boilSeed('fence');
    for (let i = 0; i < 5; i++) paint(rectPts(-60 + i * 70, GY - 90, 16, 110, 1.5), { wash: '#C9A57A', ink: PAL.ink, sw: .7 });
    paint(rectPts(-80, GY - 72, 330, 34, 1), { wash: '#B8906A', ink: PAL.ink, sw: .7 });
    const n = Math.floor(years);
    for (let i = 0; i < n; i++) {
      const g = Math.floor(i / 5), j = i % 5, x = -60 + g * 70 + j * 12;
      boilSeed('tally' + i);
      if (j < 4) inkLine([[x, GY - 68], [x + 2, GY - 42]], 1.6, '#FFF8EC', 'dry', 0);
      else inkLine([[x - 48, GY - 64], [x + 4, GY - 46]], 1.6, '#FFF8EC', 'dry', 0);
    }
  }
  // the house: every part renews with the job that fixes it
  function house(tl, s, t) {
    const L = HX - HW / 2, R = HX + HW / 2, top = GY - WALL, apex = GY - HOUSE_H;
    const roof = fixOf(tl, s, 'roof'), win = fixOf(tl, s, 'windows'), heat = fixOf(tl, s, 'heating'), pnt = fixOf(tl, s, 'paint');
    // chimney and smoke
    boilSeed('chimney');
    paint(rectPts(R - 150, apex + 70, 60, 150, 1), { wash: '#8E6B5A', ink: PAL.ink, sw: .9 });
    if (heat > 0) for (let i = 0; i < 4; i++) {
      const ph = frac(t * .35 + i / 4), r = (22 + 40 * ph) * heat;
      boilSeed('smoke' + i);
      paint(ellPts(R - 120 + 30 * Math.sin(ph * 4 + i), apex + 50 - ph * 300, r, r * .8, 14, 2), { wash: '#F4F1EA', washOp: 255 * (1 - ph) , ink: null });
    }
    // walls: old grey, painted over from the bottom up
    boilSeed('wall');
    paint(rectPts(L, top, HW, WALL, 1.5), { wash: COL.wallOld, ink: null });
    if (pnt > 0) { boilSeed('wallnew'); paint(rectPts(L, GY - WALL * pnt, HW, WALL * pnt, 1.5), { wash: COL.wallNew, ink: null }); }
    if (pnt < 1) for (let i = 0; i < 6; i++) {   // peeling patches on the old paint
      const px = L + 60 + hash(i + 3) * (HW - 120), py = top + 60 + hash(i + 8) * (WALL - 140); if (py > GY - WALL * pnt) continue;
      boilSeed('peel' + i); paint(ellPts(px, py, 22, 12, 10, 2), { wash: '#8F8A82', ink: null });
    }
    boilSeed('wallink'); paint(rectPts(L, top, HW, WALL, 1.5), { ink: PAL.ink, sw: 1.2 });
    // roof: old with holes, new red tiles laid from the top down
    boilSeed('roof');
    paint([[L - 40, top + 4], [HX, apex], [R + 40, top + 4]], { wash: COL.roofOld, ink: PAL.ink, sw: 1.2 });
    if (roof < 1) for (const [dx, dy, r] of [[-80, 120, 30], [70, 170, 24], [-10, 200, 20]]) { boilSeed('hole' + dx); paint(ellPts(HX + dx, apex + dy, r, r * .6, 10, 2), { wash: '#2F2630', washOp: 255 * (1 - roof), ink: null }); }
    if (roof > 0) {
      const yb = lerp(apex, top + 4, roof), f = (yb - apex) / (top + 4 - apex);
      boilSeed('roofnew');
      paint([[HX - (HW / 2 + 40) * f, yb], [HX, apex], [HX + (HW / 2 + 40) * f, yb]], { wash: COL.roofNew, ink: PAL.ink, sw: 1.2 });
      for (let k = 1; k < 5; k++) { const yy = apex + k * (top - apex) / 5; if (yy > yb) break; const w = (HW / 2 + 40) * (yy - apex) / (top + 4 - apex); inkLine([[HX - w, yy], [HX + w, yy]], .7, '#8E3527', 'inkfine', .3); }
    }
    // windows and door
    const wins = [[HX - 150, top + 70], [HX + 150, top + 70], [HX - 150, top + 270], [HX + 150, top + 270]];
    wins.forEach(([wx, wy], i) => {
      const k = seg(win, i * .18, i * .18 + .4);
      boilSeed('win' + i);
      if (heat > 0 && k > .5) glow(wx, wy + 60, 120, '#FFD27A', .6 * heat);
      paint(rectPts(wx - 55, wy, 110, 120, 1), { wash: k > .5 ? COL.glassNew : COL.glassOld, ink: PAL.ink, sw: 1 });
      if (heat > .3 && k > .5) paint(rectPts(wx - 50, wy + 5, 100, 110, 1), { wash: '#FFE7A8', washOp: 150 * heat, ink: null });
      inkLine([[wx, wy], [wx, wy + 120]], 1.4, COL.frame, 'ink', 0);
      inkLine([[wx - 55, wy + 60], [wx + 55, wy + 60]], 1.4, COL.frame, 'ink', 0);
      if (k <= .5) { inkLine([[wx - 40, wy + 15], [wx - 5, wy + 55], [wx - 20, wy + 90]], .9, '#C9C2B6', 'inkfine', 0); paint(rectPts(wx - 62, wy + 44, 124, 18, 1), { wash: '#8E6B5A', ink: PAL.ink, sw: .6 }); }
      else inkLine([[wx - 38, wy + 20], [wx - 18, wy + 42]], 1.2, '#FFFFFF', 'inkfine', 0);
      if (k > 0 && k < 1) sparkleAt(wx, wy + 60, 30, k);
    });
    boilSeed('door');
    paint(rrPts(HX - 50, GY - 170, 100, 170, 40, 1), { wash: pnt > .3 ? '#5A7FA8' : '#6B5A4C', ink: PAL.ink, sw: 1 });
    paint(ellPts(HX + 28, GY - 85, 6, 6, 8), { wash: GOLD, ink: null });
  }
  function sparkleAt(x, y, r, k) { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: '#FFF5E2', washOp: 255 * (1 - k * k), ink: null }); }
  function coin(x, y, w = 110, key = 'c') {
    boilSeed(key);
    paint(ellPts(x, y, w / 2, w * .13, 18), { wash: GOLD, ink: PAL.ink, sw: .8 });
    inkLine([[x - w * .3, y - w * .02], [x + w * .1, y - w * .06]], .6, '#FFF1C4', 'inkfine', .3);
  }
  function pile(n, land, s) {
    const pop = spring(s, land, 7, 22);
    for (let i = 0; i < n; i++) coin(PX + (hash(i + 5) - .5) * 10, GY - 6 - i * COIN_H * (1 - .15 * pop), 110, 'pile' + i);
  }
  // the red line at 15 % of the house, across house and pile
  function redLine(L, s) {
    if (L.drawn <= 0 || L.gone >= 1) return;
    const x0 = HX - HW / 2 - 50, x1 = PX + 80, xe = lerp(x0, x1, L.drawn), al = 1 - L.gone;
    if (L.alarm > 0) glow(lerp(x0, x1, .5), LINE_Y, 420, '#FF5A5A', .5 * L.alarm * al);
    boilSeed('line');
    const P = []; for (let k = 0; k <= 10; k++) P.push([lerp(x0, xe, k / 10), LINE_Y + 3 * Math.sin(k * 1.7)]);
    inkLine(P, (3.2 + 1.2 * L.alarm) * al, mixCol(RED, '#FF8A8A', L.alarm), 'dry', .2);
    if (L.drawn >= 1 && al > .02) letter('15 %', x0 + 110, LINE_Y - 58, 96, mixCol(RED, '#FF8A8A', L.alarm), { alpha: al, pop: seg(s, 3.2, 3.5), rot: -.05, stroke: '#FFF8EC' });
    if (L.gone > 0 && L.gone < 1) for (let k = 0; k < 6; k++) sparkleAt(lerp(x0, x1, k / 5), LINE_Y, 26, L.gone);
  }
  function snail(x, carry, t, key) {
    const y = GY + 40, st = 1 + .06 * Math.sin(t * 7);
    boilSeed('snail' + key);
    paint(ribbon([[x - 70 * st, y], [x - 20, y - 4], [x + 30, y - 10], [x + 52, y - 34]], 20, 26), { wash: '#D9CBB0', ink: PAL.ink, sw: .8 });
    for (const d of [-8, 6]) { inkLine([[x + 50, y - 40], [x + 44 + d, y - 72]], .9, PAL.ink, 'ink', .3); paint(ellPts(x + 44 + d, y - 74, 5, 5, 8), { wash: PAL.ink, ink: null }); }
    paint(ellPts(x - 18, y - 40, 44, 40, 20, 1), { wash: '#C98B4E', ink: PAL.ink, sw: 1 });
    inkLine([[x - 18, y - 40], [x - 6, y - 50], [x - 24, y - 60], [x - 42, y - 44], [x - 30, y - 22], [x, y - 24]], 1.1, '#7A4E2A', 'ink', .7);
    if (carry) coin(x - 18, y - 86, 64, 'snailcoin' + key);
  }
  function dish(n) {
    boilSeed('dish');
    paint([[DISH_X - 60, GY + 18], [DISH_X + 60, GY + 18], [DISH_X + 44, GY + 44], [DISH_X - 44, GY + 44]], { wash: '#9AA6B8', ink: PAL.ink, sw: .8 });
    for (let i = 0; i < n; i++) coin(DISH_X + (i % 2 ? 8 : -8), GY + 12 - i * 8, 58, 'dish' + i);
  }
  function sack(x, y, sq = 0) {
    boilSeed('sack');
    push(); translate(x, y); scale(1 + sq * .5, 1 - sq);
    paint(through([[-10, -120], [-40, -100], [-90, -40], [-95, 30], [-60, 70], [60, 70], [95, 30], [90, -40], [40, -100], [10, -120]], 4), { wash: '#C9A26B', ink: PAL.ink, sw: 1.1 });
    paint(rectPts(-30, -118, 60, 16, 1), { wash: '#8A6B45', ink: PAL.ink, sw: .8 });
    paint(ellPts(0, 5, 34, 34, 18), { wash: GOLD, ink: PAL.ink, sw: .9 });
    paint(ellPts(0, 5, 20, 20, 14), { wash: '#F7D57A', ink: null });
    pop();
  }

  // ---------- Clawd ----------
  const MOOD = {
    bad: [[0, 'hopeful', { lookY: -1 }], [1.05, 'love'], [1.7, 'surprised', { lookX: -.8, lookY: .4 }], [2.6, 'thinking', { lookX: -.6, lookY: .3 }], [3.5, 'happy'],
          [6.4, 'determined'], [7.9, 'happy', { lookX: -.6, lookY: -.5 }], [9.4, 'determined'], [10.9, 'excited', { lookX: -.6 }], [12.4, 'determined'],
          [13.35, 'scared', { emote: '!!' }], [15.4, 'nervous'], [16.6, 'determined'], [18.3, 'proud'], [21.7, 'hopeful', { lookY: -1 }],
          [24.6, 'confused', { lookX: .9, lookY: .6 }], [27.6, 'sad', { lookX: -.3, lookY: .8 }], [29.5, 'sleepy'], [33.2, 'sad', { lookX: .8, lookY: .6 }]],
    good: [[0, 'happy'], [6.4, 'determined'], [7.9, 'happy', { lookX: -.6, lookY: -.5 }], [8.7, 'determined'], [10.9, 'thinking', { lookX: .9, lookY: .7 }],
           [12.4, 'cool'], [15.05, 'excited'], [15.6, 'determined'], [18.3, 'happy'], [18.6, 'hopeful', { lookY: -1 }], [19.65, 'love'], [21.3, 'happy', { lookX: .8, lookY: .5 }], [22.8, 'laugh']],
  };
  function poseOf(tl, s) {
    const m = emotions(s, MOOD[tl]), p = {};
    if (tl === 'bad' && s < 1.1) { p.aL = p.aR = kf(s, [[0, 1.2], [1.0, 1.25], [1.15, .6]]); }
    for (const [, s0] of RENO[tl]) {   // pay: wind up and toss the coins onto the pile
      if (s > s0 - .3 && s < s0 + .5) { p.aR = kf(s, [[s0 - .3, .2], [s0 - .05, -.5], [s0 + .12, 1.3], [s0 + .5, .3]], easeOut); p.sq = .1 * Math.sin(Math.PI * seg(s, s0 - .3, s0 + .1)); }
    }
    if (tl === 'bad' && s > 21.7 && s < 24.4) p.aL = p.aR = 1.35;   // arms up: here comes the refund
    if (tl === 'good' && s > SACK[0] - .6) {   // arms up for the sack, then holding it
      p.aL = p.aR = s < SACK[1] ? 1.35 : .75;
      if (s > SACK[1]) { const tk = take(s, SACK[1], .8); p.sq = tk.sq + .1; p.dy = tk.dy; }
    }
    const age = tl === 'bad' ? seg(s, 28.0, 33.0) : 0;
    const o = { ...m, ...p, dy: (m.dy || 0) + (p.dy || 0), sq: (m.sq || 0) + (p.sq || 0) };
    if (age > 0) { o.tint = 'pale'; o.tintK = .6 * age; o.draw = beard(age, o); }
    return o;
  }
  // a white beard that grows with the years (front view)
  const beard = (k, o) => (u, sw) => {
    if (o.view && o.view !== 'front') return;
    const P = [[-3.6, -3.4], [-2, -3.9], [0, -3.7], [2, -3.9], [3.6, -3.4], [2.4, -3.4 + 2.2 * k], [0, -3.4 + 3.4 * k], [-2.4, -3.4 + 2.2 * k]];
    paint(through(P.concat([P[0]]), 4).map(([a, b]) => [a * u, b * u]), { wash: '#F4F1EA', ink: PAL.ink, sw: sw * .6 });
    mouth(u, o.mouth, sw);
  };

  // ---------- the world at (timeline, story time) ----------
  function world(tl, s, t) {
    const y = yearOf(tl, s), P = pileOf(tl, s), L = lineOf(tl, s);
    tree(y);
    fence(y);
    house(tl, s, t);
    pile(P.n, P.land, s);
    redLine(L, s);
    dish(dishOf(tl, s));
    // Clawd
    const o = poseOf(tl, s);
    boilSeed('shadowA');
    clawd(CX, GY + 10, U, { ...o, boilKey: 'A' });
    // the key falling into Clawd's hands
    if (tl === 'bad' && s < 3) {
      const k = easeIn(seg(s, .2, 1.0)), kx = CX, ky = lerp(GY - 1400, GY + 10 - 8.8 * U, k);
      boilSeed('key');
      push(); translate(kx, ky); rotate(s < 1 ? s * 6 : .2);
      paint(ellPts(0, 0, 26, 26, 14), { wash: GOLD, ink: PAL.ink, sw: 1 }); paint(ellPts(0, 0, 10, 10, 10), { wash: '#F3EBDC', ink: null });
      paint(rectPts(20, -6, 60, 12, .5), { wash: GOLD, ink: PAL.ink, sw: .8 }); paint(rectPts(62, 4, 10, 16, .5), { wash: GOLD, ink: PAL.ink, sw: .6 });
      pop();
    }
    // coins in the air, from Clawd's hand to the top of the pile
    let before = 0;
    for (const [, s0, c] of RENO[tl]) {
      const a = seg(s, s0 + .15, s0 + .65);
      if (a > 0 && a < 1) {
        const [hx, hy] = [CX + 7 * U, GY - 5 * U], top = GY - 6 - before * COIN_H - c * COIN_H;
        const [x, yy] = arcPt([hx, hy], [PX, top], 220, easeOut(a));
        for (let i = 0; i < c; i++) coin(x, yy + (c - 1 - i) * COIN_H, 110, 'fly' + i);
      }
      if (s >= s0 + .65) before += c;
    }
    // bad timeline: the refund Clawd hopes for, in a thought bubble
    if (tl === 'bad' && s > 22.2 && s < 24.6) {
      const k = backOut(seg(s, 22.2, 22.5)) * (1 - seg(s, 24.3, 24.6)), bx = CX - 170, by = GY - 13 * U;
      boilSeed('bubble');
      push(); translate(bx, by); scale(k);
      paint(through([[-120, 10], [-110, -60], [-40, -100], [40, -96], [110, -60], [120, 10], [60, 60], [-60, 60], [-120, 10]], 5), { wash: '#FFFDF6', ink: PAL.ink, sw: 1 });
      pop();
      for (const [dx, dy, r] of [[70, 110, 16], [110, 150, 10]]) { boilSeed('bb' + r); paint(ellPts(bx + dx * k, by + dy * k, r * k, r * k, 10), { wash: '#FFFDF6', ink: PAL.ink, sw: .7 }); }
      if (k > .3) { push(); translate(bx, by - 18); scale(.55 * k); sack(0, 20); pop(); }
    }
    // good timeline: the sack falls, straight into Clawd's arms
    if (tl === 'good' && s > SACK[0]) {
      const k = easeIn(seg(s, ...SACK)), hy = GY + 10 - 9.4 * U;
      sack(CX, lerp(GY - 1500, hy, k), s > SACK[1] ? .2 * spring(s, SACK[1], 6, 18) + .06 : 0);
      if (s > SACK[1]) for (let i = 0; i < 6; i++) { const a = s - SACK[1], ang = i * TAU / 6; if (a < .5) sparkleAt(CX + Math.cos(ang) * 150 * easeOut(a / .5), hy + Math.sin(ang) * 110 * easeOut(a / .5), 20, a / .5); }
    }
    // job sparkles
    for (const [item, s0] of RENO[tl]) {
      const a = seg(s, s0 + 1.0, s0 + 1.6); if (a <= 0 || a >= 1) continue;
      const at = { roof: [HX, GY - 650], windows: [HX, GY - 330], heating: [HX + 130, GY - 720], paint: [HX, GY - 260] }[item];
      for (let i = 0; i < 5; i++) { const ang = i * TAU / 5 + .4; sparkleAt(at[0] + Math.cos(ang) * 200 * a, at[1] + Math.sin(ang) * 120 * a, 26, a); }
    }
    for (const sn of snailsOf(tl, s)) snail(sn.x, sn.coin, t, sn.key);
  }

  // ---------- frame, shots ----------
  function frame(t, c, o = {}) {
    const { tl, s, rew } = story(t);
    cam(c);
    skyGround(t);
    world(tl, s, t);
    camEnd();
    if (rew) rewindFX(rew, t);
    if (o.iris != null) { flushLetters(); iris2(o.iris); }
  }
  // rewinding: streaks and a tint, like a tape running backwards
  function rewindFX(k, t) {
    for (let i = 0; i < 16; i++) {
      const y = (i + .5) / 16 * H + jit(20), L = 400 + 500 * hash(i + 3), x = W / 2 + (hash(i) - .5) * W * .6;
      boilSeed('rew' + i);
      inkLine([[x - L / 2, y], [x + L / 2, y + jit(8)]], 3.4 * k, i % 3 ? '#FFFFFF' : '#5F7FC0', 'dry', .2);
    }
  }
  function iris2([x, y, r]) {
    flushBrush();
    const box = [[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]];
    flat(box, PAL.ink, r < 3 ? null : ellPts(x, y, r, r, 48));
  }
  const WIDE = [560, GY - 380, 1.12];
  const snailCam = (t, z) => { const { tl, s } = story(t), sn = snailsOf(tl, s).find(q => q.key === 'last' || q.key === 'end'); return [sn ? sn.x - 18 : 1000, GY - 20, z]; };

  // A 0–4: the punchline first, then rewind
  function shotA(t) {
    let c;
    if (t < 1.2) c = snailCam(t, 3.0);
    else c = mixCam(snailCam(1.2, 3.0), WIDE, ease(seg(t, 1.2, 2.3)));
    if (t > 3.1) c = [c[0], c[1], c[2] * (1 - .08 * Math.sin(Math.PI * seg(t, 3.1, 4.0))), .06 * Math.sin(Math.PI * seg(t, 3.1, 4.0))];
    frame(t, c, t < .5 ? { iris: [W / 2, H / 2 - 20 * 3, lerp(0, 1300, easeIn(t / .5))] } : {});
  }
  // B 4–10.5: the key, the line, the crane up the house
  function shotB(t) {
    let c;
    const med = [CX - 20, GY - 330, 1.35], line = [HX + 120, LINE_Y - 80, 1.15], up = [HX, GY - 820, 1.15];
    if (t < 5.4) c = [med[0], lerp(GY - 700, med[1], ease(seg(t, 4.0, 5.1))), med[2]];
    else if (t < 7.4) c = mixCam(med, line, ease(seg(t, 5.4, 5.9)));
    else if (t < 8.9) c = mixCam(line, up, ease(seg(t, 7.4, 8.9)));
    else c = mixCam(up, WIDE, ease(seg(t, 8.9, 10.3)));
    frame(t, c);
  }
  // C 10.5–25.5 (bad s 6.5–21.5): pay, fix; hard cuts; the alarm
  const FIXCAM = { roof: [HX, GY - 620, 1.35], windows: [HX, GY - 330, 1.2], heating: [HX + 60, GY - 560, .98], paint: [HX + 40, GY - 400, .95] };
  const PAYCAM = [CX + 80, GY - 230, 1.55];
  function renoCam(tl, s, t) {
    for (const [item, s0] of RENO[tl]) {
      if (s >= s0 - .4 && s < s0 + .75) return [PAYCAM[0] - 10 * (s - s0), PAYCAM[1], PAYCAM[2] + .04 * (s - s0)];
      if (s >= s0 + .75 && s < s0 + 2.9) { const f = FIXCAM[item]; return [f[0], f[1], f[2] * (1 + .03 * (s - s0 - .75))]; }
    }
    return null;
  }
  function shotC(t) {
    const { tl, s } = story(t);
    let c = renoCam(tl, s, t);
    if (s > 13.3 && s < 16.6) c = [PX - 110, LINE_Y - 120, 1.75 + .05 * (s - 13.3)];   // the alarm: the pile over the line
    if (!c) c = [WIDE[0], WIDE[1], WIDE[2] * 1.05];
    frame(t, c);
  }
  // D 25.5–38 (bad s 21.5–34): waiting for the refund; the snail; the years
  function shotD(t) {
    const { s } = story(t);
    let c;
    if (s < 24.0) c = [CX - 60, GY - 520, 1.2 + .03 * (s - 21.5)];
    else if (s < 27.8) c = mixCam([CX + 120, GY - 180, 1.45], [CX - 20, GY - 200, 1.6], ease(seg(s, 24, 27.5)));
    else c = mixCam([CX - 20, GY - 200, 1.6], WIDE, ease(seg(s, 27.8, 28.8)));
    frame(t, c);
  }
  // E 38–52.5: rewind; the right way
  function shotE(t) {
    const { tl, s } = story(t);
    let c = WIDE;
    if (tl === 'good') {
      c = renoCam(tl, s, t) || WIDE;
      if (s > 11.3 && s < 12.4) c = [PX - 110, LINE_Y - 120, 1.75];          // pile just under the line; Clawd checks
      if (s > 14.6 && s < 15.6) c = [HX + 150, LINE_Y - 60, 1.3];            // the line fades
      if (s > 18.4) c = mixCam(WIDE, [CX, GY - 420, 1.25], ease(seg(s, 18.4, 19.4)));
    }
    frame(t, c);
  }
  // F 52.5–58: the rhyme: the snail again, harmless; iris on its coin
  function shotF(t) {
    const k = ease(seg(t, 54.5, 56.8)), sc = snailCam(t, 3.0), c = mixCam([CX + 40, GY - 360, 1.2], sc, k);
    const r = t > 56.9 ? lerp(1300, 0, easeIn(seg(t, 56.9, 57.85))) : null;
    frame(t, c, r != null ? { iris: [...scr([sc[0], GY + 40 - 86], c), r] } : {});
  }

  shots([[0, shotA], [4.0, shotB], [10.5, shotC], [25.5, shotD], [38.0, shotE], [52.5, shotF]]);
})();
