// zimmer.js: "Das Chinesische Zimmer" (John Searle), 40 s, 9:16. The storyboard is STORYBOARD_zimmer.md.
// Core message: a machine can give perfect answers without understanding a single word.
// One world, one clock. The room is a cutaway box: outside on the left the visitor at a ledge, a slot through the left
// wall, inside Clawd with a desk, a gigantic rulebook and shelves of symbol cards up to the ceiling. On top of the box
// (unseen until the pull back) stands a screen, and cables run to a socket. A list of exchanges (a question card in,
// an answer card out) drives every card, every page flip and both characters; the shots only choose the cameras.
(() => {
  // ---------- world ----------
  const GY = 1500, U = 22, VU = 19;                            // the floor line; Clawd's and the visitor's size units
  const WL0 = 330, WL1 = 400, WR0 = 1300, WR1 = 1370;          // the box's left and right walls (outer and inner faces)
  const TOP0 = 280, TOP1 = 350, BOT1 = GY + 24;                 // roof slab, plinth
  const SY = GY - 125, SLOT_H = 84, HY0 = SY - SLOT_H / 2, HY1 = SY + SLOT_H / 2;   // the slot through the left wall
  const SURF = GY - 83;                                        // desk top inside = ledge top outside = the slot's floor
  const DESK_X0 = 400, DESK_X1 = 660, LEDGE_X0 = 190;
  const CW = 96, CH = 66, REST_Y = SURF - CH / 2;              // a card, and where it rests on the desk or the ledge
  const CX_D = 735, CX_B = 930, VX = 150;                     // Clawd at the desk and at the book; the visitor
  const ARRIVE = 600, PAINT_X = 600, LEDGE_X = 250;
  const BOOK = { cx: 930, top: GY - 650, bot: GY - 190, pw: 250 }, ROWS = [95, 230, 365];
  const LAMP = { x: 690, y: 880 };
  const MON = { x0: 560, x1: 1140, y0: -202, y1: 230, sx0: 602, sx1: 1098, sy0: -164, sy1: 192 };
  const SOCKET = [1462, GY - 150];
  const NG = 24;                                               // glyphs in the invented script
  const COL = {
    wallIn: '#4B3A4B', cubby: '#35293B', wood: '#8C5F3E', woodDk: '#5E3F2C', card: '#F4E8CC', cardDk: '#D9C8A2',
    section: '#3B3040', shell: '#DCCFB2', floorIn: '#6F503C', desk: '#9C6C47', deskDk: '#7A5234', hole: '#1C1620',
    cover: '#7C2F3B', page: '#F7EDD6', pageDk: '#E6D5B2', rule: '#DCCBA6', arrow: '#8A7A66',
    wallOut: '#BFD6E1', wainOut: '#A7C3D1', floorOut: '#A08C76', frame: '#F3EBDC', sky: '#8EC3E6',
    case: '#E4D8BC', caseDk: '#C8B892', screen: '#1D3E47', bubQ: '#BFE3F2', bubA: '#F6BC9E',
    gQ: '#2F3C7A', gA: '#C23B32', brass: '#C9A45A', cable: '#3E3A44', led: '#7EE08A',
    vis: '#6FA8C7', visDk: '#3F7699', visLt: '#AFD7EA', gold: '#F0C75A',
  };

  // ---------- camera and helpers ----------
  let VIEW = { x0: 0, x1: W, y0: 0, y1: H, z: 1 };
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r, z };
  }
  const vis = (x0, y0, x1, y1, m = 40) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const mixCam = (a, b, k) => a.map((v, i) => i === 2 ? v * Math.pow((b[2] ?? v) / v, k) : lerp(v, b[i] ?? 0, k));   // zoom eases geometrically
  // flat colour for the big areas (walls, floor, the closing panel) and irises: huge washes are slow on software WebGL
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // a long ink edge in canvas-sized pieces (long strokes under a zoomed camera lose their outline)
  function edge(a, b, sw, col, key, br = 'ink') {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 320));
    for (let i = 0; i < n; i++) {
      const p = [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)], q = [lerp(a[0], b[0], (i + 1) / n), lerp(a[1], b[1], (i + 1) / n)];
      if (!vis(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1]))) continue;
      boilSeed(key + i); inkLine([p, q], sw, col, br, 0);
    }
  }
  // mood + pose: the pose wins for everything it sets, except offsets, which add up
  function merge(m, p) {
    const o = { ...m, ...p };
    o.dy = (m.dy || 0) + (p.dy || 0); o.sq = (m.sq || 0) + (p.sq || 0); o.rot = (m.rot || 0) + (p.rot || 0);
    return o;
  }
  // where an arm's tip lands, replicating clawd()'s transforms, so held things touch the hand (from theseus.js)
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
  const sparkle = (x, y, r, k) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: '#FFF5E2', washOp: 255 * (1 - k * k), ink: null }); };

  // ---------- the script: invented glyphs, never letters, digits or real characters ----------
  const rot2 = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  function spiralP(cx, cy, r0, r1, a0, turns, dir, n = 22) {
    const P = []; for (let i = 0; i <= n; i++) { const k = i / n, a = a0 + dir * k * turns * TAU, r = lerp(r0, r1, k); P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return P;
  }
  const circ = (cx, cy, r, n = 14, a0 = 0) => { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * TAU; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return P; };
  function mkGlyph(i) {
    const h = k => hash(i * 7.31 + k * 1.93 + 2.2), S = [];
    const J = (P, a = .1) => P.map(([x, y], j) => [x + (h(j + 10) - .5) * a, y + (h(j + 30) - .5) * a]);
    const sm = P => through(J(P), 5);
    const add = (P, w0 = .24, w1 = .08) => S.push({ P, w0, w1 });
    const dot = (x, y, r = .11) => S.push({ dot: [x + (h(40) - .5) * .1, y + (h(41) - .5) * .1], r });
    const type = i % 6;
    if (type === 0) {          // a big spiral with three spikes off its rim and a dot
      add(spiralP(-.12, -.04, .64, .06, Math.PI * 1.1, 1.35, 1, 26), .26, .07);
      for (const [a0, l] of [[.25, .28], [.8, .36], [1.35, .26]]) add([[-.12 + Math.cos(a0) * .7, -.04 + Math.sin(a0) * .7], [-.12 + Math.cos(a0) * (.7 + l), -.04 + Math.sin(a0) * (.7 + l)]], .16, .03);
      dot(-.7, -.72, .12);
    } else if (type === 1) {   // a sprout: a ring with three petals fanning up from it, two dots beside it
      add(circ(0, .5, .2, 14, -Math.PI / 2), .15, .15);
      add(sm([[-.08, .3], [-.36, -.1], [-.7, -.52]]), .26, .06);
      add(sm([[0, .29], [.04, -.25], [-.04, -.86]]), .26, .06);
      add(sm([[.08, .3], [.4, -.02], [.72, -.34]]), .26, .06);
      dot(.66, .52, .1); dot(.84, .3, .09);
    } else if (type === 2) {   // a wave with a ring over a crest and a slash under it
      const wv = []; for (let k = 0; k <= 12; k++) { const x = -.85 + 1.7 * k / 12; wv.push([x, -.02 + .26 * Math.sin(x * Math.PI * 1.45 + .4)]); }
      add(J(wv, .06), .26, .1);
      add(circ(-.36, -.56, .17, 14, -1.2), .13, .13);
      add(sm([[.3, .32], [.46, .58], [.54, .86]]), .2, .06);
    } else if (type === 3) {   // an arch that curls in at its foot, two drops under it, a tick on top
      const ar = []; for (let k = 0; k <= 14; k++) { const a = Math.PI + k / 14 * Math.PI; ar.push([Math.cos(a) * .72, .48 + Math.sin(a) * 1.02]); }
      add(J(ar, .06).concat(spiralP(.5, .42, .22, .05, 0, .9, 1, 10).slice(1)), .26, .07);
      dot(-.22, .3, .12); dot(.14, .5, .1);
      add(sm([[-.14, -.8], [.1, -.9], [.34, -.8]]), .13, .05);
    } else if (type === 4) {   // a drop with a spiral inside and two rays off its point
      add(through(J([[.55, -.72], [-.12, -.36], [-.56, .2], [-.3, .72], [.26, .72], [.56, .32], [.48, -.2], [.55, -.72]], .06), 4), .2, .1);
      add(spiralP(.02, .3, .24, .04, 0, 1.1, 1, 14), .12, .05);
      add(sm([[.66, -.76], [.84, -.9], [.96, -.86]]), .12, .05);
      add(sm([[.62, -.62], [.86, -.56], [.96, -.44]]), .12, .05);
    } else {                   // an almond with a pupil and a curled tail
      add(through(J([[-.78, .02], [-.3, -.42], [.26, -.44], [.76, -.02], [.26, .36], [-.3, .38], [-.74, .06]], .06), 4).concat(sm([[.76, -.02], [.94, .36], [.74, .72], [.46, .62]]).slice(1)), .2, .07);
      dot(0, -.03, .15);
    }
    if (Math.floor(i / 12) % 2) { dot(-.78, .78, .08); dot(-.56, .9, .08); }   // the second dozen: a pair of dots at the foot
    const sx = Math.floor(i / 6) % 2 ? -1 : 1, rot = (h(5) - .5) * .7, tf = ([x, y]) => rot2([x * sx, y], rot);
    for (const st of S) { if (st.P) st.P = st.P.map(tf); else st.dot = tf(st.dot); }
    return S;
  }
  const GLYPHS = Array.from({ length: NG }, (_, i) => mkGlyph(i));
  const gid = id => ((id % NG) + NG) % NG;
  function partial(P, k) {
    if (k >= 1) return P;
    const f = k * (P.length - 1), m = Math.floor(f), out = P.slice(0, m + 1);
    if (m < P.length - 1) out.push([lerp(P[m][0], P[m + 1][0], f - m), lerp(P[m][1], P[m + 1][1], f - m)]);
    return out;
  }
  // a tapered ribbon around an already dense path (ribbon() in core.js smooths first, which these don't need)
  function rib(C, w0, w1) {
    const n = C.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / Math.max(1, n - 1)) / 2;
      L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
    }
    return L.concat(R.reverse());
  }
  // paint glyph id at (x, y), half-size s, drawn up to k (0..1): the strokes appear in order, like a brush writing them
  function glyph(id, x, y, s, col, k = 1, key = 'g') {
    if (k <= 0 || s < 1) return;
    const G = GLYPHS[gid(id)], n = G.length;
    boilSeed(key);
    G.forEach((st, j) => {
      const kk = clamp(k * n - j); if (kk <= 0) return;
      if (st.dot) { const r = st.r * s * backOut(kk); if (r > .6) paint(ellPts(x + st.dot[0] * s, y + st.dot[1] * s, r, r, 10), { wash: col, ink: null }); return; }
      const P = partial(st.P, kk); if (P.length < 2) return;
      paint(rib(P.map(([a, b]) => [x + a * s, y + b * s]), st.w0 * s, lerp(st.w0, st.w1, kk) * s), { wash: col, ink: null });
    });
  }
  // where the brush is while glyph id is k of the way painted (unit coordinates)
  function glyphHead(id, k) {
    const G = GLYPHS[gid(id)], n = G.length, j = Math.min(n - 1, Math.floor(clamp(k) * n)), st = G[j], kk = clamp(k * n - j);
    return st.dot ? st.dot : partial(st.P, Math.max(.02, kk)).at(-1);
  }
  // a cheap one-line version for small, far or background cards
  function miniGlyph(id, x, y, s, col, sw = .8) {
    const st = GLYPHS[gid(id)].find(q => q.P), P = st.P.filter((_, j) => j % 3 === 0 || j === st.P.length - 1).map(([a, b]) => [x + a * s, y + b * s]);
    inkLine(P, sw, col, 'inkfine', .5);
  }
  function card(x, y, rot, g, kind, gk = 1, key = 'c', o = {}) {
    if (!vis(x - 70, y - 70, x + 70, y + 70)) return;
    push(); translate(x, y); if (rot) rotate(rot);
    boilSeed(key);
    paint(rectPts(-CW / 2, -CH / 2, CW, CH, 1), { wash: COL.card, ink: PAL.ink, sw: .6 });
    if (g != null && gk > 0) {
      const col = kind === 'a' ? COL.gA : COL.gQ;
      if (o.mini || VIEW.z < .95) miniGlyph(g, 0, 0, 22, col, 1); else glyph(g, 0, 0, 24, col, gk, key + 'g');
    }
    pop();
  }
  function brushTool(hx, hy, tx, ty, col, key) {
    boilSeed(key);
    const bx = lerp(hx, tx, .7), by = lerp(hy, ty, .7);
    inkLine([[hx, hy], [bx, by]], 1.4, '#6B4230', 'ink', 0);
    paint(ribbon([[bx, by], [tx, ty]], 9, 2.5), { wash: col, ink: PAL.ink, sw: .35 });
  }

  // ---------- the exchanges ----------
  // Each exchange: the visitor writes a question card (bv blank, w0..w1 writing), flicks it (fl) through the slot; it lands
  // at Clawd's desk (in1); Clawd grabs it (gr), trots to the book (wk0..wk1), flips pages (f0..f1, nf flips), finds the row
  // (fd), trots back (bk0..bk1), throws the question on the heap (put), takes a blank (bl), copies the answer (p0..p1) and
  // flicks it out (pu); it arrives on the ledge (out1). The visitor catches it (ca), reads (rd), reacts (rx), tosses it (ts).
  const EX = [];
  EX.push({
    q: 0, a: 9, bv: -3, w0: -2.6, w1: -1.6, fl: -.45, in1: 1.25, arrive: 574,
    inX: t => { const u = clamp(t, -.45, 1.25); return u < .55 ? 358 + 240 * u : 490 + 240 * (u - .55 - (u - .55) ** 2 / 1.4); },
    gr: 3.3, wk0: 3.52, wk1: 4.3, f0: 4.8, f1: 5.9, nf: 4, fd: 6.0, bk0: 8.45, bk1: 9.0, put: 9.12, bl: 9.25, p0: 9.5, p1: 10.45, pu: 10.75, out1: 11.85,
    outX: t => t < 11.25 ? lerp(PAINT_X, 395, seg(t, 10.75, 11.25)) : lerp(395, LEDGE_X, easeOut(seg(t, 11.25, 11.85))),
    glance: 9.88, regrab: [15.85, 19.45], ca: 12.0, rd: 12.3, rx: 13.1, ts: 20.1,
  });
  // the montage and the reveal: [visitor part, Clawd part] in beats, faster and faster, then easing off for the screen
  const PLAN = [[2.5, 3.5], [2, 2.5], [1.25, 2], [1, 1.5], [.75, 1.25], [.75, 1.25], [1, 1.5], [1, 1.25]];
  const QS = [3, 14, 7, 20, 11, 4, 17, 22], AS = [16, 5, 21, 1, 13, 23, 8, 10];
  let S0 = 19.375;
  PLAN.forEach(([vb, cb], j) => {
    const V = vb * BEAT, C = cb * BEAT, S = S0, T = S + V, prev = EX[EX.length - 1];
    if (j > 0) Object.assign(prev, { ca: S + .03 * V, rd: S + .1 * V, rx: S + .18 * V, ts: S + .52 * V });
    const e = { q: QS[j], a: AS[j], S, V, C, bv: S + .58 * V, w0: S + .64 * V, w1: S + .86 * V, fl: S + .92 * V, in1: T + .1 * C, arrive: ARRIVE,
      gr: T + .14 * C, wk0: T + .17 * C, wk1: T + .28 * C, f0: T + .3 * C, f1: T + .5 * C, nf: C > 2 ? 3 : C > 1.1 ? 2 : 1, fd: T + .52 * C,
      bk0: T + .58 * C, bk1: T + .68 * C, put: T + .7 * C, bl: T + .72 * C, p0: T + .76 * C, p1: T + .9 * C, pu: T + .93 * C, out1: T + C };
    e.inX = tt => lerp(LEDGE_X, ARRIVE, easeOut(seg(tt, e.fl, e.in1)));
    e.outX = tt => lerp(PAINT_X, LEDGE_X, easeOut(seg(tt, e.pu, e.out1)));
    EX.push(e); S0 = T + C;
  });
  Object.assign(EX[EX.length - 1], { ca: 35.15, rd: 35.4, rx: 35.75, ts: 36.45 });
  // the last question: the same glyph as the opening card, so the loop closes
  EX.push({ q: 0, a: 9, final: true, bv: 36.6, w0: 36.9, w1: 37.7, fl: 38.1, in1: 39.1, arrive: 430, inX: tt => lerp(LEDGE_X, 430, ease(seg(tt, 38.12, 39.1))),
    gr: 99, wk0: 99, wk1: 99, f0: 99, f1: 99.5, nf: 0, fd: 99, bk0: 99, bk1: 99, put: 99, bl: 99, p0: 99, p1: 99, pu: 99, out1: 99.5, outX: () => PAINT_X, ca: 99, rd: 99, rx: 99, ts: 99 });

  // page flips, the spread each exchange ends on, and the chat log for the screen
  const FLIPS = [], MATCH = {};
  { let n = 0; for (const e of EX) { const d = (e.f1 - e.f0) / Math.max(1, e.nf); for (let i = 0; i < e.nf; i++) FLIPS.push({ t: e.f0 + (i + .5) * d, h: Math.min(.3, d * 1.15) / 2 }); n += e.nf; e.spread = n; if (e.nf) MATCH[n] = e; } }
  const flipsDone = t => FLIPS.filter(f => t >= f.t + f.h).length, flipsStarted = t => FLIPS.filter(f => t >= f.t - f.h).length;
  const MSGS = [];
  for (const e of EX) { if (e.fl < 90) MSGS.push({ t: e.fl + .12, side: 'q', g: e.q }); if (e.pu < 90) MSGS.push({ t: lerp(e.pu, e.out1, .5), side: 'a', g: e.a }); }
  MSGS.sort((a, b) => a.t - b.t);
  // when each card has cleared the flap inside the slot (for the flap's swing back)
  for (const e of EX) {
    e.flapIn = null; for (let t = e.fl; t <= e.in1; t += .004) if (e.inX(t) - CW / 2 > 482) { e.flapIn = t; break; }
    e.flapOut = null; if (e.pu < 90) for (let t = e.pu; t <= e.out1; t += .004) if (e.outX(t) + CW / 2 < 398) { e.flapOut = t; break; }
  }
  const PANEL = [30.95, 31.55];                                // the front panel rolls down
  const panelK = t => easeIn(seg(t, ...PANEL));
  const frenzy = t => ease(seg(t, 19.4, 27.5)) * (1 - ease(seg(t, 30, 31)));

  // ---------- moods ----------
  const MOOD_C = [[0, 'sleepy'], [1.3, 'surprised'], [2.05, 'thinking', { lookX: -1, lookY: .55 }], [3.05, 'determined'],
    [6.0, 'surprised'], [6.55, 'happy'], [8.45, 'determined'], [10.95, 'relieved'], [15.63, 'neutral', { lookX: -.6, lookY: .7 }], [16.3, 'confused'],
    [EX[1].S + EX[1].V + .05, 'determined'], [EX[2].S + EX[2].V + .05, 'nervous'], [27.6, 'dizzy']];
  const REACT = ['excited', 'love', 'starstruck', 'excited', 'love', 'starstruck', 'excited', 'love'];
  const MOOD_V = [[0, 'neutral', { lookX: .7 }], [11.4, 'hopeful', { lookX: .9, lookY: .2 }], [12.35, 'thinking', { lookX: .9, lookY: -.1 }], [13.1, 'starstruck'], [13.95, 'love']];
  EX.slice(1, -1).forEach((e, j) => MOOD_V.push([e.rx, REACT[j]]));
  MOOD_V.push([36.85, 'happy'], [38.25, 'hopeful', { lookX: .9, lookY: .1 }]);
  MOOD_V.sort((a, b) => a[0] - b[0]);

  // ---------- Clawd ----------
  const exC = t => { let e = EX[0]; for (const x of EX) if (!x.final && t >= x.in1 - .45) e = x; return e; };
  const paintK = (e, t) => e.glance ? kf(t, [[e.p0, 0], [e.glance, .55], [e.glance + .5, .55], [e.p1, 1]], x => x) : seg(t, e.p0, e.p1);
  function clawdAt(t) {
    const m = emotions(t, MOOD_C), e = exC(t);
    let x = CX_D, p = { view: 'front' };
    if (t < e.gr - .3) {                                     // waiting at the desk
      if (e === EX[0] && t > 2.5) p = { ...turn(t, 2.5, 2.66, 0, -.25), rot: -.08 * ease(seg(t, 2.66, 3.0)) };
    } else if (t < e.gr) {                                   // turn to the card, reach for it
      const k = seg(t, e.gr - .3, e.gr);
      p = { ...(e === EX[0] ? { view: 'side', flip: true } : turn(t, e.gr - .3, e.gr - .17, 0, -.25)), aL: kf(t, [[e.gr - .3, .2], [e.gr - .04, -.5]]), rot: .1 * Math.sin(Math.PI * k) };
      x = lerp(CX_D, CX_D - 26, ease(k));
    } else if (t < e.wk0) {                                  // lift it
      p = { view: 'side', flip: true, aL: kf(t, [[e.gr, -.5], [e.wk0, .35]]) };
      x = lerp(CX_D - 26, CX_D - 10, ease(seg(t, e.gr, e.wk0)));
    } else if (t < e.wk1) {                                  // trot to the book
      const x0 = CX_D - 10; x = lerp(x0, CX_B, ease(seg(t, e.wk0 + .06, e.wk1)));
      const walk = (x - x0) / (4 * U);
      p = { ...turn(t, e.wk0, e.wk0 + .13, -.25, .25), walk, dy: -Math.abs(Math.sin(walk * Math.PI)) * .5, aL: .35 + .12 * Math.sin(walk * TAU) };
    } else if (t < e.f0) {                                   // turn to the book, look up at it
      x = CX_B; p = { ...turn(t, e.wk1, e.wk1 + .14, .25, .5), aL: .1, aR: .2 };
    } else if (t < e.fd) {                                   // flip, flip, flip
      x = CX_B; let aR = .2, sq = 0;
      const d = (e.f1 - e.f0) / e.nf, h = Math.min(.3, d * 1.15) / 2;
      for (let i = 0; i < e.nf; i++) {
        const fi = e.f0 + (i + .5) * d;
        if (t > fi - h - .08 && t < fi + h + .08) { aR = kf(t, [[fi - h - .08, .2], [fi - h * .2, 1.55], [fi + h, .5], [fi + h + .08, .2]]); sq = .06 * Math.sin(Math.PI * seg(t, fi - h, fi + h)); }
      }
      p = { view: 'back', aL: .1, aR, sq };
    } else if (t < e.bk0) {                                  // found it: hold the card up next to the page
      x = CX_B; const tk = take(t, e.fd, .8);
      p = { view: 'back', aL: kf(t, [[e.fd, .1], [e.fd + .22, 1.15]], easeOut), aR: .2, sq: tk.sq, dy: tk.dy };
    } else if (t < e.bk1) {                                  // trot back to the desk
      x = lerp(CX_B, CX_D, ease(seg(t, e.bk0 + .06, e.bk1)));
      const walk = (CX_B - x) / (4 * U);
      p = { ...turn(t, e.bk0, e.bk0 + .13, .5, .75), walk, dy: -Math.abs(Math.sin(walk * Math.PI)) * .5, aL: .35 + .12 * Math.sin(walk * TAU) };
    } else if (t < e.bl) {                                   // throw the question on the heap, reach under the desk
      p = { view: 'side', flip: true, aL: kf(t, [[e.bk1, .35], [e.put - .07, .95], [e.put + .06, -.35], [e.bl, -.95]], easeOut), sq: .12 * ease(seg(t, e.put + .05, e.bl)) };
    } else if (t < e.p0) {                                   // a blank card up onto the desk
      p = { view: 'side', flip: true, aL: kf(t, [[e.bl, -.95], [e.p0 - .04, -.12]]), sq: .12 * (1 - ease(seg(t, e.bl, e.p0))) };
    } else if (t < e.p1) {                                   // copy the answer, stroke by stroke
      const g = e.glance, looking = g && t > g - .02 && t < g + .52;
      p = { view: 'side', flip: true, aL: -.1 + (looking ? 0 : .07 * Math.sin(t * 31)), rot: .05, mouth: 'tongue' };
      if (looking) p = { ...p, ...(t < g + .26 ? turn(t, g, g + .12, -.25, .25) : turn(t, g + .38, g + .5, .25, -.25)) };
    } else if (t < e.pu) {                                   // wind up
      p = { view: 'side', flip: true, aL: kf(t, [[e.p1, -.1], [e.pu - .02, .75]], easeOut), rot: kf(t, [[e.p1, .05], [e.pu, .14]]) };
    } else if (t < e.pu + .32) {                             // flick
      p = { view: 'side', flip: true, aL: kf(t, [[e.pu, .75], [e.pu + .07, -.4], [e.pu + .32, .1]]), rot: kf(t, [[e.pu, .14], [e.pu + .07, -.16], [e.pu + .32, 0]]) };
      x = CX_D - 16 * Math.sin(Math.PI * seg(t, e.pu, e.pu + .32));
    } else {                                                 // done: face front and wait
      p = turn(t, e.pu + .32, e.pu + .46, -.25, 0);
      if (e === EX[0] && t > 15.4) {                         // shot E: fish the question off the heap and puzzle over it
        x = kf(t, [[15.45, CX_D], [15.8, 668], [19.3, 668], [19.7, CX_D]]);
        p = { view: 'front', aL: kf(t, [[15.45, .2], [15.85, -.9], [16.2, 1.3], [19.3, 1.3], [19.45, -.3], [19.7, .2]]), sq: .16 * Math.sin(Math.PI * seg(t, 15.5, 16.15)) };
        if (t > 16.95 && t < 17.9) {                         // the shrug: both arms up, the body pops up and drops
          const k = seg(t, 16.95, 17.9), up = Math.sin(Math.PI * clamp(k * 1.25));
          p.aR = kf(t, [[16.95, 1.5], [17.08, .45], [17.6, .45], [17.9, 1.5]]); p.aL = kf(t, [[16.95, 1.3], [17.08, .75], [17.6, .75], [17.9, 1.3]]);
          p.dy = -.45 * up; p.sq = -.1 * up + .12 * Math.exp(-(t - 17.6) * 9) * (t > 17.6 ? 1 : 0);
        }
      }
    }
    return { x, o: merge(m, p) };
  }
  // the card in Clawd's hand sits just above the arm tip
  const handC = C => { const [hx, hy] = armTip(C.x, GY, U, C.o, 'L'); return [hx, hy - CH * .36]; };
  const heldRot = t => t > 16.2 && t < 19.4 ? kf(t, [[16.3, 0], [16.62, Math.PI], [17.95, Math.PI], [18.2, Math.PI * .55], [18.8, Math.PI * .55], [19.05, Math.PI * .1]]) : 0;

  // ---------- the visitor ----------
  const VEV = [];                                            // the visitor's timeline of actions
  EX.forEach((e, i) => {
    const pts = i ? EX[i - 1].ts : -9;
    if (e.ca < 90) VEV.push([e.ca - .3, 'reach', e], [e.ca, 'lift', e], [e.rd, 'read', e], [e.rx, 'react', e], [e.ts - Math.min(.3, (e.ts - e.rx) * .45), 'toss', e], [e.ts + .08, 'free', e]);
    VEV.push([e.bv - Math.min(.2, (e.bv - pts - .08) * .6), 'turn', e], [e.bv, 'blank', e], [e.w0, 'write', e], [e.w1, 'wind', e], [e.fl, 'flick', e], [e.fl + .3, 'wait', e]);
  });
  VEV.sort((a, b) => a[0] - b[0]);
  function visitorAt(t) {
    const m = emotions(t, MOOD_V);
    let i = -1; for (let j = 0; j < VEV.length; j++) if (t >= VEV[j][0]) i = j;
    const [t0, kind, e] = i >= 0 ? VEV[i] : [-9, 'wait', EX[0]], t1 = i + 1 < VEV.length ? VEV[i + 1][0] : t0 + 9, k = seg(t, t0, t1);
    let x = VX, p = { view: 'side', aL: .3 };
    switch (kind) {
      case 'reach': p = { view: 'side', aL: lerp(.4, -.25, ease(k)) }; x = VX + 10 * ease(k); break;
      case 'lift': p = { view: 'side', aL: lerp(-.25, .95, ease(k)) }; x = VX + 10 * (1 - ease(k)); break;
      case 'read': p = { view: 'side', aL: .95, lookX: .8, lookY: -.2 }; break;
      case 'react': p = { ...turn(t, t0, t0 + .14, .25, 0), aL: kf(t, [[t0, .95], [t0 + .2, 1.3]], easeOut) }; break;
      case 'toss': p = { view: 'front', aL: kf(t, [[t0, 1.3], [lerp(t0, t1, .45), 1.6], [t1, -.25]], easeOut) }; break;
      case 'free': p = { view: 'front', aL: lerp(-.25, .3, ease(k)) }; break;
      case 'turn': p = { ...turn(t, t0, t0 + Math.min(.14, (t1 - t0) * .7), 0, .25), aL: lerp(.3, -.8, ease(k)), sq: .1 * ease(k) }; break;
      case 'blank': p = { view: 'side', aL: lerp(-.8, .9, ease(k)), sq: .1 * (1 - ease(k)) }; break;
      case 'write': p = { view: 'side', aL: .9 + .08 * Math.sin(t * 30), lookX: .6, lookY: .7, dy: -.85 * (m.dy || 0) }; break;
      case 'wind': p = { view: 'side', aL: lerp(.9, 1.3, easeOut(k)), rot: -.08 * k }; break;
      case 'flick': p = { view: 'side', aL: kf(t, [[t0, 1.3], [t0 + .07, .1], [t0 + .3, .4]]), rot: kf(t, [[t0, -.08], [t0 + .07, .1], [t0 + .3, 0]]) }; break;
      default: p = { view: 'side', aL: .3, lookX: .8 };
    }
    const o = merge(m, p);
    Object.assign(o, { col: COL.vis, dk: COL.visDk, lt: COL.visLt, tint: null, tintK: 0, hat: 'top' });
    return { x, o };
  }
  const handV = Vp => { const [hx, hy] = armTip(Vp.x, GY, VU, Vp.o, 'L'); return [hx + (Vp.o.view === 'side' ? 8 : 0), hy - CH * .36]; };

  // ---------- the cards ----------
  const heapPos = i => [505 + (hash(i * 3.3 + 1) - .5) * 120, GY - CH / 2 + 5 - i * 5, (hash(i * 5.1 + 2) - .5) * .6];
  const pilePos = i => [44 + (hash(i * 4.7 + 3) - .5) * 70, GY - CH / 2 + 5 - i * 6, (hash(i * 6.3 + 4) - .5) * .6];
  const fly = (a, b, k, spin = 6) => { const [x, y] = arcPt(a, b, 120, easeOut(k)); return { x, y, rot: lerp(a[2] || 0, b[2] || 0, k) + spin * k * (1 - k) }; };
  // every card at time t: { x, y, rot, g, kind, gk, key, held: 'C' | 'V' | null, mini }
  function cardsAt(t, Cp, Vp) {
    const out = [];
    EX.forEach((e, i) => {
      // the question
      let q = null;
      if (t >= e.bv) {
        if (t < e.w0) { const k = ease(seg(t, e.bv, e.w0)); q = { x: lerp(LEDGE_X - 30, LEDGE_X, k), y: lerp(GY - 20, REST_Y, k), rot: .3 * (1 - k), gk: 0 }; }
        else if (t < e.fl) q = { x: LEDGE_X, y: REST_Y, gk: seg(t, e.w0, e.w1) };
        else if (t < e.in1) q = { x: e.inX(t), y: REST_Y };
        else if (t < e.gr) q = { x: e.arrive, y: REST_Y };
        else if (t < e.put) { const [hx, hy] = handC(Cp), k = ease(seg(t, e.gr, e.gr + .12)); q = { x: lerp(e.arrive, hx, k), y: lerp(REST_Y, hy, k), held: 'C' }; }
        else {
          const hp = heapPos(i), R = e.regrab;
          if (t < e.put + .35) { const Cq = clawdAt(e.put), h0 = handC(Cq); q = fly(h0, hp, seg(t, e.put, e.put + .35)); }
          else if (R && t >= R[0] && t < R[1]) { const [hx, hy] = handC(Cp), k = ease(seg(t, R[0], R[0] + .15)); q = { x: lerp(hp[0], hx, k), y: lerp(hp[1], hy, k), rot: lerp(hp[2], heldRot(t), k), held: 'C' }; }
          else if (R && t >= R[1] && t < R[1] + .35) { const h0 = handC(clawdAt(R[1])); q = fly([...h0, heldRot(R[1])], hp, seg(t, R[1], R[1] + .35)); }
          else q = { x: hp[0], y: hp[1], rot: hp[2], mini: true };
        }
      }
      if (q) out.push({ rot: 0, gk: 1, ...q, g: e.q, kind: 'q', key: 'q' + i });
      // the answer
      let a = null;
      if (t >= e.bl) {
        if (t < e.p0) { const k = ease(seg(t, e.bl, e.p0)); a = { x: lerp(PAINT_X - 20, PAINT_X, k), y: lerp(GY - 25, REST_Y, k), rot: -.3 * (1 - k), gk: 0 }; }
        else if (t < e.pu) a = { x: PAINT_X, y: REST_Y, gk: paintK(e, t) };
        else if (t < e.out1) a = { x: e.outX(t), y: REST_Y };
        else if (t < e.ca) a = { x: LEDGE_X, y: REST_Y };
        else if (t < e.ts) { const [hx, hy] = handV(Vp), k = ease(seg(t, e.ca, e.ca + .1)); a = { x: lerp(LEDGE_X, hx, k), y: lerp(REST_Y, hy, k), held: 'V' }; }
        else { const pp = pilePos(i); a = t < e.ts + .38 ? fly(handV(visitorAt(e.ts)), pp, seg(t, e.ts, e.ts + .38), -6) : { x: pp[0], y: pp[1], rot: pp[2], mini: true }; }
      }
      if (a) out.push({ rot: 0, gk: 1, ...a, g: e.a, kind: 'a', key: 'a' + i });
    });
    return out;
  }

  // ---------- set pieces ----------
  function outsideBG(t) {
    const { x0, x1, y0, y1 } = VIEW, m = 100, X = x0 - m, Wd = x1 - x0 + 2 * m;
    if (y0 < GY) flat(box(X, y0 - m, Wd, GY - y0 + m), COL.wallOut);
    if (y0 < GY && y1 > GY - 290) flat(box(X, GY - 280, Wd, 282), COL.wainOut);
    if (y1 > GY) flat(box(X, GY, Wd, y1 + m - GY), COL.floorOut);
    edge([X, GY - 280], [X + Wd, GY - 280], 1.1, '#7F9FAF', 'rail');
    edge([X, GY], [X + Wd, GY], 1.2, PAL.ink, 'floor');
    for (let j = 1; j < 8; j++) { const y = GY + j * j * 14; if (y > y1 + 20) break; edge([X, y], [X + Wd, y], .6, '#85705C', 'plank' + j, 'inkfine'); }
    // the window, with sky: outside has daylight, inside has none
    if (vis(-10, GY - 780, 260, GY - 400)) {
      boilSeed('window');
      paint(rectPts(-10, GY - 780, 270, 380, 1.5), { wash: COL.frame, ink: PAL.ink, sw: 1 });
      paint(rectPts(8, GY - 762, 234, 344, 1), { wash: COL.sky, ink: null });
      const cx = 30 + ((t * 18) % 220), cy = GY - 690;
      boilSeed('wcloud'); paint(through([[cx - 40, cy + 12], [cx - 22, cy - 10], [cx + 6, cy - 20], [cx + 30, cy - 8], [cx + 44, cy + 12]], 4), { wash: '#FFF8EC', ink: null });
      boilSeed('wbars'); paint(rectPts(118, GY - 764, 14, 348, .5), { wash: COL.frame, ink: PAL.ink, sw: .6 }); paint(rectPts(8, GY - 598, 234, 14, .5), { wash: COL.frame, ink: PAL.ink, sw: .6 });
      boilSeed('sill'); paint(rectPts(-24, GY - 404, 298, 18, 1), { wash: COL.frame, ink: PAL.ink, sw: .8 });
    }
    if (vis(SOCKET[0] - 30, SOCKET[1] - 30, SOCKET[0] + 30, SOCKET[1] + 30)) {
      boilSeed('socket'); paint(rrPts(SOCKET[0] - 22, SOCKET[1] - 28, 44, 56, 8), { wash: COL.frame, ink: PAL.ink, sw: .7 });
    }
  }
  function cables(t) {
    if (!vis(1100, -100, 1800, GY + 40)) return;
    boilSeed('cab1'); paint(ribbon([[WR1 - 20, GY - 430], [WR1 + 70, GY - 360], [WR1 + 50, GY - 80], [SOCKET[0] - 70, GY - 14], [SOCKET[0], SOCKET[1] + 60], [SOCKET[0], SOCKET[1] + 8]], 16, 14), { wash: COL.cable, ink: PAL.ink, sw: .6 });
    boilSeed('cab2'); paint(ribbon([[WR1 - 20, GY - 560], [WR1 + 150, GY - 520], [WR1 + 170, GY - 120], [WR1 + 320, GY - 14], [WR1 + 700, GY - 10]], 12, 12), { wash: '#5A5462', ink: PAL.ink, sw: .6 });
    boilSeed('cab3'); paint(ribbon([[MON.x1 - 30, 70], [MON.x1 + 90, 130], [WR1 + 40, 230], [WR1 + 60, 450], [WR1 - 20, 580]], 12, 12), { wash: COL.cable, ink: PAL.ink, sw: .6 });
    boilSeed('plug'); paint(rectPts(SOCKET[0] - 14, SOCKET[1] - 4, 28, 30, .5), { wash: '#4A4652', ink: PAL.ink, sw: .6 });
  }
  function monitor(t) {
    if (!vis(MON.x0 - 30, MON.y0 - 30, MON.x1 + 30, TOP0)) return;
    boilSeed('mon');
    paint(rrPts(760, MON.y1 + 30, 280, 22, 8), { wash: COL.caseDk, ink: PAL.ink, sw: 1 });
    paint(rectPts(836, MON.y1 - 6, 128, 40, 1), { wash: COL.caseDk, ink: PAL.ink, sw: 1 });
    paint(rrPts(MON.x0, MON.y0, MON.x1 - MON.x0, MON.y1 - MON.y0, 28), { wash: COL.case, ink: PAL.ink, sw: 1.4 });
    paint(rrPts(MON.sx0, MON.sy0, MON.sx1 - MON.sx0, MON.sy1 - MON.sy0, 20), { wash: COL.screen, ink: PAL.ink, sw: 1.1 });
    glow((MON.sx0 + MON.sx1) / 2, (MON.sy0 + MON.sy1) / 2, 330, '#5FD3C4', .35);
    boilSeed('monled'); paint(ellPts(MON.x1 - 40, MON.y1 - 20, 7, 7, 10), { wash: COL.led, ink: PAL.ink, sw: .5 });
    chat(t);
  }
  // the conversation on the screen: questions left (blue), answers right (orange), the newest at the bottom
  function chat(t) {
    let n = 0; while (n < MSGS.length && MSGS[n].t <= t) n++;
    if (!n) return;
    const last = MSGS[n - 1].t, slide = 1 - ease(seg(t, last, last + .22)), popK = backOut(seg(t, last + .12, last + .38)), BH = 76, BW = 180, P = 88, yb = MON.sy1 - 16 - BH / 2;
    for (let j = 0; j < Math.min(n, 6); j++) {
      const mg = MSGS[n - 1 - j], cy = yb - j * P + (j ? slide * P : 0), top = cy - BH / 2;
      const sc = (j ? 1 : popK) * clamp((top - MON.sy0 - 4) / 30); if (sc < .05) continue;
      const q = mg.side === 'q', cx = q ? MON.sx0 + 70 + BW / 2 : MON.sx1 - 70 - BW / 2;
      push(); translate(cx, cy); scale(sc);
      boilSeed('bub' + (n - 1 - j));
      const tail = q ? [[-BW / 2 + 16, BH / 2 - 10], [-BW / 2 - 12, BH / 2 + 12], [-BW / 2 + 40, BH / 2 - 4]] : [[BW / 2 - 16, BH / 2 - 10], [BW / 2 + 12, BH / 2 + 12], [BW / 2 - 40, BH / 2 - 4]];
      paint(tail, { wash: q ? COL.bubQ : COL.bubA, ink: PAL.ink, sw: .6 });
      paint(rrPts(-BW / 2, -BH / 2, BW, BH, 26), { wash: q ? COL.bubQ : COL.bubA, ink: PAL.ink, sw: .7 });
      if (VIEW.z > 1.2) glyph(mg.g, 0, 0, 27, q ? COL.gQ : COL.gA, 1, 'bg' + (n - 1 - j)); else miniGlyph(mg.g, 0, 0, 26, q ? COL.gQ : COL.gA, 1.2);
      // the avatars: the visitor (blue, top hat) asks, a gold genius answers
      const ax = q ? -BW / 2 - 38 : BW / 2 + 38, ay = BH / 2 - 16;
      paint(ellPts(ax, ay, 22, 22, 16), { wash: q ? COL.vis : COL.gold, ink: PAL.ink, sw: .6 });
      if (q) { paint(rectPts(ax - 10, ay - 42, 20, 24, .5), { wash: PAL.ink, ink: null }); paint(rectPts(ax - 17, ay - 22, 34, 6, .5), { wash: PAL.ink, ink: null }); }
      else paint([[ax - 16, ay - 16], [ax + 16, ay - 16], [ax + 2, ay - 52]], { wash: PAL.violet, ink: PAL.ink, sw: .5 });
      paint(ellPts(ax - 7, ay - 2, 3, 4, 8), { wash: PAL.ink, ink: null }); paint(ellPts(ax + 7, ay - 2, 3, 4, 8), { wash: PAL.ink, ink: null });
      pop();
    }
  }
  function shelves(t) {
    if (!vis(WL1, TOP1, WR0, GY)) return;
    const vx0 = Math.max(WL1, VIEW.x0 - 20), vx1 = Math.min(WR0, VIEW.x1 + 20), vy0 = Math.max(TOP1, VIEW.y0 - 20), vy1 = Math.min(GY, VIEW.y1 + 20);
    flat(box(vx0, vy0, vx1 - vx0, vy1 - vy0), COL.cubby);
    const CWd = 150, RH = 150, bookBox = [BOOK.cx - BOOK.pw - 30, BOOK.top - 20, BOOK.cx + BOOK.pw + 30, BOOK.bot + 20];
    for (let j = 1; TOP1 + j * RH <= GY - 60; j++) {
      const py = TOP1 + j * RH;
      if (py < VIEW.y0 - 30 || py - RH > VIEW.y1 + 30) continue;
      for (let i = 0; i < 6; i++) {
        const cx0 = WL1 + i * CWd; if (cx0 + CWd < VIEW.x0 - 30 || cx0 > VIEW.x1 + 30) continue;
        if (cx0 > bookBox[0] && cx0 + CWd < bookBox[2] + 20 && py - RH > bookBox[1] && py < bookBox[3] + 150) continue;   // behind the book
        const n = 1 + Math.floor(hash(i * 13 + j * 7) * 2.4);
        for (let k = 0; k < n; k++) {
          const hx = hash(i * 31 + j * 17 + k * 5), cx = cx0 + 34 + k * 40 + hx * 12, rot = (hash(i * 3 + j * 11 + k) - .5) * .35 + (k === n - 1 && n > 1 ? .2 : 0), cy = py - 40;
          boilSeed(`sc${i}-${j}-${k}`);
          push(); translate(cx, cy); rotate(rot);
          paint(rectPts(-26, -38, 52, 76, .8), { wash: k % 2 ? COL.cardDk : COL.card, ink: PAL.ink, sw: .45 });
          if (VIEW.z > .8) miniGlyph(Math.floor(hx * NG), 0, -4, 17, (i + j + k) % 3 ? COL.gQ : COL.gA, .7);
          pop();
        }
      }
    }
    for (let i = 0; i <= 6; i++) { const x = WL1 + i * CWd; if (x > VIEW.x0 - 20 && x < VIEW.x1 + 20) flat(box(x - 7, vy0, 14, vy1 - vy0), COL.woodDk); }
    for (let j = 1; TOP1 + j * RH <= GY - 60; j++) {
      const py = TOP1 + j * RH; if (py < VIEW.y0 - 20 || py > VIEW.y1 + 20) continue;
      flat(box(vx0, py, vx1 - vx0, 14), COL.wood);
      edge([vx0, py], [vx1, py], .7, PAL.ink, 'plank' + j, 'inkfine');
    }
  }
  function lamp(t) {
    const L = LAMP.y - TOP1, sw = (.035 + .09 * frenzy(t)) * Math.sin(t * (1.6 + 2 * frenzy(t))), bx = LAMP.x + Math.sin(sw) * L, by = TOP1 + Math.cos(sw) * L;
    if (!vis(bx - 500, TOP1, bx + 500, by + 500)) return;
    edge([LAMP.x, TOP1], [bx, by - 34], .9, PAL.ink, 'cord');
    glow(bx, by, 600, '#FFCF7A', .55);
    boilSeed('shade');
    push(); translate(bx, by); rotate(-sw);
    paint([[-14, -42], [14, -42], [48, -8], [-48, -8]], { wash: '#6E5E54', ink: PAL.ink, sw: .8 });
    paint(ellPts(0, 6, 17, 19, 16), { wash: '#FFE9B0', ink: PAL.ink, sw: .6 });
    pop();
    glow(bx, by + 6, 110, '#FFF1C8', .9);
  }
  function desk(t) {
    if (!vis(DESK_X0 - 10, SURF - 10, DESK_X1 + 10, GY)) return;
    boilSeed('desk');
    paint(rectPts(DESK_X0 + 8, SURF + 10, 18, GY - SURF - 10, .8), { wash: COL.deskDk, ink: PAL.ink, sw: .8 });
    paint(rectPts(DESK_X1 - 30, SURF + 10, 18, GY - SURF - 10, .8), { wash: COL.deskDk, ink: PAL.ink, sw: .8 });
    paint(rectPts(DESK_X0 + 8, GY - 34, DESK_X1 - DESK_X0 - 30, 12, .6), { wash: COL.deskDk, ink: PAL.ink, sw: .6 });   // the shelf with the blanks
    for (let k = 0; k < 3; k++) paint(rectPts(DESK_X1 - 150 + k * 3, GY - 44 - k * 5, 90, 8, .4), { wash: COL.card, ink: PAL.ink, sw: .4 });
    paint(rectPts(DESK_X0, SURF, DESK_X1 - DESK_X0, 16, 1), { wash: COL.desk, ink: PAL.ink, sw: 1 });
    // ink pot
    paint(rrPts(DESK_X1 - 34, SURF - 26, 26, 26, 6), { wash: '#3C3446', ink: PAL.ink, sw: .6 });
  }
  function ledge(t) {
    if (!vis(LEDGE_X0 - 10, SURF - 10, WL0 + 10, GY)) return;
    boilSeed('ledge');
    paint([[WL0, SURF + 14], [WL0 - 70, SURF + 14], [WL0, SURF + 80]], { wash: COL.caseDk, ink: PAL.ink, sw: .8 });
    paint(rectPts(LEDGE_X0 + 20, SURF + 22, 90, 10, .4), { wash: COL.caseDk, ink: PAL.ink, sw: .5 });
    for (let k = 0; k < 2; k++) paint(rectPts(LEDGE_X0 + 26 + k * 3, SURF + 14 - k * 4, 80, 7, .4), { wash: COL.card, ink: PAL.ink, sw: .4 });
    paint(rectPts(LEDGE_X0, SURF, WL0 - LEDGE_X0, 16, 1), { wash: COL.case, ink: PAL.ink, sw: 1 });
  }
  // the page shapes, with a curl at the spine
  const pagePts = side => {
    const { cx, top, bot, pw } = BOOK, s = side === 'L' ? -1 : 1;
    return [[cx, top + 14], [cx + s * pw * .45, top - 4], [cx + s * pw, top + 4], [cx + s * pw, bot], [cx + s * pw * .5, bot - 8], [cx, bot + 6]];
  };
  function pageRows(s, side) {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const q = Math.floor(hash(s * 11.3 + r * 3.7 + (side === 'R' ? 1.9 : 0)) * NG); let a = (q * 7 + 11 + r) % NG; if (a === q) a = (a + 1) % NG;
      rows.push([q, a]);
    }
    const e = MATCH[s]; if (side === 'R' && e) rows[2] = [e.q, e.a];
    return rows;
  }
  function pageContent(s, side) {
    const { cx, top, pw } = BOOK, px0 = side === 'L' ? cx - pw : cx, full = VIEW.z > .95;
    pageRows(s, side).forEach(([q, a], r) => {
      const y = top + ROWS[r], xq = px0 + 62, xa = px0 + 190;
      if (!vis(px0, y - 60, px0 + pw, y + 60)) return;
      if (full) { glyph(q, xq, y, 32, COL.gQ, 1, `pg${s}${side}${r}q`); glyph(a, xa, y, 32, COL.gA, 1, `pg${s}${side}${r}a`); }
      else { boilSeed(`pm${s}${side}${r}`); miniGlyph(q, xq, y, 30, COL.gQ, 1.3); miniGlyph(a, xa, y, 30, COL.gA, 1.3); }
      boilSeed(`ar${s}${side}${r}`);
      inkLine([[px0 + 104, y], [px0 + 148, y]], .8, COL.arrow, 'inkfine', 0);
      inkLine([[px0 + 137, y - 9], [px0 + 149, y], [px0 + 137, y + 9]], .8, COL.arrow, 'inkfine', 0);
      if (r < 2) inkLine([[px0 + 26, y + 68], [px0 + pw - 26, y + 68]], .5, COL.rule, 'inkfine', 0);
    });
  }
  function book(t) {
    const { cx, top, bot, pw } = BOOK;
    if (!vis(cx - pw - 60, top - 60, cx + pw + 60, GY)) return;
    boilSeed('lectern');
    paint([[cx - 130, GY + 2], [cx + 130, GY + 2], [cx + 70, GY - 26], [cx - 70, GY - 26]], { wash: COL.woodDk, ink: PAL.ink, sw: 1 });
    paint(rectPts(cx - 28, bot + 20, 56, GY - bot - 40, 1), { wash: COL.woodDk, ink: PAL.ink, sw: 1 });
    paint([[cx - pw - 36, bot + 34], [cx + pw + 36, bot + 34], [cx + pw + 18, bot + 6], [cx - pw - 18, bot + 6]], { wash: COL.wood, ink: PAL.ink, sw: 1 });
    boilSeed('cover');
    paint(rectPts(cx - pw - 18, top - 12, 2 * pw + 36, bot - top + 32, 1.2), { wash: COL.cover, ink: PAL.ink, sw: 1.3 });
    for (const sd of ['L', 'R']) {                       // the thick page block under each page
      const s = sd === 'L' ? -1 : 1;
      boilSeed('block' + sd);
      paint([[cx, bot + 16], [cx + s * pw * .5, bot + 4], [cx + s * (pw + 8), bot + 12], [cx + s * (pw + 8), top + 14], [cx + s * pw, top + 4], [cx + s * pw, bot], [cx + s * pw * .5, bot - 8], [cx, bot + 6]], { wash: COL.pageDk, ink: PAL.ink, sw: .7 });
    }
    const done = flipsDone(t), started = flipsStarted(t);
    boilSeed('pageL'); paint(pagePts('L'), { wash: COL.page, ink: PAL.ink, sw: .9 });
    boilSeed('pageR'); paint(pagePts('R'), { wash: COL.page, ink: PAL.ink, sw: .9 });
    boilSeed('spine'); inkLine([[cx, top + 16], [cx, bot + 4]], .9, COL.arrow, 'inkfine', 0);
    pageContent(done, 'L');
    pageContent(started, 'R');
    matchFX(t);
    // pages in flight: the right page swings over the spine to the left
    for (const f of FLIPS) {
      const k = seg(t, f.t - f.h, f.t + f.h); if (k <= 0 || k >= 1) continue;
      const w = pw * Math.cos(Math.PI * k), lift = 60 * Math.sin(Math.PI * k); if (Math.abs(w) < 8) continue;
      boilSeed('flip' + f.t.toFixed(2));
      paint([[cx, top + 14], [cx + w * .5, top - 6 - lift], [cx + w, top - lift * .6], [cx + w, bot - lift * .4], [cx + w * .5, bot - 8 - lift * .5], [cx, bot + 6]], { wash: k < .5 ? COL.page : COL.pageDk, ink: PAL.ink, sw: .9 });
      for (let j = 0; j < 3; j++) inkLine([[cx + w * .2, top + 60 + j * 110], [cx + w * .8, top + 50 + j * 110 - lift * .3]], .5, COL.rule, 'inkfine', 0);
      inkLine(through([[cx + pw * .9, top - 30], [cx + pw * .3 * Math.cos(Math.PI * k), top - 70 - lift], [cx - pw * .6, top - 40]], 4).slice(0, Math.max(3, Math.round(10 * k))), .8, '#FFF5E2', 'dry', .4);
    }
  }
  // the matching row: rings and light, first around the question glyph, then around the answer
  function matchFX(t) {
    for (const e of EX) {
      if (e.final || t < e.fd - .05 || t > e.bk0 + .15) continue;
      const { cx, top } = BOOK, y = top + ROWS[2], xq = cx + 62, xa = cx + 190, one = e === EX[0];
      const kq = one ? seg(t, 6.4, 6.7) : seg(t, e.fd, e.fd + .15), ka = one ? seg(t, 7.72, 8.02) : seg(t, e.fd + .08, e.fd + .23);
      const ring = (x, k, key) => { if (k <= 0) return; glow(x, y, 120, '#FFD27A', .5 * k); boilSeed(key); const r = 52 * backOut(k); inkLine(ellPts(x, y, r, r * .85, 20).concat([[x + r, y]]), 1.6, PAL.ochre, 'ink', .5); };
      ring(xq, kq, 'rq'); ring(xa, ka, 'ra');
      if (ka > 0) for (let j = 0; j < 5; j++) { const a0 = j / 5 * TAU + .5, s = seg(t, (one ? 7.72 : e.fd + .08) + j * .04, (one ? 8.25 : e.fd + .45) + j * .04); sparkle(xa + Math.cos(a0) * 90 * easeOut(s), y + Math.sin(a0) * 70 * easeOut(s), 16, s); }
    }
  }
  function flapAngle(t) {
    let a = 0;
    for (const e of EX) {
      const xs = [];
      if (t >= e.fl && t < e.in1 + .05) xs.push(e.inX(t));
      if (t >= e.pu && t < e.out1 + .05) xs.push(e.outX(t));
      for (const x of xs) { const ov = Math.min(x + CW / 2, 482) - Math.max(x - CW / 2, 400); if (ov > 0) a = Math.max(a, 1.36 * clamp(ov / 18)); }
      for (const lv of [e.flapIn, e.flapOut]) if (lv != null && t > lv && t < lv + 1.2) a = Math.max(a, 1.36 * (1 - ease(seg(t, lv, lv + .14))) + .35 * spring(t, lv + .14, 5, 17));
    }
    return a;
  }
  // the box in section: walls, roof and plinth, a beige skin outside, the slot as a dark tunnel with brass mouths
  function walls(t) {
    if (!vis(WL0, TOP0, WR1, BOT1)) return;
    flat(box(WL0, TOP0, WL1 - WL0, HY0 - TOP0), COL.section); flat(box(WL0, HY1, WL1 - WL0, BOT1 - HY1), COL.section);
    flat(box(WR0, TOP0, WR1 - WR0, BOT1 - TOP0), COL.section);
    flat(box(WL0, TOP0, WR1 - WL0, TOP1 - TOP0), COL.section);
    flat(box(WL0, GY, WR1 - WL0, BOT1 - GY), COL.shell);
    flat(box(WL0, TOP0, 12, HY0 - TOP0), COL.shell); flat(box(WL0, HY1, 12, BOT1 - HY1), COL.shell);
    flat(box(WR1 - 12, TOP0, 12, BOT1 - TOP0), COL.shell); flat(box(WL0, TOP0, WR1 - WL0, 12), COL.shell);
    flat(box(WL0, HY0, WL1 - WL0, SLOT_H), COL.hole);
    flat(box(WL1, GY - 8, WR0 - WL1, 8), COL.floorIn);
    const ink = PAL.ink;
    edge([WL0, TOP0], [WL0, HY0], 1.2, ink, 'eL0'); edge([WL0, HY1], [WL0, BOT1], 1.2, ink, 'eL1');
    edge([WL1, TOP1], [WL1, HY0], 1, ink, 'eL2'); edge([WL1, HY1], [WL1, GY], 1, ink, 'eL3');
    edge([WR0, TOP1], [WR0, GY], 1, ink, 'eR0'); edge([WR1, TOP0], [WR1, BOT1], 1.2, ink, 'eR1');
    edge([WL0, TOP0], [WR1, TOP0], 1.2, ink, 'eT0'); edge([WL1, TOP1], [WR0, TOP1], 1, ink, 'eT1');
    edge([WL0, BOT1], [WR1, BOT1], 1.2, ink, 'eB'); edge([WL1, GY], [WR0, GY], 1, ink, 'eG');
    edge([WL0, HY0], [WL1, HY0], .9, ink, 'eH0'); edge([WL0, HY1], [WL1, HY1], .9, ink, 'eH1');
    if (vis(WL0 - 30, HY0 - 30, WL1 + 100, HY1 + 30)) {
      boilSeed('mouths');
      for (const x of [WL0 - 12, WL1 - 4]) { paint(rectPts(x, HY0 - 10, 16, 12, .5), { wash: COL.brass, ink: ink, sw: .6 }); paint(rectPts(x, HY1 - 2, 16, 12, .5), { wash: COL.brass, ink: ink, sw: .6 }); }
      const a = flapAngle(t), p0 = [WL1 + 4, HY0 + 2], p1 = [p0[0] + 80 * Math.sin(a), p0[1] + 80 * Math.cos(a)];
      boilSeed('flap'); paint(ribbon([p0, p1], 8, 7), { wash: COL.brass, ink: ink, sw: .6 });
    }
  }
  // the front panel rolls down like a shutter: ribbed, with a drive slot, a green light and a fan on its bottom rail
  function panel(t) {
    const k = panelK(t); if (k <= 0) return;
    const bounce = t > PANEL[1] ? 22 * Math.abs(spring(t, PANEL[1], 7, 20)) : 0, yb = lerp(TOP0 + 60, BOT1, k) - bounce;
    if (!vis(WL0, TOP0, WR1, yb)) return;
    flat(box(WL0 - 4, TOP0 + 6, WR1 - WL0 + 8, yb - TOP0 - 6), COL.case);
    for (let j = 1; j < 40; j++) { const y = yb - 190 - j * 58; if (y < TOP0 + 60) break; edge([WL0 + 30, y], [WR1 - 30, y], .6, COL.caseDk, 'rib' + j, 'inkfine'); }
    // the bottom rail
    const ry = yb - 190;
    boilSeed('rail');
    paint(rectPts(WL0 - 4, ry, WR1 - WL0 + 8, 190, 1), { wash: COL.case, ink: PAL.ink, sw: 1.2 });
    paint(rrPts(WL0 + 90, ry + 50, 420, 26, 12), { wash: '#3A3440', ink: PAL.ink, sw: .8 });
    paint(rrPts(WL0 + 90, ry + 104, 420, 26, 12), { wash: '#3A3440', ink: PAL.ink, sw: .8 });
    const fx = WR1 - 190, fy = ry + 95;
    paint(ellPts(fx, fy, 70, 70, 26), { wash: COL.caseDk, ink: PAL.ink, sw: 1 });
    for (let j = 0; j < 3; j++) { const a0 = t * 9 + j * TAU / 3; inkLine([[fx, fy], [fx + Math.cos(a0) * 30, fy + Math.sin(a0) * 30], [fx + Math.cos(a0 + .8) * 58, fy + Math.sin(a0 + .8) * 58]], 1, '#8A7D62', 'ink', .6); }
    const on = t > PANEL[1] + .25 && Math.sin(t * 9) > -.3;
    if (on) glow(WL0 + 580, ry + 64, 60, '#7EE08A', .8);
    paint(ellPts(WL0 + 580, ry + 64, 11, 11, 12), { wash: on ? COL.led : '#6E7A66', ink: PAL.ink, sw: .6 });
    for (const [x, y] of [[WL0 + 26, ry + 24], [WR1 - 26, ry + 24], [WL0 + 26, ry + 166], [WR1 - 26, ry + 166]]) paint(ellPts(x, y, 7, 7, 8), { wash: COL.caseDk, ink: PAL.ink, sw: .5 });
    edge([WL0 - 4, TOP0 + 6], [WL0 - 4, yb], 1.2, PAL.ink, 'pL'); edge([WR1 + 4, TOP0 + 6], [WR1 + 4, yb], 1.2, PAL.ink, 'pR');
    // the roller housing on top
    boilSeed('roller'); paint(rectPts(WL0 - 10, TOP0 - 6, WR1 - WL0 + 20, 60, 1), { wash: COL.caseDk, ink: PAL.ink, sw: 1.2 });
    // the slot's mouth stays open at the left edge
    boilSeed('mouth2'); paint(rrPts(WL0 - 14, HY0 + 2, 22, SLOT_H - 4, 8), { wash: COL.hole, ink: PAL.ink, sw: .7 });
    if (t > PANEL[1]) for (let j = 0; j < 8; j++) {          // dust as it lands
      const a = t - PANEL[1]; if (a > .8) break;
      const x = lerp(WL0, WR1, (j + .5) / 8) + (hash(j) - .5) * 60, r = (30 + 30 * hash(j + 4)) * (1 + a * 1.5);
      boilSeed('dust' + j); paint(ellPts(x, BOT1 - 10 - 40 * easeOut(a / .8), r, r * .6, 12), { wash: '#F1ECE0', washOp: 255 * (1 - a / .8), ink: null });
    }
  }
  function thought(t) {
    const k = backOut(seg(t, 14.3, 14.62)) * (1 - ease(seg(t, 19.2, 19.5)));
    if (k <= .02 || t > 19.5) return;
    const bx = VX + 45, by = GY - 410;
    if (!vis(bx - 200, by - 160, bx + 200, by + 220)) return;
    for (const [dx, dy, r] of [[-10, 215, 12], [10, 165, 19]]) { boilSeed('tb' + r); paint(ellPts(bx + dx * k, by + dy * k, r * k, r * k, 12), { wash: '#FFFDF6', ink: PAL.ink, sw: .8 }); }
    push(); translate(bx, by); scale(k);
    const P = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, bump = 1 + .1 * Math.abs(Math.sin(a * 4.5)); P.push([Math.cos(a) * 140 * bump, Math.sin(a) * 112 * bump]); }
    boilSeed('tbub'); paint(P, { wash: '#FFFDF6', ink: PAL.ink, sw: 1.1 });
    glow(0, 20, 150, '#FFE08A', .5);
    clawd(0, 78, 10, { col: COL.gold, dk: '#C9962E', lt: '#FFF0B8', eyes: 'shine', mouth: 'smile', hat: 'wizard', aL: 1.25 + .15 * Math.sin(t * 5), aR: -.5, noShadow: true, boilKey: 'genius', emote: 'bulb', emoteK: 1, emoteAge: t, sq: .04 * Math.sin(t * 6) });
    for (let j = 0; j < 3; j++) sparkle(-110 + j * 100, -70 + 40 * (j % 2), 16, frac(t * .9 + j * .33));
    pop();
  }

  // ---------- one frame ----------
  function frame(t, c, o = {}) {
    cam(c);
    const closed = panelK(t) >= 1, Cp = clawdAt(t), Vp = visitorAt(t), cards = cardsAt(t, Cp, Vp);
    outsideBG(t);
    cables(t);
    if (!closed) { shelves(t); lamp(t); book(t); desk(t); }
    walls(t);
    ledge(t);
    for (const c of cards) if (!c.held && !(closed && c.x > WL0 + 60)) card(c.x, c.y, c.rot, c.g, c.kind, c.gk, c.key, { mini: c.mini });
    // Clawd, with what he holds
    if (!closed) {
      clawd(Cp.x, GY, U, { ...Cp.o, boilKey: 'C' });
      for (const c of cards) if (c.held === 'C') card(c.x, c.y, c.rot, c.g, c.kind, c.gk, c.key);
      const e = exC(t);
      if (t > e.p0 - .03 && t < e.p1 + .05) { const [hx, hy] = armTip(Cp.x, GY, U, Cp.o, 'L'), k = paintK(e, t), [gx, gy] = glyphHead(e.a, k); brushTool(hx, hy, PAINT_X + gx * 24, REST_Y + gy * 24, COL.gA, 'brushC'); }
    }
    clawd(Vp.x, GY, VU, { ...Vp.o, boilKey: 'V' });
    for (const c of cards) if (c.held === 'V') card(c.x, c.y, c.rot, c.g, c.kind, c.gk, c.key);
    for (const e of EX) if (t > e.w0 - .03 && t < e.w1 + .05) { const [hx, hy] = armTip(Vp.x, GY, VU, Vp.o, 'L'), [gx, gy] = glyphHead(e.q, seg(t, e.w0, e.w1)); brushTool(hx, hy, LEDGE_X + gx * 24, REST_Y + gy * 24, COL.gQ, 'brushV'); }
    thought(t);
    panel(t);
    monitor(t);
    camEnd();
    if (o.whip) whipFX(...o.whip);
  }
  // speed streaks for a whip pan (dir ±1: sideways; 0: up and down)
  function whipFX(k, dir) {
    const a = Math.sin(Math.PI * clamp(k)); if (a < .05) return;
    for (let i = 0; i < 14; i++) {
      boilSeed('whip' + i);
      const L = 380 + 500 * hash(i + 3);
      if (dir) { const y = (i + .5) / 14 * H + jit(20), x = W / 2 + (hash(i) - .5) * W * .6; inkLine([[x - L / 2, y], [x + L / 2, y + jit(6)]], 2.6 * a, i % 5 ? '#FFFFFF' : PAL.ink, 'dry', 0); }
      else { const x = (i + .5) / 14 * W + jit(20), y = H / 2 + (hash(i) - .5) * H * .6; inkLine([[x, y - L / 2], [x + jit(6), y + L / 2]], 2.4 * a, i % 5 ? '#FFFFFF' : PAL.ink, 'dry', 0); }
    }
  }
  // the iris is the slot's own shape: a tall rounded opening
  function slotIris(x, y, r) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], PAL.ink, r < 3 ? null : rrPts(x - r * .6, y - r, r * 1.2, r * 2, r * .35));
  }

  // ---------- shots ----------
  const TWO = [430, GY - 247, 1.4], WIDE = [772, 880, .74], SCREEN = [850, 12, 1.8], VIS1 = [245, GY - 170, 2.05];
  // A 0–3.44: the hook: a card slides in through the slot; Clawd wakes; pull back on the room
  function shotA(t, lt) {
    let c;
    if (t < .5) c = [lerp(398, 440, ease(seg(t, 0, .5))), SY + 4, lerp(4.0, 3.7, seg(t, 0, .5))];
    else if (t < 1.25) c = mixCam([440, SY + 4, 3.7], [655, SY - 10, 2.55], ease(seg(t, .5, 1.25)));
    else if (t < 2.05) c = mixCam([655, SY - 10, 2.55], [655, GY - 150, 2.05], ease(seg(t, 1.25, 1.8)));
    else c = mixCam([655, GY - 150, 2.05], [850, 1170, 1.1], ease(seg(t, 2.05, 3.35)));
    frame(t, c);
    if (lt < .42) { const [sx, sy] = scr([(WL0 + WL1) / 2, SY], c); slotIris(sx, sy, lerp(0, 1500, ease(lt / .42))); }
  }
  // B 3.44–8.44: to the book, flipping, the match, the answer beside it
  function shotB(t) {
    const Cp = clawdAt(t);
    let c;
    if (t < 4.3) c = [Cp.x + 40, GY - 250, 1.6];
    else if (t < 5.95) c = mixCam([CX_B + 40, GY - 250, 1.6], [CX_B, GY - 330, 1.25], ease(seg(t, 4.3, 5.6)));
    else if (t < 6.25) c = mixCam([CX_B, GY - 330, 1.25], [BOOK.cx + 95, GY - 238, 2.9], ease(seg(t, 5.95, 6.25)));
    else if (t < 7.25) c = [BOOK.cx + 95 + 8 * (t - 6.25), GY - 238, 2.9 + .08 * (t - 6.25)];
    else c = mixCam([BOOK.cx + 103, GY - 238, 2.98], [BOOK.cx + 186, GY - 262, 3.3], ease(seg(t, 7.25, 7.95)));
    frame(t, c);
  }
  // C 8.44–11.25: whip back to the desk; the copy; the flick
  function shotC(t) {
    const close = [BOOK.cx + 186, GY - 262, 3.3], desk = [668, GY - 150, 2.1], near = [656, GY - 132, 2.4];
    let c, wk = null;
    if (t < 8.85) { const k = seg(t, 8.44, 8.85); wk = [k, -1]; c = mixCam(close, desk, ease(k)); }
    else if (t < 10.6) c = mixCam(desk, near, ease(seg(t, 8.85, 10.45)));
    else c = mixCam(near, [EX[0].outX(Math.min(t, 11.25)) - 10, SY + 4, 2.7], ease(seg(t, 10.6, 10.95)));
    frame(t, c, { whip: wk });
  }
  // D 11.25–15.63: outside: the answer arrives; the visitor reads, is delighted, imagines a genius
  function shotD(t) {
    let c;
    if (t < 11.85) c = [lerp(305, 268, ease(seg(t, 11.25, 11.85))), SY + 4, 2.6];
    else if (t < 13.0) c = mixCam([268, SY + 4, 2.6], VIS1, ease(seg(t, 11.85, 12.5)));
    else if (t < 14.2) c = mixCam(VIS1, [190, GY - 165, 2.4], ease(seg(t, 13.0, 13.6)));
    else c = mixCam([190, GY - 165, 2.4], [215, GY - 250, 1.72], ease(seg(t, 14.2, 14.9)));
    frame(t, c);
  }
  // E 15.63–19.38: the truth: Clawd has no idea; pull back through the wall to the two-shot
  function shotE(t) {
    let c;
    const med = t2 => [652 - 6 * (t2 - 15.625), GY - 165, 2.25 + .03 * (t2 - 15.625)];
    if (t < 17.8) c = med(t);
    else c = mixCam(med(17.8), TWO, ease(seg(t, 17.8, 19.0)));
    if (t > 19.0) c = [TWO[0], TWO[1], TWO[2] * (1 + .02 * (t - 19.0))];
    frame(t, c);
  }
  // F 19.38–28.13: the montage, three cuts per exchange, faster and faster
  function montCam(t) {
    let k = 1; for (let j = 1; j < EX.length; j++) if (!EX[j].final && t >= EX[j].S) k = j;
    const e = EX[k], T = e.S + e.V, alt = k % 2;
    if (t < T) { const l = t - e.S; return alt ? [VX + 70 + 10 * l, GY - 175, 2.0 + .06 * l] : [VX + 95 - 10 * l, GY - 160, 2.25 + .06 * l]; }
    if (t < T + .56 * e.C) { const l = t - T; return alt ? [CX_B - 40 + 14 * l, GY - 330, 1.38 + .05 * l] : [CX_B + 30 - 14 * l, GY - 290, 1.55 + .05 * l, .02]; }
    const l = t - T - .56 * e.C;
    return alt ? [676 - 10 * l, GY - 150, 2.15 + .08 * l, -.02] : [650 + 10 * l, GY - 168, 1.92 + .08 * l];
  }
  function shotF(t) { frame(t, montCam(t)); }
  // G 28.13–34.38: the two-shot again; pull back: the room is a box; the panel drops: a computer; the chat on its screen
  function shotG(t) {
    let c;
    if (t < 28.6) c = [TWO[0], TWO[1], TWO[2] * (1 + .03 * (t - 28.125))];
    else if (t < 31.9) c = mixCam([TWO[0], TWO[1], TWO[2] * 1.014], WIDE, ease(seg(t, 28.6, 30.9)));
    else c = mixCam(WIDE, SCREEN, ease(seg(t, 31.9, 33.0)));
    if (t > 33.0) c = [SCREEN[0], SCREEN[1] + 6 * (t - 33), SCREEN[2] * (1 + .02 * (t - 33))];
    if (t > PANEL[1] && t < PANEL[1] + .6) { const sh = shakeXY(t, 12 * Math.exp(-(t - PANEL[1]) * 7)); c = [c[0] + sh[0], c[1] + sh[1], c[2]]; }
    frame(t, c);
  }
  // H 34.38–40: crane down to the visitor; the next question (the opening glyph); into the slot; the slot-shaped iris shuts
  function shotH(t, lt) {
    let c, wk = null;
    const scr0 = [SCREEN[0], SCREEN[1] + 8.3, SCREEN[2] * 1.028];
    if (t < 35.15) { const k = ease(seg(t, 34.375, 35.15)); c = [lerp(scr0[0], VIS1[0], k), lerp(scr0[1], VIS1[1], k), scr0[2] * Math.pow(VIS1[2] / scr0[2], k) * (1 - .45 * Math.sin(Math.PI * k))]; wk = [seg(t, 34.375, 35.15), 0]; }
    else if (t < 38.1) c = mixCam(VIS1, [262, GY - 135, 2.45], ease(seg(t, 35.15, 37.9)));
    else { const k = ease(seg(t, 38.1, 39.5)); c = [lerp(262, WL0 - 4, k), lerp(GY - 135, SY, k), 2.45 * Math.pow(6 / 2.45, k)]; }
    frame(t, c, { whip: wk });
    if (t > 38.75) { const [sx, sy] = scr([WL0 - 4, SY], c); slotIris(sx, sy, kf(t, [[38.75, 1500], [39.75, 0]], easeIn)); }
  }

  shots([[0, shotA], [3.44, shotB], [8.44, shotC], [11.25, shotD], [15.625, shotE], [19.375, shotF], [28.125, shotG], [34.375, shotH]]);

  // a glyph sheet for checking the script (render with --loop=zglyphs)
  LOOPS.zglyphs = t => {
    VIEW = { x0: 0, x1: W, y0: 0, y1: H, z: 1 };
    for (let i = 0; i < NG; i++) { const x = 140 + (i % 4) * 270, y = 180 + Math.floor(i / 4) * 290; boilSeed('gs' + i); paint(rectPts(x - 110, y - 80, 220, 160, 1), { wash: COL.card, ink: PAL.ink, sw: .6 }); glyph(i, x, y, 60, i % 2 ? COL.gA : COL.gQ, 1, 'gg' + i); }
  };
  LOOPS.zglyphs.len = 1;
})();
