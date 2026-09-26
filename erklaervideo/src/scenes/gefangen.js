// gefangen.js: "Das Gefangenendilemma", 40 s, 9:16. The storyboard is STORYBOARD_gefangen.md.
// Two cells stacked in one tower, a thick stone slab between them and one iron pipe running through both. Two timelines
// of the same moment: round 1 (both press red: bolts, a big hourglass, tally marks) and round 2 (a knock on the pipe,
// both press green: a tiny hourglass, open gates, the stairwell in the sun), then a third round that rhymes with the
// first frame. Every frame is a pure function of (timeline, story time); the video maps its clock onto them, so the
// rewind is just story time running backwards.
(() => {
  // ---------- world ----------
  const U = 24;                                              // both Clawds' size unit
  const ROOF = 270, AC = 420, AF = 840, BC = 960, BF = 1380; // roof, cell A (ceiling, floor), cell B
  const CEIL = { A: AC, B: BC }, FLOOR = { A: AF, B: BF }, DY = BF - AF;
  const CL = 30, GX0 = 970, GX1 = 1060, GATE_H = 300, LIFT = 225;   // cell's left wall; the gate in the right wall
  const CLX = 430;                                           // where each Clawd stands
  const HOVER = .45, PRESS = -.5;                            // arm angles: paw over a button, paw on it
  const tipX = a => 4.9 + 2.2 * Math.cos(a);                 // arm tip x (in u) of the front view, |a| < .7
  const BTN_G = CLX - tipX(PRESS) * U, BTN_R = CLX + tipX(PRESS) * U;   // green under the left paw, red under the right
  const DOME_BASE = 2.3, DOME_RY = .95, DOME_DEPTH = .25, DOME_RX = 1.5;          // buttons (in u above the floor)
  const PIPE_R = .55 * U, PIPE_X = BTN_G;                    // the pipe rises from behind the green button
  const KNOCK_DX = -.25, KNOCK_A = 1.0;                      // lean and arm angle when the paw hits the pipe
  const HG_X = 112, WIN_X = 760;                             // hourglass spot, cell window
  const ST1 = 1830, LAND_X = 1430, LY = (AF + BF) / 2, MEET = 1620, BLD0 = -700, BLD1 = ST1 + 170;   // the stairwell
  const KY = { A: AF - 6.35 * U, B: BF - 6.35 * U }, V_PULSE = 880;   // knock height on the pipe, pulse speed
  const MID = (AF + BC) / 2;                                 // the middle of the slab

  const C = {
    sky: '#1E244C', dawn: '#F0B088', stone: '#34374A', stoneLn: '#252532', wall: '#636A82', wallDay: '#8C93AA',
    brick: ['#586077', '#6D7491', '#535A70'], floor: '#4A4F63', well: '#40455A', wellLit: '#CDA27F', stair: '#555A6E', stairLit: '#B68B6B',
    iron: '#34333F', ironLt: '#77758A', pipe: '#7D8C88', pipeLt: '#B3C2BC', pipeDk: '#56625E',
    red: '#D8394E', redPlate: '#A92C3F', redLit: '#FF7A86', green: '#46A85E', greenPlate: '#347D46', greenLit: '#9BF2AA',
    console: '#8E93A7', glass: '#D4E8EE', sand: '#E9B95C', wood: '#8A6446', cream: '#FFF8EC', chalk: '#ECE6D6', sun: '#FFD36A',
  };
  const BCOL = { col: '#E4AE45', dk: '#A6781E', lt: '#F7D88E' };   // Clawd B: golden, with a teal beanie

  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
  }
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  const inView = (x0, y0, x1, y1, m = 60) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  // flat colour for the big backgrounds, light shafts and irises (huge washes are slow on software WebGL)
  function flat(P, col, hole = null, a = 1) {
    noStroke(); const c = color(col); if (a < 1) c.setAlpha(255 * clamp(a)); fill(c);
    beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // keyframes with an easing per segment: [[t, v, easeIntoThisKey], ...]
  function kfe(t, K) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const [a, va] = K[i - 1], [b, vb, e = ease] = K[i]; return lerp(va, vb, e((t - a) / (b - a))); }
    return K[K.length - 1][1];
  }
  const bump = (s, t0, w) => Math.exp(-Math.pow((s - t0) / w, 2));
  const sparkle = (x, y, r, k, col = C.cream) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: col, washOp: 255 * (1 - k * k), ink: null }); };

  // ---------- the clock ----------
  const REW = [19.4, 21.0], R_TO = 10.3, END0 = 35.2;
  function story(t) {
    if (t < REW[0]) return { tl: 'bad', s: t };
    if (t < REW[1]) { const k = seg(t, ...REW); return { tl: 'bad', s: lerp(REW[0], R_TO, ease(k)), rew: Math.sin(Math.PI * k) }; }
    if (t < END0) return { tl: 'good', s: t };
    return { tl: 'end', s: t };
  }
  // round 1 (story time = video time)
  const SLAM = 10.9, RATTLE = [11.85, 12.15], BOLT = [12.15, 12.3];
  const BIG = { drop: [13.45, 13.75], flip: [13.95, 14.35], drain: [14.35, 19.3], h: 9.4 * U, left: .1 };
  const LAPSE = [14.6, 19.2];
  // round 2 (video time)
  const KA = [22.8, 23.1, 23.4, 23.55], KB = [24.8, 25.1, 25.4, 25.55];
  const GREEN = 27.55, SMALL = { drop: [27.9, 28.1], flip: [28.25, 28.5], drain: [28.5, 29.1], h: 3.2 * U, left: 0 };
  const OPEN = [29.3, 29.85], WALK = { A: [30.25, 32.85], B: [30.6, 33.0] }, FIVE = 33.15;
  // round 3 (video time): one knock each, timed so the two pulses meet in the middle of the slab
  const EKNOCK = { A: 36.78, B: 36.55 }, EMEET = EKNOCK.A + (MID - KY.A) / V_PULSE;
  // the thought bubbles (round 1)
  const BUB = {
    A: { pop: 2.85, door: [3.3, 3.55], walk: [3.45, 4.35], jail: 4.35, flip: [4.55, 4.85], end: 6.0 },
    B: { pop: 5.6, door: [5.75, 5.85], walk: [6.0, 6.75], jail: 5.8, flip: [6.3, 6.6], end: 8.0 },
  };

  const sunOf = (tl, s) => tl === 'good' ? ease(seg(s, 29.2, 30.4)) : 0;
  function dayOf(tl, s) {   // the time lapse: days flicker past the window
    if (tl !== 'bad') return 0;
    const k = seg(s, LAPSE[0], LAPSE[1]);
    return k > 0 && k < 1 ? (.5 - .5 * Math.cos(Math.pow(k, 1.25) * 5 * TAU)) * Math.min(1, k * 8, (1 - k) * 8) : 0;
  }
  function gateOf(who, tl, s) {
    const o = who === 'B' ? .06 : 0, g = { open: 0, bolt: -1, rattle: 0, boltT: 0 };
    if (tl === 'bad') {
      if (s > RATTLE[0] + o && s < RATTLE[1] + o) g.rattle = Math.sin(Math.PI * seg(s, RATTLE[0] + o, RATTLE[1] + o));
      if (s >= BOLT[0] + o) { g.bolt = easeIn(seg(s, BOLT[0] + o, BOLT[1] + o)); g.boltT = BOLT[1] + o; }
    }
    if (tl === 'good') g.open = ease(seg(s, OPEN[0] + o * 1.5, OPEN[1] + o * 1.5));
    return g;
  }
  function glassOf(who, tl, s) {
    const G = tl === 'bad' ? BIG : tl === 'good' ? SMALL : null, o = who === 'B' ? .06 : 0;
    if (!G || s < G.drop[0] + o) return null;
    const F = FLOOR[who], kd = easeIn(seg(s, G.drop[0] + o, G.drop[1] + o)), land = G.drop[1] + o;
    const y = lerp(CEIL[who] + G.h + 12, F, kd) - (s > land ? 10 * Math.abs(spring(s, land, 7, 20)) : 0);
    const kfl = seg(s, G.flip[0] + o, G.flip[1] + o), flipping = kfl > 0 && kfl < 1;
    const q = kfl < 1 ? 0 : lerp(1, G.left, ease(seg(s, G.drain[0] + o, G.drain[1] + o)));
    return { x: HG_X, y, h: G.h, rot: flipping ? Math.PI * backOut(kfl) : 0, q: flipping ? 0 : q, drain: kfl >= 1 && q > G.left + .001, pop: backOut(seg(s, G.drop[0] + o, G.drop[0] + o + .12)), land };
  }
  function knocksOf(tl) {
    if (tl === 'good') return [...KA.map(h => ({ who: 'A', t0: h })), ...KB.map(h => ({ who: 'B', t0: h }))];
    if (tl === 'end') return [{ who: 'A', t0: EKNOCK.A, stop: MID }, { who: 'B', t0: EKNOCK.B, stop: MID }];
    return [];
  }
  const litOf = (tl, s) => ({ red: tl === 'bad' && s >= SLAM ? 1 : 0, green: tl === 'good' && s >= GREEN ? 1 : 0 });

  // ---------- Clawds ----------
  const withB = keys => keys.map(([t, n, o]) => [t, n, { ...BCOL, ...(o || {}) }]);
  const MOOD = {
    bad: {
      A: [[0, 'nervous', { lookX: .7, lookY: .6 }], [2.55, 'thinking', { lookX: -.2, lookY: -1, emote: null }], [4.95, 'mischief', { lookX: .8, lookY: .5 }],
          [8.0, 'nervous', { lookX: 0, lookY: 1 }], [9.8, 'determined', { lookX: .6, lookY: .5 }], [11.05, 'hopeful', { lookX: 1, lookY: 0 }],
          [12.3, 'surprised', { lookX: 1 }], [12.9, 'sad', { lookX: .5, lookY: .5 }], [13.75, 'scared', { lookX: -1 }], [14.7, 'sad', { lookX: -.5, lookY: .2 }],
          [16.0, 'bored'], [17.2, 'sleepy'], [18.4, 'sad', { lookY: .6 }]],
      B: withB([[0, 'nervous', { lookX: .7, lookY: .6, seed: 3 }], [5.9, 'thinking', { lookX: -.2, lookY: -1, emote: null }], [6.95, 'mischief', { lookX: .8, lookY: .5 }],
          [8.0, 'nervous', { lookX: 0, lookY: -1 }], [9.95, 'determined', { lookX: .6, lookY: -.3 }], [11.1, 'hopeful', { lookX: 1 }],
          [12.35, 'surprised', { lookX: 1 }], [12.95, 'sad', { lookX: .5, lookY: .5 }], [13.8, 'scared', { lookX: -1 }], [14.8, 'sad'],
          [16.3, 'sleepy'], [17.6, 'bored'], [18.7, 'sad', { lookY: .6 }]]),
    },
    good: {
      A: [[0, 'determined', { lookX: .6, lookY: .5 }], [21.25, 'nervous', { lookX: .7, lookY: .6 }], [21.9, 'thinking', { lookX: -.2, lookY: 1, emote: null }],
          [22.4, 'determined', { lookX: -1, lookY: 0 }], [23.7, 'hopeful', { lookX: -.3, lookY: 1 }], [25.45, 'surprised', { lookX: -1 }], [25.95, 'happy'],
          [27.95, 'hopeful', { lookX: -1, lookY: .4 }], [29.35, 'starstruck', { lookX: 1 }], [30.2, 'excited'], [33.25, 'laugh'], [34.0, 'love']],
      B: withB([[0, 'determined', { lookX: .6, lookY: -.3 }], [21.3, 'nervous', { lookX: .7, lookY: .6, seed: 3 }], [23.45, 'surprised', { lookX: -1 }],
          [24.05, 'hopeful', { lookX: -1, lookY: -.6 }], [24.55, 'determined', { lookX: -1 }], [25.7, 'hopeful', { lookY: -1 }], [26.3, 'happy'],
          [27.95, 'hopeful', { lookX: -1, lookY: .4 }], [29.4, 'starstruck', { lookX: 1 }], [30.3, 'excited'], [33.3, 'laugh'], [34.05, 'love']]),
    },
    end: {
      A: [[0, 'neutral', { lookX: .7, lookY: .6 }], [36.1, 'thinking', { lookY: 1, emote: null }], [36.5, 'determined', { lookX: -1 }], [37.1, 'happy']],
      B: withB([[0, 'neutral', { lookX: .7, lookY: .6, seed: 3 }], [35.95, 'thinking', { lookY: -1, emote: null }], [36.3, 'determined', { lookX: -1 }], [37.15, 'happy']]),
    },
  };
  const tremble = (s, ph) => .04 * Math.sin(s * 31 + ph) + .025 * Math.sin(s * 53 + ph * 2);
  // the left arm knocking on the pipe: raise, then a fast hit (easeIn) on every knock
  function knockArm(s, K, base = .25) {
    const last = K[K.length - 1];
    if (s < K[0] - .32 || s > last + .4) return null;
    const keys = [[K[0] - .32, base], [K[0] - .14, 1.5]];
    K.forEach((h, i) => { const nx = K[i + 1]; keys.push([h, KNOCK_A, easeIn]); if (nx) keys.push([h + Math.min(.08, (nx - h) / 2), 1.38, easeOut]); });
    keys.push([last + .12, 1.35, easeOut], [last + .4, base]);
    return kfe(s, keys);
  }
  // walking out: along the floor, through the gate, down (A) or up (B) the stairs to the landing
  const PATH = { A: [[CLX, AF], [GX1, AF], [LAND_X, LY], [MEET + 3.8 * U, LY]], B: [[CLX, BF], [GX1, BF], [LAND_X, LY], [MEET - 3.8 * U, LY]] };
  const pathLen = P => P.slice(1).reduce((l, p, i) => l + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
  function pathAt(P, d) {
    for (let i = 1; i < P.length; i++) { const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (d <= L) return [lerp(P[i - 1][0], P[i][0], d / L), lerp(P[i - 1][1], P[i][1], d / L)]; d -= L; }
    return P[P.length - 1];
  }

  // Clawd's place and pose: { x, y, o, inCell }
  function pose(who, tl, s) {
    const m = emotions(s, MOOD[tl][who]), ph = who === 'A' ? 0 : 2.1;
    let x = CLX, y = FLOOR[who], dx = 0, aR = HOVER + tremble(s, ph), aL = null, sq = 0, dy = 0, view = 'front', flip = false, walk = null, inCell = true;
    let calm = 1;   // damps the emotions' sway and lean while a paw has to land exactly
    const hits = [];
    if (tl === 'bad') {
      const dip = who === 'A' ? .9 : 1.45, tempt = who === 'A' ? 4.95 : 6.95;
      aR -= .32 * Math.sin(Math.PI * seg(s, dip, dip + .55));                 // the paw sinks toward red, then jerks back
      aR -= .18 * ease(seg(s, tempt, tempt + .8));                            // tempted: the paw sinks
      if (s >= 8) aR = .3 + .07 * Math.sin(s * 37 + ph);                      // trembling close over red
      if (s >= 10.4) {
        aR = kfe(s, [[10.4, .3 + .07 * Math.sin(10.4 * 37 + ph)], [10.75, 1.3], [SLAM, PRESS, easeIn], [11.35, PRESS + .04], [11.8, -.1]]);
        sq += -.07 * Math.sin(Math.PI * seg(s, 10.4, 10.8)) + (s > SLAM ? .06 * Math.exp(-9 * (s - SLAM)) : 0);
        calm = 1 - bump(s, SLAM, .5);
      }
      const sit = ease(seg(s, 12.95, 13.6));
      if (sit > 0 && !(s > 13.7 && s < 14.7)) { sq += .1 * sit; aR = lerp(aR, .05, sit); aL = lerp(m.aL ?? .2, .05, sit); }
      else if (sit > 0) sq += .1 * sit;
    } else if (tl === 'good') {
      const K = who === 'A' ? KA : KB, t0 = who === 'A' ? 21.9 : 23.5, k0 = K[0];
      dx = kfe(s, [[k0 - .2, 0], [k0 - .05, KNOCK_DX], [K[3] + .1, KNOCK_DX], [K[3] + .4, 0]]);
      aR = s < t0 ? .3 + .07 * Math.sin(s * 37 + ph) : kfe(s, [[t0, .3], [t0 + .4, -.1]]);   // the paw leaves red
      aL = knockArm(s, K);
      if (s > K[3] + .4) aL = kfe(s, [[26.45, m.aL ?? .2], [26.8, HOVER], [27.3, HOVER + .03 * Math.sin(s * 9 + ph)], [27.45, 1.2], [GREEN, PRESS, easeIn], [27.9, PRESS + .04], [28.2, .1]]);
      hits.push(...K, GREEN);
      sq += s > GREEN ? .06 * Math.exp(-9 * (s - GREEN)) : 0;
      calm = (1 - bump(s, GREEN, .45)) * (1 - bump(s, (K[0] + K[3]) / 2, .6));
      // out of the cell, down or up the stairs, then the high five on the landing
      const [w0, w1] = WALK[who];
      if (s > w0 - .22) {
        const P = PATH[who], L = pathLen(P), d = L * ease(seg(s, w0, w1)), [px, py] = pathAt(P, d);
        x = px; y = py; dx = 0; inCell = false; calm = 0;
        if (s < w0) Object.assign(m, turn(s, w0 - .22, w0, 0, .25));
        view = s < w0 ? m.view : 'side'; flip = s < w0 ? m.flip : false;
        if (s > w0 && s < w1) { walk = d / (3.2 * U); dy += -.4 * Math.abs(Math.sin(walk * TAU)); m.dy = (m.dy || 0) * .35; }
        aR = m.aR; aL = m.aL;
        if (who === 'A' && s > w1) { const tn = turn(s, w1, w1 + .15, .25, -.25); view = tn.view; flip = tn.flip; m.smear = tn.smear; m.smearDir = 0; }
        if (s > FIVE - .2) {   // the high five: the near arm swings up, the paws meet between them
          view = 'side'; flip = who === 'A';
          aL = kfe(s, [[FIVE - .18, .3], [FIVE, 1.15, easeIn], [FIVE + .16, 1.25, easeOut], [FIVE + .5, .2]]);
          sq += s > FIVE ? .1 * Math.exp(-8 * (s - FIVE)) * Math.cos(18 * (s - FIVE)) : 0;
        }
      }
    } else {   // round 3: the paw leaves red, one knock, then the knocking paw settles over green
      const k0 = EKNOCK[who];
      dx = kfe(s, [[k0 - .25, 0], [k0 - .08, KNOCK_DX], [k0 + .35, KNOCK_DX], [k0 + .7, 0]]);
      aR = s < k0 - .5 ? HOVER + .5 * tremble(s, ph) : kfe(s, [[k0 - .5, HOVER], [k0 - .15, -.1]]);
      aL = knockArm(s, [k0]);
      if (s > k0 + .4) aL = kfe(s, [[k0 + .4, m.aL ?? .2], [37.7, HOVER]]) + (s > 37.7 ? .04 * Math.sin(s * 3 + ph) : 0);
      hits.push(k0);
      calm = 1 - bump(s, k0, .5);
    }
    for (const h of hits) if (s > h && s < h + .5 && inCell) sq += .05 * Math.exp(-14 * (s - h));
    const o = { ...m, view, flip, dx: dx + (m.dx || 0) * .5 * calm, rot: (m.rot || 0) * (inCell ? calm : .5), aR, sq: (m.sq || 0) + sq, dy: (m.dy || 0) + dy, walk };
    if (aL != null) o.aL = aL;
    if (who === 'B') o.hat = 'beanie';
    return { x, y, o, inCell };
  }
  // where an arm's tip lands, replicating clawd()'s transforms (see theseus.js)
  function armTip(x, y, u, o, which = 'L') {
    const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which) || V.arms[0];
    const [px, dir] = A, a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
    let lx, ly;
    if (dir === 0) { const r = .7 - a; lx = px * u + Math.cos(r) * 2.1 * u; ly = -4.2 * u + Math.sin(r) * 2.1 * u; }
    else { const r = dir < 0 ? a : -a, root = (px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u; lx = root + Math.cos(r) * dir * 2.2 * u; ly = -4.5 * u + Math.sin(r) * dir * 2.2 * u; }
    const sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
    lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35); ly *= (o.sy ?? 1) * (1 - sq);
    const c = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0);
    return [x + (o.dx || 0) * u + lx * c - ly * sn, y + (o.dy || 0) * u + lx * sn + ly * c];
  }
  // how far the paw pushes a button down (0..1): the dome gives way under the arm's lower edge
  function pressOf(P, who, bx) {
    if (!P.inCell) return 0;
    const [tx, ty] = armTip(P.x, P.y, U, P.o, bx < CLX ? 'L' : 'R');
    if (Math.abs(tx - bx) > 1.15 * U) return 0;
    return clamp((ty + .44 * U - (FLOOR[who] - (DOME_BASE + DOME_RY) * U)) / (DOME_DEPTH * U));
  }

  // ---------- background (flat colour only) ----------
  const TG = [];   // tally groups on a cell's back wall: [x, y below the ceiling, order]
  for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) {
    const x = 58 + i * 102 + (j % 2 ? 44 : 0) + (hash(i * 3 + j * 17) - .5) * 30, y = 40 + j * 84 + (hash(i * 11 + j * 5) - .5) * 14;
    if (x > PIPE_X - 80 && x < PIPE_X + 40) continue;
    if (x > WIN_X - 110 && x < WIN_X + 80 && y < 175) continue;
    if (x > GX0 - 70) continue;
    TG.push([x, y, hash(i * 7 + j * 13 + 1)]);
  }
  const TGS = { A: TG.slice().sort((a, b) => a[2] - b[2]), B: TG.slice().sort((a, b) => frac(a[2] + .37) - frac(b[2] + .37)) };

  function backdrop(tl, s, t) {
    const { x0, x1, y0, y1 } = VIEW, m = 80, X0 = x0 - m, X1 = x1 + m, Y0 = y0 - m, Y1 = y1 + m;
    const sun = sunOf(tl, s), d = dayOf(tl, s);
    flat(box(X0, Y0, X1 - X0, Y1 - Y0), mixCol(C.sky, C.dawn, sun * .8));
    if (sun < .95) for (let i = 0; i < 40; i++) {   // stars
      const sx = -900 + hash(i + 3) * 3400, sy = ROOF - 40 - hash(i + 40) * 1500; if (!inView(sx, sy, sx, sy)) continue;
      const tw = .55 + .45 * Math.sin(t * (1.4 + hash(i)) + i * 2);
      flat(starPts(sx, sy, (4 + 5 * hash(i + 7)) * (.6 + .4 * tw), .38, 4), '#FFF3D8', null, (.35 + .6 * tw) * (1 - sun));
    }
    if (Y1 > BF + 70) flat(box(X0, BF + 70, X1 - X0, Y1 - BF - 70), '#262734');
    // the tower, with battlements on the roof
    flat(box(BLD0, ROOF, BLD1 - BLD0, BF + 70 - ROOF), C.stone);
    if (inView(BLD0, ROOF - 50, BLD1, ROOF)) for (let x = BLD0 + 20; x < BLD1 - 40; x += 110) flat(box(x, ROOF - 44, 58, 46), C.stone);
    // the cells
    for (const w of ['A', 'B']) {
      const C0 = CEIL[w], F = FLOOR[w]; if (!inView(CL, C0, GX1, F)) continue;
      const wall = mixCol(C.wall, C.wallDay, .6 * d);
      flat(box(CL, C0, GX0 - CL, F - C0), wall);
      for (let r = 0; r < 7; r++) for (let i = 0; i < 9; i++) {   // loose bricks
        const hh = hash(r * 31 + i * 7 + (w === 'B' ? 500 : 0)); if (hh < .42) continue;
        const bw = 122, bh = 52, bx = CL + i * bw + (r % 2 ? 60 : 0) - 30, by = C0 + 6 + r * 60;
        if (bx < CL + 4 || bx + bw > GX0 - 4 || by + bh > F - 20) continue;
        const jj = k => (hash(r * 5 + i * 13 + k) - .5) * 7;
        flat([[bx + jj(1), by + jj(2)], [bx + bw - 10 + jj(3), by + jj(4)], [bx + bw - 10 + jj(5), by + bh + jj(6)], [bx + jj(7), by + bh + jj(8)]],
          mixCol(C.brick[Math.floor(hash(r + i * 3) * 3)], wall, .35 + .3 * d));
      }
      // window light on the wall and floor in the daytime
      if (d > .02) flat([[WIN_X - 60, C0 + 145], [WIN_X + 60, C0 + 145], [WIN_X - 60, F], [WIN_X - 330, F]], '#FFF0C8', null, .22 * d);
      flat(box(CL, F - 16, GX1 - CL, 16), C.floor);
      // the doorway: the stairwell shows through the bars
      flat(box(GX0, F - GATE_H, GX1 - GX0, GATE_H), mixCol('#262838', C.wellLit, sun));
      const g = gateOf(w, tl, s);
      if (g.open > 0) flat([[GX0, F - GATE_H + 20], [GX0 + 10, F], [GX0 - 520, F], [GX0 - 160, F - GATE_H * .5]], '#FFDDA8', null, .3 * g.open * Math.max(.4, sun));
    }
    // the stairwell: its wall, the two flights and the landing
    if (inView(GX1, AC, ST1, BF)) {
      flat(box(GX1, AC, ST1 - GX1, BF - AC), mixCol(C.well, C.wellLit, sun));
      const st = mixCol(C.stair, C.stairLit, sun);
      flat(flightTop(1).concat([[LAND_X, LY + 40], [GX1, AF + 40]]), st);
      flat([[GX1, BF], ...flightTop(2), [ST1, LY], [ST1, BF]], st);
      if (sun > .02) flat([[MEET - 65, LY - 380], [MEET + 65, LY - 380], [MEET + 60, LY], [MEET - 380, LY]], '#FFE6B4', null, .25 * sun);
    }
  }
  // the step profile of a flight, from the cell side to the landing: 1 = down from A, 2 = up from B
  function flightTop(n) {
    const P = [], steps = 8, y0 = n === 1 ? AF : BF, run = (LAND_X - GX1) / steps, rise = (LY - y0) / steps;
    P.push([GX1, y0]);
    for (let i = 0; i < steps; i++) { const x = GX1 + (i + 1) * run; if (n === 1) P.push([x, y0 + i * rise], [x, y0 + (i + 1) * rise]); else P.push([x - run, y0 + (i + 1) * rise], [x, y0 + (i + 1) * rise]); }
    return P;
  }

  // ---------- painted scenery ----------
  function masonry(sun) {
    boilSeed('mason');
    const ln = C.stoneLn;
    // the roof line and the slab: the thick wall between the two cells
    for (let x = CL - 60; x < GX1 + 40; x += 480) if (inView(x, ROOF - 50, x + 480, ROOF + 10)) inkLine([[x, ROOF + jit(2)], [Math.min(x + 480, GX1 + 40), ROOF + jit(2)]], 1, PAL.ink, 'ink', 0);
    if (inView(CL, AF, GX0, BC)) {
      for (let i = 0; i < 7; i++) {   // big blocks in the slab
        const bx = CL + 70 + i * 150 + (hash(i + 9) - .5) * 30;
        if (bx < GX0 - 20) inkLine([[bx, AF + 6 + (i % 2) * 58], [bx + jit(2), AF + 58 + (i % 2) * 58]], .8, ln, 'inkfine', 0);
      }
      inkLine([[CL, MID + 2], [GX0 * .5, MID - 2], [GX0, MID + 1]], .8, ln, 'inkfine', .4);
    }
    // cell outlines
    for (const w of ['A', 'B']) {
      const C0 = CEIL[w], F = FLOOR[w]; if (!inView(CL, C0, GX1, F)) continue;
      boilSeed('cellln' + w);
      inkLine([[CL, C0], [GX0 * .5, C0 + jit(1.5)], [GX0, C0]], 1.3, PAL.ink, 'ink', 0);
      inkLine([[CL, F], [GX0 * .5, F + jit(1.5)], [GX1, F]], 1.3, PAL.ink, 'ink', 0);
      inkLine([[CL, C0], [CL + jit(1.5), (C0 + F) / 2], [CL, F]], 1.3, PAL.ink, 'ink', 0);
      inkLine([[CL + 30, F - 16], [GX0 * .5, F - 16], [GX0, F - 16]], .6, mixCol(C.floor, PAL.ink, .5), 'inkfine', 0);
      for (let i = 0; i < 3; i++) {   // cracks
        const cx = 90 + hash(i + (w === 'B' ? 20 : 0)) * 780, cy = C0 + 30 + hash(i + 5) * 250;
        if (cx > PIPE_X - 40 && cx < PIPE_X + 40) continue;
        inkLine([[cx, cy], [cx + 14, cy + 20], [cx + 6, cy + 38], [cx + 18, cy + 56]], .6, mixCol(C.wall, PAL.ink, .45), 'inkfine', 0);
      }
    }
    // stairwell edges
    if (inView(GX1, AC, ST1, BF)) {
      boilSeed('stairln');
      inkLine(flightTop(1), 1.1, PAL.ink, 'ink', 0);
      inkLine([[GX1, AF + 40], [LAND_X, LY + 40]], .9, PAL.ink, 'ink', 0);
      inkLine(flightTop(2), 1.1, PAL.ink, 'ink', 0);
      inkLine([[LAND_X, LY], [ST1, LY]], 1.1, PAL.ink, 'ink', 0);
      inkLine([[ST1, AC], [ST1, LY]], 1, PAL.ink, 'ink', 0);
      inkLine([[GX1, AC], [ST1, AC]], 1, PAL.ink, 'ink', 0);
      sunWindow(sun);
    }
  }
  function sunWindow(sun) {
    const x = MEET, top = LY - 440, w = 140, h = 260;
    if (!inView(x - w, top - 30, x + w, top + h + 30)) return;
    const shape = (g) => { const P = []; for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; P.push([x + Math.cos(a) * (w / 2 + g), top + w / 2 + Math.sin(a) * (w / 2 + g)]); } return P.concat([[x + w / 2 + g, top + h + g], [x - w / 2 - g, top + h + g]]); };
    boilSeed('sunwin');
    paint(shape(14), { wash: mixCol('#4B4F63', '#9A7358', sun), ink: PAL.ink, sw: 1 });
    paint(shape(0), { wash: mixCol('#252E66', '#FBD9A4', sun), ink: PAL.ink, sw: .9 });
    if (sun > .02) {
      const sy = lerp(top + h - 24, top + 108, easeOut(sun));
      glow(x, sy, 260, '#FFCF7A', .9 * sun);
      paint(ellPts(x, sy, 34, 34, 18), { wash: mixCol('#FBD9A4', C.sun, sun), ink: null });
    } else paint(starPts(x + 26, top + 70, 9, .4, 4), { wash: '#FFF3D8', ink: null });
    for (const bx of [-24, 24]) paint(box(x + bx - 4, top + 4, 8, h - 4), { wash: C.iron, ink: null });
    paint(box(x - w / 2, top + h * .55, w, 8), { wash: C.iron, ink: null });
  }
  function cellWindow(who, d) {
    const C0 = CEIL[who], x = WIN_X, y = C0 + 38, w = 116, h = 100;
    boilSeed('win' + who);
    paint(rectPts(x - w / 2 - 12, y - 12, w + 24, h + 24, 1), { wash: '#4B5065', ink: PAL.ink, sw: .9 });
    paint(rectPts(x - w / 2, y, w, h, 1), { wash: mixCol('#232B5E', '#A6D2EE', d), ink: PAL.ink, sw: .7 });
    if (d > .5) { glow(x + 20, y + 30, 90, '#FFE6A0', (d - .5) * 1.2); paint(ellPts(x + 20, y + 30, 16, 16, 12), { wash: '#FFE39A', ink: null }); }
    else { paint(ellPts(x - 22, y + 28, 12, 12, 12), { wash: mixCol('#F4EBD0', '#A6D2EE', d * 2), ink: null }); paint(starPts(x + 26, y + 60, 6, .4, 4), { wash: '#FFF3D8', washOp: 255 * (1 - d * 2), ink: null }); }
    for (let i = 1; i < 4; i++) paint(box(x - w / 2 + i * w / 4 - 3, y, 6, h), { wash: C.iron, ink: null });
  }
  function tallies(who, n, t) {
    const C0 = CEIL[who], G = TGS[who];
    for (let g = 0; g * 5 < n && g < G.length; g++) {
      const [x, y] = G[g];
      boilSeed('tally' + who + g);
      for (let k = 0; k < 5 && g * 5 + k < n; k++) {
        const P = k < 4 ? [[x + k * 11 + jit(1.5), C0 + y], [x + k * 11 + 2 + jit(1.5), C0 + y + 44]] : [[x - 8, C0 + y + 36], [x + 42, C0 + y + 8]];
        inkLine(P, 1.25, C.chalk, 'inkfine', 0);
      }
    }
  }
  // the iron pipe through the whole tower
  function pipe() {
    const x = PIPE_X, r = PIPE_R, ya = ROOF - 60, yb = BF + 70;
    for (let y = ya; y < yb; y += 400) {
      const y2 = Math.min(y + 400, yb); if (!inView(x - r, y, x + r, y2)) continue;
      boilSeed('pipe' + y);
      paint(box(x - r, y - 1, 2 * r, y2 - y + 2), { wash: C.pipe, ink: null });
      paint(box(x - r * .45, y - 1, r * .35, y2 - y + 2), { wash: C.pipeLt, ink: null });
      inkLine([[x - r, y], [x - r, y2]], .9, PAL.ink, 'ink', 0);
      inkLine([[x + r, y], [x + r, y2]], .9, PAL.ink, 'ink', 0);
    }
    for (const fy of [AC, AF, BC, BF]) {   // flanges where it passes through stone
      if (!inView(x - r - 8, fy - 12, x + r + 8, fy + 12)) continue;
      boilSeed('flange' + fy);
      paint(rectPts(x - r - 7, fy - 9, 2 * r + 14, 18, .6), { wash: C.pipeDk, ink: PAL.ink, sw: .8 });
    }
  }
  // an hourglass standing on (x, yBase), h tall; q = sand left in the top bulb; rot for the flip
  function hourglass(G, key) {
    const { x, y: yBase, h, rot, q, drain } = G, w = h * .52, pl = h * .08, bh = h / 2 - pl, gw = w * .4, nk = h * .03;
    const hw = v => nk + (gw - nk) * Math.pow(Math.sin(Math.min(1, v * 1.12) * Math.PI / 2), .55);   // bulb half-width, v = 0 at the neck
    const side = (v0, v1, sgn, n = 8) => { const P = []; for (let i = 0; i <= n; i++) { const v = lerp(v0, v1, i / n); P.push([-hw(v), sgn * v * bh]); } return P; };
    boilSeed('hg' + key);
    push(); translate(x, yBase - h / 2); rotate(rot); scale(G.pop);
    const L = side(1, 0, -1).concat(side(0, 1, 1).slice(1)), glassP = L.concat(L.slice().reverse().map(([a, b]) => [-a, b]));
    paint(glassP, { wash: C.glass, ink: null });
    const top = q * .92, bot = (1 - q) * .92;
    if (top > .02) { const S = side(top, 0, -1); paint(S.concat(S.slice().reverse().map(([a, b]) => [-a, b])).concat([[0, -top * bh + 4]]), { wash: C.sand, ink: null }); }
    if (bot > .02) {
      const vl = 1 - bot, S = side(1, vl, 1);
      paint(S.concat([[0, vl * bh - h * .04]]).concat(S.slice().reverse().map(([a, b]) => [-a, b])), { wash: C.sand, ink: null });
    }
    if (drain) inkLine([[0, 0], [0, (1 - bot) * bh]], Math.max(.8, h * .012), C.sand, 'ink', 0);
    paint(glassP, { ink: PAL.ink, sw: .9 });
    inkLine([[-gw * .5, -bh * .7], [-gw * .62, -bh * .35]], .6, C.cream, 'inkfine', .3);
    for (const sx of [-1, 1]) paint(box(sx * (w / 2 - pl * .35) - pl * .25, -bh, pl * .5, 2 * bh), { wash: C.wood, ink: PAL.ink, sw: .7 });
    for (const sy of [-1, 1]) paint(rectPts(-w / 2, sy > 0 ? h / 2 - pl : -h / 2, w, pl, .5), { wash: C.wood, ink: PAL.ink, sw: .8 });
    pop();
  }
  // the console with its two buttons; lit = latched glow, press = how far the paw pushes each dome
  function consoleAt(who, press, lit, t, tempt) {
    const F = FLOOR[who];
    const btn = (bx, col, plate, litCol, p, L, sym, key) => {
      const base = F - DOME_BASE * U, pw = 2.3 * U;
      boilSeed('btn' + who + key);
      paint(rectPts(bx - pw / 2 - .25 * U, F - .42 * U, pw + .5 * U, .42 * U, .5), { wash: '#6E7386', ink: PAL.ink, sw: .8 });
      paint(rectPts(bx - pw / 2, base + .3 * U, pw, F - base - .72 * U, .6), { wash: C.console, ink: PAL.ink, sw: .9 });
      paint(rectPts(bx - .82 * U, F - 1.9 * U, 1.64 * U, 1.36 * U, .5), { wash: plate, ink: PAL.ink, sw: .7 });
      const cy = F - 1.22 * U;
      if (sym === 'heart') paint(heartPts(bx, cy + .05 * U, .5 * U), { wash: C.cream, ink: PAL.ink, sw: .5 });
      else {   // a pointing hand, pointing at the other cell (A's down, B's up)
        push(); translate(bx, cy); rotate(who === 'A' ? Math.PI / 2 : -Math.PI / 2);
        const hh = .5 * U;
        paint(rrPts(-.75 * hh, -.5 * hh, 1 * hh, 1 * hh, .3 * hh), { wash: C.cream, ink: PAL.ink, sw: .5 });
        paint(rrPts(.1 * hh, -.46 * hh, 1.05 * hh, .34 * hh, .15 * hh), { wash: C.cream, ink: PAL.ink, sw: .5 });
        pop();
      }
      const ry = (DOME_RY - DOME_DEPTH * p) * U, g = Math.max(L, key === 'r' ? tempt : 0);
      if (g > .01) glow(bx, base - ry * .5, 3.2 * U, litCol, g);
      paint(rectPts(bx - pw / 2 - .3 * U, base, pw + .6 * U, .34 * U, .5), { wash: '#6E7386', ink: PAL.ink, sw: .8 });
      const D = []; for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; D.push([bx + Math.cos(a) * DOME_RX * U, base + Math.sin(a) * ry]); }
      paint(D, { wash: mixCol(col, litCol, L * .7), ink: PAL.ink, sw: .9 });
      paint(ellPts(bx - .5 * U, base - ry * .6, .32 * U, .13 * U, 8), { wash: C.cream, washOp: 200, ink: null });
    };
    btn(BTN_G, C.green, C.greenPlate, C.greenLit, press.g, lit.green, 'heart', 'g');
    btn(BTN_R, C.red, C.redPlate, C.redLit, press.r, lit.red, 'hand', 'r');
  }
  // the gate in the right wall: bars that slide up into the stone, and in round 1 a heavy bolt with a padlock
  function gate(who, g, s) {
    const F = FLOOR[who], top = F - GATE_H, lift = g.open * LIFT, sh = g.rattle * 4 * Math.sin(s * 90);
    boilSeed('gate' + who);
    push(); translate(sh, -lift);
    paint(rectPts(GX0 + 4, top, GX1 - GX0 - 8, GATE_H, .5), { ink: C.iron, sw: 2.2 });
    for (let i = 0; i < 3; i++) { const bx = GX0 + 22 + i * 23; paint(box(bx - 4, top, 8, GATE_H), { wash: C.iron, ink: PAL.ink, sw: .5 }); paint(box(bx - 2.5, top + 4, 2, GATE_H - 8), { wash: C.ironLt, ink: null }); }
    for (const fy of [.3, .72]) paint(box(GX0 + 6, top + GATE_H * fy - 6, GX1 - GX0 - 12, 12), { wash: C.iron, ink: PAL.ink, sw: .5 });
    pop();
    // the stone above the doorway covers the lifted bars
    paint(box(GX0 - 2, top - LIFT - 4, GX1 - GX0 + 4, LIFT + 4), { wash: C.stone, ink: null });
    inkLine([[GX0, top], [GX1, top]], 1.2, PAL.ink, 'ink', 0);
    inkLine([[GX0, CEIL[who]], [GX0, top]], 1.2, PAL.ink, 'ink', 0);
    if (g.bolt >= 0) {   // the bolt drops across the gate
      const by = F - 165 - 190 * (1 - g.bolt) + (s > g.boltT ? 6 * spring(s, g.boltT, 8, 26) : 0), sw = s > g.boltT ? .5 * spring(s, g.boltT, 3, 9) : 0;
      boilSeed('bolt' + who);
      for (const bx of [GX0 - 22, GX1 + 8]) paint(rectPts(bx, F - 180, 14, 40, .5), { wash: C.iron, ink: PAL.ink, sw: .7 });
      paint(rectPts(GX0 - 34, by - 13, GX1 - GX0 + 68, 26, .8), { wash: '#4A4858', ink: PAL.ink, sw: 1.1 });
      for (const rx of [GX0 - 20, GX1 + 20]) paint(ellPts(rx, by, 4, 4, 8), { wash: C.ironLt, ink: null });
      push(); translate((GX0 + GX1) / 2, by + 10); rotate(sw);
      inkLine(ellPts(0, 16, 13, 16, 14).slice(7, 15), 2.2, C.ironLt, 'ink', .5);
      paint(rrPts(-17, 22, 34, 30, 6), { wash: '#C9A14A', ink: PAL.ink, sw: .8 });
      paint(ellPts(0, 34, 3.5, 5, 8), { wash: PAL.ink, ink: null });
      pop();
    }
  }
  function cellProps(who, tl, s, t, P) {
    const C0 = CEIL[who], F = FLOOR[who];
    if (!inView(CL, C0 - 30, GX1 + 60, F + 40)) return;
    cellWindow(who, dayOf(tl, s));
    const n = tl === 'bad' ? Math.floor(TG.length * 5 * Math.pow(seg(s, LAPSE[0] + .1, LAPSE[1] - .15), 1.15)) : 0;
    if (n > 0) tallies(who, n, t);
    const G = glassOf(who, tl, s);
    if (G) hourglass(G, who);
    const lit = litOf(tl, s), tempt = (tl !== 'good' && !lit.red) ? .28 + .22 * pulse(t, 3) : 0;
    consoleAt(who, { g: pressOf(P, who, BTN_G), r: pressOf(P, who, BTN_R) }, { red: lit.red * (.75 + .25 * pulse(t, 4)), green: lit.green * (.8 + .2 * pulse(t, 4)) }, t, tempt);
    gate(who, gateOf(who, tl, s), s);
  }

  // ---------- the thought bubble: the tempting outcome ----------
  function bubble(who, tl, s) {
    const B = BUB[who]; if (tl !== 'bad' || s < B.pop || s >= B.end) return;
    const F = FLOOR[who], bx = CLX - 40, by = F - 13.7 * U;
    if (!inView(bx - 220, by - 140, bx + 220, F)) return;
    [[CLX + 10, F - 8.9 * U, 8], [CLX - 6, F - 9.9 * U, 12], [CLX - 26, F - 11.1 * U, 17]].forEach(([x, y, r], i) => {
      const k = backOut(seg(s, B.pop + i * .05, B.pop + i * .05 + .12)); if (k < .02) return;
      boilSeed('trail' + who + i); paint(ellPts(x, y, r * k, r * k, 12), { wash: C.cream, ink: PAL.ink, sw: .9 });
    });
    const k = backOut(seg(s, B.pop + .15, B.pop + .4)); if (k < .02) return;
    push(); translate(bx, by); scale(k);
    boilSeed('bubble' + who);
    const P = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, b = 1 + .075 * Math.abs(Math.sin(a * 5.5)); P.push([Math.cos(a) * 208 * b, Math.sin(a) * 118 * b]); }
    paint(P, { wash: C.cream, ink: PAL.ink, sw: 1.3, curv: .3 });
    const other = who === 'A' ? 'B' : 'A', look = w => w === 'B' ? { ...BCOL, hat: 'beanie' } : {};
    // left: my gate opens, the sun, and me walking out
    boilSeed('panelL' + who);
    paint(rrPts(-182, -84, 174, 152, 20), { wash: '#FBE3A6', ink: PAL.ink, sw: .7 });
    paint(box(-178, 48, 166, 16), { wash: '#9CC57E', ink: null });
    paint(starPts(-48, -30, 44, .62, 10, s * .8), { wash: '#F6BE4A', ink: null });
    paint(ellPts(-48, -30, 22, 22, 16), { wash: C.sun, ink: PAL.ink, sw: .5 });
    paint(box(-178, -46, 42, 94), { wash: '#3A3D50', ink: PAL.ink, sw: .6 });
    const lift = 70 * ease(seg(s, ...B.door));
    for (let i = 0; i < 3; i++) inkLine([[-170 + i * 13, -46], [-170 + i * 13, 48 - lift]], 1.2, '#8A8898', 'ink', 0);
    const wk = seg(s, ...B.walk), mx = lerp(-157, -96, ease(wk));
    const mm = wk < 1 ? { ...feel('excited', s), view: 'side', walk: (mx + 157) / 14, emote: null } : { ...feel('excited', s), aL: 1.3 + .2 * Math.sin(s * 14), aR: 1.3 - .2 * Math.sin(s * 14), emote: null };
    clawd(mx, 48, 5, { ...mm, ...look(who), noShadow: true, boilKey: 'ms' + who });
    // right: the other one behind bars, next to a huge hourglass
    const kj = backOut(seg(s, B.jail, B.jail + .25));
    if (kj > .02) {
      push(); translate(95, -8); scale(kj); translate(-95, 8);
      boilSeed('panelR' + who);
      paint(rrPts(8, -84, 174, 152, 20), { wash: '#8C93A8', ink: PAL.ink, sw: .7 });
      clawd(62, 50, 5, { ...feel('sad', s), emote: null, ...look(other), noShadow: true, boilKey: 'mo' + who });
      boilSeed('bars' + who);
      for (let i = 0; i < 5; i++) inkLine([[24 + i * 19, -60], [24 + i * 19, 60]], 1.2, C.iron, 'ink', 0);
      inkLine([[18, -60], [110, -60]], 1.4, C.iron, 'ink', 0);
      const kf2 = seg(s, ...B.flip);
      hourglass({ x: 146, y: 60, h: 112, rot: kf2 > 0 && kf2 < 1 ? Math.PI * backOut(kf2) : 0, q: kf2 >= 1 ? 1 - .25 * seg(s, B.flip[1], B.end) : 0, drain: kf2 >= 1, pop: 1 }, 'b' + who);
      pop();
    }
    pop();
  }

  // ---------- knocks travelling along the pipe ----------
  function pulses(tl, s) {
    const x = PIPE_X, r = PIPE_R;
    for (const [i, k] of knocksOf(tl).entries()) {
      const a = s - k.t0; if (a < 0) continue;
      const y0 = KY[k.who], dir = k.who === 'A' ? 1 : -1, yEnd = k.stop ?? KY[k.who === 'A' ? 'B' : 'A'], T = Math.abs(yEnd - y0) / V_PULSE;
      if (a < .22) {   // the knock: a flash and impact lines on the far side of the pipe
        const q = a / .22;
        boilSeed('hit' + i);
        glow(x + r, y0, 60, '#FFE9B8', .8 * (1 - q));
        for (const d of [-1, 0, 1]) inkLine([[x - r - 8, y0 + d * 12], [x - r - 8 - 22 * easeOut(q) - 6, y0 + d * (12 + 14 * q)]], 1.6 * (1 - q), C.cream, 'ink', 0);
      }
      if (a < T) {
        const y = y0 + dir * V_PULSE * a, al = 1 - .35 * a / T;
        if (!inView(x - 60, y - 60, x + 60, y + 60)) continue;
        glow(x, y, 80, '#FFE3A0', .85 * al);
        boilSeed('ring' + i);
        for (const [dd, w] of [[0, 1], [-dir * 18, .55]]) {
          const P = []; for (let j = 0; j <= 10; j++) { const b = j / 10 * Math.PI; P.push([x - Math.cos(b) * (r + 9), y + dd + Math.sin(b) * 6]); }
          inkLine(P, 2.4 * al * w, '#FFF3D0', 'ink', .5);
        }
      } else if (!k.stop && a < T + .4) {   // it arrives: the pipe hums at the other end
        const q = (a - T) / .4;
        boilSeed('hum' + i);
        for (const sd of [-1, 1]) for (const j of [0, 1]) {
          const ox = x + sd * (r + 10 + j * 10 + 6 * q), P = [[ox, yEnd - 16 - j * 6], [ox + sd * 5, yEnd], [ox, yEnd + 16 + j * 6]];
          inkLine(P, 1.4 * (1 - q), C.cream, 'ink', .6);
        }
      }
    }
    if (tl === 'end' && s > EMEET && s < EMEET + 3.5) {   // the two knocks meet inside the wall: a little heart
      const a = s - EMEET, k = backOut(seg(a, 0, .3)), fade = 1 - seg(a, 2.6, 3.5);
      glow(x, MID, 130, '#FFB0B8', .9 * fade);
      boilSeed('meetheart');
      paint(heartPts(x, MID - 4 * Math.sin(a * 3), 26 * k * (1 + .08 * pulse(s))), { wash: '#E2476E', washOp: 255 * fade, ink: fade > .5 ? PAL.ink : null, sw: .9 });
      for (let j = 0; j < 6; j++) { const b = j / 6 * TAU; sparkle(x + Math.cos(b) * 80 * easeOut(a / .6), MID + Math.sin(b) * 50 * easeOut(a / .6), 14, a / .6); }
    }
  }

  // ---------- one frame ----------
  function frame(t, c, o = {}) {
    const { tl, s, rew } = story(t);
    cam(c);
    const P = { A: pose('A', tl, s), B: pose('B', tl, s) }, sun = sunOf(tl, s);
    backdrop(tl, s, t);
    masonry(sun);
    pipe();
    for (const w of ['A', 'B']) cellProps(w, tl, s, t, P[w]);
    // press effects: a red flash in round 1, hearts rising from green in round 2
    for (const w of ['A', 'B']) {
      const F = FLOOR[w];
      if (tl === 'bad' && s > SLAM && s < SLAM + .5) { const a = (s - SLAM) / .5; for (let j = 0; j < 5; j++) { const b = -Math.PI / 2 + (j - 2) * .5; sparkle(BTN_R + Math.cos(b) * 70 * easeOut(a), F - 3.6 * U + Math.sin(b) * 60 * easeOut(a), 16, a, '#FFB0A0'); } }
      if (tl === 'good' && s > GREEN && s < GREEN + 1.1) for (let j = 0; j < 3; j++) {
        const a = seg(s, GREEN + j * .12, GREEN + j * .12 + .9); if (a <= 0 || a >= 1) continue;
        boilSeed('gheart' + w + j);
        paint(heartPts(BTN_G + (j - 1) * 26 + 10 * Math.sin(a * 6 + j), F - 3.8 * U - 150 * easeOut(a), 13 * backOut(seg(a, 0, .3))), { wash: '#E2476E', washOp: 255 * (1 - a * a), ink: a < .6 ? PAL.ink : null, sw: .6 });
      }
    }
    for (const w of ['A', 'B']) { const p = P[w]; if (inView(p.x - 8 * U, p.y - 12 * U, p.x + 8 * U, p.y + U)) clawd(p.x, p.y, U, { ...p.o, boilKey: w }); }
    if (tl === 'good' && s > FIVE && s < FIVE + .5) {   // the high five
      const a = (s - FIVE) / .5, hx = MEET, hy = LY - 5.1 * U;
      glow(hx, hy, 150, '#FFE0A0', 1 - a);
      boilSeed('five'); paint(starPts(hx, hy, 34 * backOut(seg(a, 0, .3)) * (1 - a * .5), .35, 6, a), { wash: C.cream, washOp: 255 * (1 - a * a), ink: PAL.ink, sw: .7 });
      for (let j = 0; j < 6; j++) { const b = j / 6 * TAU + .3; sparkle(hx + Math.cos(b) * 90 * easeOut(a), hy + Math.sin(b) * 70 * easeOut(a), 14, a); }
    }
    pulses(tl, s);
    for (const w of ['A', 'B']) bubble(w, tl, s);
    camEnd();
    if (tl === 'bad' && s > SLAM && s < SLAM + .35) { flushBrush(); flat(box(-60, -60, W + 120, H + 120), '#FF4A5A', null, .3 * (1 - (s - SLAM) / .35)); }
    if (rew) rewindFX(rew);
    if (o.iris != null) iris2(o.iris);
  }
  function rewindFX(k) {
    flushBrush();
    flat(box(-60, -60, W + 120, H + 120), '#7F9BE0', null, .16 * k);
    for (let i = 0; i < 18; i++) {
      const y = (i + .5) / 18 * H + jit(24), L = 380 + 520 * hash(i + 3), x = W / 2 + (hash(i) - .5) * W * .7;
      boilSeed('rew' + i);
      inkLine([[x - L / 2, y], [x + L / 2, y + jit(8)]], 3.4 * k, i % 3 ? C.cream : '#5F7FC0', 'dry', .2);
    }
  }
  function iris2([x, y, r]) {
    flushBrush();
    flat(box(-60, -60, W + 120, H + 120), PAL.ink, r < 3 ? null : ellPts(x, y, r, r, 48));
  }

  // ---------- shots ----------
  const SPLIT = [470, 1014, 1.35];
  const splitCam = (t, dz = 0) => [SPLIT[0] + 10 * Math.sin(t * .5), SPLIT[1] + 6 * Math.sin(t * .37), SPLIT[2] + dz];
  const GATES = [640, 1014, 1.25];
  const IRIS_AT = [PIPE_X, MID];   // the pipe inside the slab: the loop closes and opens here
  const kick = (t, t0, amt, k = 8) => t > t0 ? shakeXY(t, amt * Math.exp(-k * (t - t0))) : [0, 0];

  // A 0–2.3: the hook, both paws over red
  function shotA(t) {
    const c = splitCam(t, .06 * ease(t / 2.3));
    frame(t, c, t < .45 ? { iris: [...scr(IRIS_AT, c), lerp(0, 1700, easeIn(t / .45))] } : {});
  }
  // B 2.3–6.0 and C 6.0–8.0: the temptation in A, then (match cut) the same thought in B
  const bubbleCam = (t, who) => { const k = t - 2.3; return [CLX - 20 + 5 * k, FLOOR[who] - 112 - 4 * k, 2.0 + .03 * k]; };
  function shotB(t) { frame(t, bubbleCam(t, 'A')); }
  function shotC(t) { frame(t, bubbleCam(t, 'B')); }
  // D 8.0–10.4: match cuts between the two faces, faster and faster
  const CUTS = [8.0, 8.62, 9.12, 9.54, 9.88, 10.16, 10.4];
  function shotD(t) {
    let n = 0; while (n + 2 < CUTS.length && t >= CUTS[n + 1]) n++;
    const who = n % 2 ? 'B' : 'A', lt = t - CUTS[n];
    frame(t, [CLX + 3.0 * U + 10 * lt, FLOOR[who] - 5.1 * U, 2.4 + n * .1 + .08 * lt, (n % 2 ? -1 : 1) * (.015 + .01 * n)]);
  }
  // E 10.4–13.3: both slam red; they look to their gates; the bolts drop
  function shotE(t) {
    let c = mixCam(splitCam(t), GATES, ease(seg(t, 11.2, 11.9)));
    const s1 = kick(t, SLAM, 14), s2 = kick(t, BOLT[1], 12);
    c = [c[0] + s1[0] + s2[0], c[1] + s1[1] + s2[1], c[2] + (t > SLAM ? .07 * Math.exp(-5 * (t - SLAM)) : 0)];
    frame(t, c);
  }
  // F 13.3–19.4: the big hourglasses; the time lapse
  function shotF(t) {
    let c = mixCam(GATES, [430, 1014, 1.3], ease(seg(t, 13.3, 13.85)));
    if (t > 14.5) c = mixCam(c, [470, 1014, 1.45], ease(seg(t, 14.5, 19.4)));
    const sh = kick(t, BIG.drop[1], 12);
    frame(t, [c[0] + sh[0], c[1] + sh[1], c[2]]);
  }
  // G 19.4–21.0: rewind
  function shotG(t) {
    const k = seg(t, ...REW), c = mixCam([470, 1014, 1.45], splitCam(t), ease(k));
    frame(t, [c[0], c[1], c[2] * (1 - .06 * Math.sin(Math.PI * k)), -.05 * Math.sin(Math.PI * k)]);
  }
  // H 21.0–26.4: déjà vu; A knocks, the pulses travel down; B knocks back, the pulses travel up
  const KN = w => [350, FLOOR[w] - 190, 1.85];
  function shotH(t) {
    let c;
    if (t < 21.8) c = splitCam(t);
    else if (t < 23.0) c = [KN('A')[0] + 8 * (t - 21.8), KN('A')[1], KN('A')[2] + .03 * (t - 21.8)];
    else if (t < 24.9) c = mixCam([KN('A')[0] + 9.6, KN('A')[1], KN('A')[2] + .036], [KN('B')[0], KN('B')[1], KN('B')[2]], ease(seg(t, 23.0, 23.6)));
    else c = mixCam([KN('B')[0], KN('B')[1], KN('B')[2]], [KN('A')[0], KN('A')[1], KN('A')[2] + .05], ease(seg(t, 25.05, 25.6)));
    if (t > 23.6 && t < 25.05) c = [c[0] + 6 * (t - 23.6), c[1], c[2] + .02 * (t - 23.6)];
    frame(t, c);
  }
  // I 26.4–29.1: both press green; the tiny hourglass
  function shotI(t) {
    const sh = kick(t, GREEN, 6);
    const c = mixCam(splitCam(t, .04 * seg(t, 26.4, 29.1)), [400, 1014, 1.38], ease(seg(t, 27.75, 28.2)));   // over to the tiny hourglass
    frame(t, [c[0] + sh[0], c[1] + sh[1], c[2]]);
  }
  // J 29.1–35.2: the gates open; the stairwell; they meet on the landing
  function shotJ(t) {
    const wide = [1180, 1000, .62], land = [MEET, LY - 140, 1.85];
    let c = mixCam([400, 1014, 1.38], GATES, ease(seg(t, 29.1, 29.7)));
    if (t > 30.25) c = mixCam(GATES, wide, ease(seg(t, 30.25, 31.6)));
    if (t > 31.75) c = mixCam(wide, land, ease(seg(t, 31.75, 32.9)));
    if (t > 32.9) c = [MEET + 8 * Math.sin((t - 32.9) * .8), LY - 140, 1.85 + .06 * (t - 32.9)];
    frame(t, c);
    if (t > 34.9) brushWipe((t - 34.9) / .6);
  }
  // K 35.2–40: the rhyme: paws over red again, one knock each, paws to green, iris
  function shotK(t, lt) {
    const c = splitCam(t, .06 * ease(seg(t, 35.2, 38.7)));
    frame(t, c, t > 38.7 ? { iris: [...scr(IRIS_AT, c), lerp(1700, 0, easeIn(seg(t, 38.7, 39.85)))] } : {});
    if (lt < .3) brushWipe(.5 + lt / .6);
  }

  shots([[0, shotA], [2.3, shotB], [6.0, shotC], [8.0, shotD], [10.4, shotE], [13.3, shotF], [19.4, shotG], [21.0, shotH], [26.4, shotI], [29.1, shotJ], [35.2, shotK]]);
})();
