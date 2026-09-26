// block.js: "Das Blockuniversum", 36 s, 9:16. The storyboard is STORYBOARD_block.md.
// Clawd's life is a vertical film strip: every frame is one moment, and all of them exist at once (down = past,
// up = future). A light marks "now": only the lit frame is in colour and moving. Every frame has its own clock, which
// runs only while it is lit; an unlit frame is pale, its clock stands still and its linework doesn't boil. The light
// moves on one frame; the last push-in ends on the first frame's framing and pose, so the video loops.
(() => {
  // ---------- the strip ----------
  const PW = 720, PH = 820, GAP = 110, PITCH = PH + GAP, MARGIN = 150, HW = PW / 2 + MARGIN;   // HW: half the strip width
  const NF = 6, FA = 3, FB = 4;                    // frames 0 (baby) … 5 (old); the two party frames
  const FY = i => -i * PITCH;                      // a frame's centre (world y); the strip runs along x = 0
  const TM = 25.0, TW = 26.0, LOOP = 36;           // the light leaves A (A freezes mid-jump), B wakes up; video length
  const BG = '#232849', BASE = '#3A2F3A', BASE_LIT = '#80604C', HOLE = '#171A33', LEADER = '#463B45', EDGE = '#63525F';
  const WARM = '#FFE2A0', PALE = '#DAD4CA', PALE_K = .62;
  const BS_X = 2600, BS_DY = -2300;                // the light's source, up and to the right of the lit frame
  const STRIP_TOP = FY(NF) - PITCH / 2, STRIP_BOT = FY(-1) + PITCH / 2;

  // ---------- clocks ----------
  const litF = t => FA + ease(seg(t, TM, TM + .95));                                  // where the light is (frame index)
  const partyClock = (i, t) => i === FA ? Math.min(t, TM) : Math.max(t, TW) - LOOP;  // B's clock reaches 0 at the loop
  function paleOf(i, t) {
    if (i === FA) return PALE_K * ease(seg(t, TM + .08, TM + .7));
    if (i === FB) return PALE_K * (1 - ease(seg(t, TW - .5, TW + .05)));
    return PALE_K;
  }
  const frozenOf = (i, t) => i === FA ? t >= TM : i === FB ? t < TW : true;

  // ---------- camera ----------
  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r, z };
  }
  // camera keys are [cx, cy, zoom, rot]; zoom blends in log space, so pushes and pulls keep an even pace
  const mixCam = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), k)), lerp(a[3] || 0, b[3] || 0, k)];
  function camKeys(t, K) {
    let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
    if (i + 1 >= K.length) return K[i][1];
    return mixCam(K[i][1], K[i + 1][1], ease(seg(t, K[i][0], K[i + 1][0])));
  }
  // flat colour for the big areas (backdrop, film base, picture backgrounds): huge washes are slow on software WebGL
  function flat(P, col, hole = null, a = 255) {
    const c = color(col);
    noStroke(); fill(red(c), green(c), blue(c), a); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

  // ---------- inside a frame: its own clock, colour and boil ----------
  // Everything a frame paints goes through C(): an unlit frame is mixed toward PALE. While a frame is frozen, the boil
  // frame and T stand still, so its linework holds exactly like a still.
  let PK = 0, STILL = false;
  const C = c => PK > 0 ? mixCol(c, PALE, PK) : c;
  function inFrame(i, t, fn) {
    const pk = paleOf(i, t), frozen = frozenOf(i, t), sP = { ...PAL }, sB = BOILN, sT = T;
    PK = pk; STILL = frozen && pk > PALE_K - .01;
    if (pk > 0) for (const k in PAL) PAL[k] = mixCol(sP[k], PALE, k === 'ink' ? pk * .72 : pk);
    if (frozen) { BOILN = 7000 + i * 13; T = 1; }
    push(); translate(0, FY(i));
    try { fn(i, t); } finally { pop(); Object.assign(PAL, sP); PK = 0; STILL = false; BOILN = sB; T = sT; }
  }
  // Clawd's watercolour fills (shadow, body shading, arms, blush) cost as much far away as in a close-up. A small Clawd
  // in a still, pale frame is painted without them: flat wash and ink, and a thin wash for the shadow.
  function figure(x, y, u, o) {
    const px = u * VIEW.z;
    if (!(STILL && px < 22) && px >= 11) return clawd(x, y, u, o);
    const full = paint;
    paint = (pts, q = {}) => { if (q.fill) { if (!q.wash && !q.hatch) return; q = { ...q, fill: null }; } full(pts, q); };
    try {
      if (!o.noShadow) { boilSeed('sh ' + o.boilKey); full(ellPts(x, y + u * .15, u * 5.3, u * .9, 16), { wash: PAL.ink, washOp: 55, ink: null }); }
      clawd(x, y, u, { ...o, noShadow: true });
    } finally { paint = full; }
  }
  const LT = () => C('#F5B394');   // Clawd's light body colour (hard-coded in clawd.js, so pale it here)
  const lod = () => VIEW.z;        // how big a frame is on screen: small frames skip the fine detail
  const sparkle = (x, y, r, key) => { boilSeed(key); paint(starPts(x, y, r, .3, 4), { wash: C('#FFF5E2'), ink: null }); };

  // ---------- the frames ----------
  // Local coordinates: the picture spans x ±360, y ±410; the floor or ground starts around y 100.
  const CONF = ['#E2476E', '#3A9C98', '#E8AA38', '#7B5CA8', '#FFF5E2', '#8EC3E6', '#F08A5D'];

  // 0: baby Clawd asleep in the cradle, a mobile over it
  function baby(i) {
    const wall = C('#A6BBDC');
    flat(box(-372, -422, 744, 620), wall);
    flat(box(-372, 190, 744, 240), C('#D3B08A'));
    flat(box(-372, 300, 744, 130), C('#C29E78'));
    if (lod() > .45) for (let k = 0; k < 7; k++) sparkle(-300 + hash(k + 3) * 600, -380 + hash(k + 9) * 380, 9 + 6 * hash(k), 'bst' + k);
    // the mobile
    boilSeed('mob');
    inkLine([[0, -420], [0, -272]], 1, PAL.ink, 'inkfine', 0);
    inkLine([[-135, -262], [0, -270], [135, -278]], 1.6, C('#8A6A52'), 'ink', .3);
    for (const [x, len] of [[-125, 70], [0, 95], [125, 60]]) inkLine([[x, -266 - x * .06], [x, -266 - x * .06 + len]], .8, PAL.ink, 'inkfine', 0);
    paint(starPts(-125, -175, 30, .45, 5), { wash: C('#F2C14E'), ink: PAL.ink, sw: .8 });
    paint(ellPts(0, -150, 28, 28, 18), { wash: C('#FFF5E2'), ink: PAL.ink, sw: .8 });
    paint(ellPts(12, -158, 22, 22, 16), { wash: wall, ink: null });
    paint(through([[95, -190], [105, -214], [128, -222], [150, -210], [158, -190], [95, -190]], 4), { wash: C('#DCE9F5'), ink: PAL.ink, sw: .8 });
    // the cradle: back, baby, front, blanket
    boilSeed('crib');
    inkLine([[-200, 172], [-100, 198], [0, 204], [100, 198], [200, 172]], 3, C('#8A6A52'), 'ink', .5);
    for (const x of [-120, 120]) inkLine([[x, 150], [x * 1.05, 196]], 2.4, C('#8A6A52'), 'ink', 0);
    paint(through([[-172, 60], [-190, 0], [-150, -40], [-110, -30], [-120, 60]], 4), { wash: C('#D9AE78'), ink: PAL.ink, sw: 1 });
    figure(0, 96, 16, { eyes: 'closed', mouth: null, blush: .55, hat: 'beanie', aL: -.4, aR: -.3, sq: .05, noShadow: true,
      emote: 'zzz', emoteK: 1, emoteAge: 1.3, lt: LT(), boilKey: 'baby' });
    boilSeed('cribfront');
    paint(through([[-178, 58], [-168, 120], [-110, 168], [0, 182], [110, 168], [168, 120], [178, 58]], 4).concat([[178, 58]]), { wash: C('#E8C48E'), ink: PAL.ink, sw: 1.1 });
    for (const x of [-90, -30, 30, 90]) inkLine([[x, 92], [x * .95, 170]], .8, C('#B98E60'), 'inkfine', 0);
    paint(through([[-182, 52], [-120, 44], [-60, 58], [0, 46], [60, 58], [120, 44], [182, 52], [180, 88], [120, 80], [60, 94], [0, 82], [-60, 94], [-120, 80], [-180, 88], [-182, 52]], 3), { wash: C('#E7A0B4'), ink: PAL.ink, sw: .9 });
  }

  // 1: the first wobbly steps, arms out, toward a toy duck
  function steps(i) {
    flat(box(-372, -422, 744, 525), C('#C9DCB0'));
    flat(box(-372, 100, 744, 330), C('#D9B189'));
    flat(box(-372, 270, 744, 160), C('#CBA37C'));
    boilSeed('rug');
    paint(ellPts(-20, 215, 300, 62, 28), { wash: C('#E3A49A'), ink: PAL.ink, sw: .9 });
    paint(ellPts(-20, 215, 230, 42, 24), { wash: C('#F3D6B2'), ink: null });
    boilSeed('floor1'); inkLine([[-372, 100], [372, 100]], 1.1, PAL.ink, 'ink', 0);
    for (let k = 0; k < 4; k++) { boilSeed('fp' + k); paint(ellPts(-330 + k * 52, 188 + (k % 2 ? 14 : -6), 10, 6, 8), { wash: C('#B98E68'), ink: null }); }
    // the duck
    boilSeed('duck');
    paint(ellPts(235, 150, 50, 32, 18), { wash: C('#F6D55C'), ink: PAL.ink, sw: 1 });
    paint(ellPts(262, 108, 25, 24, 14), { wash: C('#F6D55C'), ink: PAL.ink, sw: 1 });
    paint([[284, 104], [310, 112], [284, 120]], { wash: C('#F0914A'), ink: PAL.ink, sw: .8 });
    paint(ellPts(268, 102, 4, 5, 8), { wash: PAL.ink, ink: null });
    // the toddler, tipping toward it
    figure(-60, 200, 17, { eyes: 'wide', mouth: 'o', view: 'q', walk: .28, aL: .1, aR: .25, rot: .14, dy: -.35, sq: -.05, lookX: .7,
      emote: 'sweat', emoteK: 1, emoteAge: 1, lt: LT(), boilKey: 'toddler' });
    boilSeed('wobble');
    for (const s of [-1, 1]) inkLine([[-60 + s * 120, -40], [-60 + s * 135, -5], [-60 + s * 122, 30]], 1.1, PAL.ink, 'inkfine', .6);
  }

  // 2: Clawd as a child, jumping for a ball that hangs in the air
  function play(i) {
    flat(box(-372, -422, 744, 330), C('#8FC4E8'));
    flat(box(-372, -95, 744, 200), C('#C8E4EE'));
    flat(through([[-380, 70], [-200, 30], [0, 52], [200, 18], [380, 58]], 5).concat([[380, 432], [-380, 432]]), C('#8CC46E'));
    flat(box(-380, 280, 760, 152), C('#79AF5B'));
    boilSeed('sun2'); paint(ellPts(-235, -300, 56, 56, 20), { wash: C('#FBE3A0'), ink: null });
    boilSeed('cloud2'); paint(through([[120, -300], [150, -340], [210, -350], [260, -330], [280, -300], [120, -300]], 4), { wash: C('#FFF8EC'), ink: null });
    if (lod() > .45) for (let k = 0; k < 6; k++) {
      const x = -330 + hash(k + 21) * 660, y = 150 + hash(k + 33) * 240;
      boilSeed('fl' + k); paint(ellPts(x, y, 9, 9, 10), { wash: C(['#FFF5E2', '#F6C3D0', '#FFE27A'][k % 3]), ink: null });
    }
    // the ball, hanging in the air, and its shadow
    const bx = 35, by = -205;
    boilSeed('ballsh'); paint(ellPts(bx + 10, 238, 48, 10, 16), { wash: C('#5E8F48'), ink: null });
    figure(-25, 230, 22, { ...feel('excited', 1.2), dy: -2.3, sq: -.12, aL: 1.42, aR: 1.3, rot: .05, lookX: .3, lookY: -1, emote: null,
      lt: LT(), boilKey: 'kid' });
    boilSeed('ball');
    paint(ellPts(bx, by, 54, 54, 24), { wash: C('#E2476E'), ink: PAL.ink, sw: 1.1 });
    paint(ellPts(bx, by, 22, 53, 18), { wash: C('#FFF5E2'), ink: null });
    paint(ellPts(bx - 30, by + 4, 9, 40, 12), { wash: C('#3A9C98'), ink: null });
    paint(ellPts(bx, by, 54, 54, 24), { ink: PAL.ink, sw: 1.1 });
    paint(ellPts(bx - 18, by - 26, 10, 7, 8, 0, -.5), { wash: C('#FFFFFF'), ink: null });
    for (const d of [-26, 0, 26]) inkLine([[bx + d, by + 70], [bx + d * 1.1, by + 100]], .9, PAL.ink, 'inkfine', 0);
  }

  // 3 and 4: the party. Both frames show the same party; each runs on its own clock p
  function partyPose(p) {
    const bt = p / BEAT, n = Math.floor(bt), q = bt - n, big = ((n % 2) + 2) % 2 === 1;
    let dy, sq, aL, aR, rot;
    if (p >= 0 && p < 2 * BEAT) {   // the hook: one big jump for joy
      if (p < .12) { dy = 0; sq = .16; }
      else if (p < 1.1) { const k = (p - .12) / .98; dy = -3.6 * 4 * k * (1 - k); sq = -.18 * (1 - Math.abs(1 - 2 * k) * .4) * Math.sin(Math.PI * Math.min(1, k * 2)) + .0; }
      else { const a = p - 1.1; dy = 0; sq = .22 * Math.exp(-8 * a) * Math.cos(20 * a); }
      aL = kf(p, [[0, .3], [.14, -.35], [.42, 1.45], [1.05, 1.3], [1.333, .3]]);
      aR = kf(p, [[0, .3], [.2, -.3], [.5, 1.5], [1.12, 1.2], [1.333, .3]]);
      rot = .06 * Math.sin(Math.PI * seg(p, .12, 1.1));
    } else {                        // hopping on the beat, a big hop every other beat
      const h = big ? 2.4 : .9;
      dy = -h * 4 * q * (1 - q);
      sq = .16 * Math.exp(-q * 10) - (big ? .12 : .05) * Math.sin(Math.PI * q);
      aL = big ? .3 + 1.2 * Math.sin(Math.PI * Math.min(1, q * 1.4)) : .65 + .35 * Math.sin(TAU * q);
      aR = big ? .3 + 1.15 * Math.sin(Math.PI * Math.min(1, q * 1.25)) : .6 - .3 * Math.sin(TAU * q + .5);
      rot = (big ? .07 : .035) * Math.sin(Math.PI * q) * (((n >> 1) & 1) ? 1 : -1);
    }
    return { eyes: 'happy', mouth: 'laugh', blush: .5, hat: 'party', dy, sq, aL, aR, rot };
  }
  function party(i, t) {
    const p = partyClock(i, t), L = lod();
    flat(box(-372, -422, 744, 525), C('#F4C76E'));
    flat(box(-372, 100, 744, 330), C('#C98563'));
    flat(box(-372, 262, 744, 170), C('#B87556'));
    if (L > .45) for (let k = 0; k < 10; k++) flat(ellPts(-310 + (k % 4) * 200 + (Math.floor(k / 4) % 2) * 100, -230 + Math.floor(k / 4) * 125, 15, 15, 10), C('#F8DA96'));
    boilSeed('pfloor'); inkLine([[-372, 100], [0, 103], [372, 100]], 1.1, PAL.ink, 'ink', 0);
    // bunting across the top
    const bunt = x => -345 + 58 * (1 - (x / 372) ** 2);
    boilSeed('pbunt'); inkLine([-372, -186, 0, 186, 372].map(x => [x, bunt(x)]), 1, PAL.ink, 'inkfine', .5);
    for (let k = 0; k < 7; k++) {
      const x = -300 + k * 100, sw = 10 * Math.sin(p * 2.3 + k * 1.7);
      boilSeed('flag' + k);
      paint([[x - 36, bunt(x - 36)], [x + 36, bunt(x + 36)], [x + sw, bunt(x) + 72]], { wash: C(CONF[k % 5]), ink: PAL.ink, sw: .8 });
    }
    // balloons
    for (const [k, bx, by, col] of [[0, -178, -232, '#E2476E'], [1, -262, -150, '#3A9C98'], [2, 190, -262, '#7B5CA8']]) {
      const b = 9 * Math.sin(p * 1.6 + k * 2), sx = 6 * Math.sin(p * 1.1 + k), x = bx + sx, y = by + b;
      boilSeed('bal' + k);
      inkLine([[x, y + 66], [x - 12 + sx, y + 150], [bx + 8, by + 250]], .8, PAL.ink, 'inkfine', .6);
      paint(ellPts(x, y, 48, 58, 18), { wash: C(col), ink: PAL.ink, sw: 1 });
      paint([[x - 8, y + 57], [x + 8, y + 57], [x, y + 68]], { wash: C(col), ink: PAL.ink, sw: .6 });
      paint(ellPts(x - 17, y - 22, 9, 15, 8, 0, .5), { wash: C('#FFF5E2'), washOp: 210, ink: null });
    }
    // the table and the cake with three candles
    const cx = 215;
    boilSeed('table');
    paint(box(cx - 9, 48, 18, 84), { wash: C('#8A5A44'), ink: PAL.ink, sw: .8 });
    paint(ellPts(cx, 132, 50, 9, 14), { wash: C('#8A5A44'), ink: PAL.ink, sw: .7 });
    paint(ellPts(cx, 44, 96, 17, 20), { wash: C('#F3EBDC'), ink: PAL.ink, sw: .9 });
    boilSeed('cake');
    paint(box(cx - 56, -24, 112, 64), { wash: C('#F3A6B8'), ink: PAL.ink, sw: 1 });
    paint(through([[cx - 58, -26], [cx + 58, -26], [cx + 58, -6], [cx + 36, 6], [cx + 20, -4], [cx, 10], [cx - 22, -4], [cx - 40, 6], [cx - 58, -6], [cx - 58, -26]], 3), { wash: C('#FFF5E2'), ink: PAL.ink, sw: .8 });
    const lit = PK < .3 ? 1 - PK / .3 : 0;
    if (lit > 0) glow(cx, -86, 90, '#FFD27A', .75 * lit);
    for (let k = -1; k <= 1; k++) {
      const x = cx + k * 30, fl = 1 + .18 * Math.sin(p * 19 + k * 2.1), lean = 4 * Math.sin(p * 7 + k);
      boilSeed('cand' + k);
      paint(box(x - 5, -66, 10, 42), { wash: C(['#8EC3E6', '#FFF5E2', '#E8AA38'][k + 1]), ink: PAL.ink, sw: .6 });
      paint([[x + lean, -66 - 30 * fl], [x + 8, -78], [x, -68], [x - 8, -78]], { wash: C('#FFD27A'), ink: PAL.ink, sw: .5, curv: .5 });
      paint(ellPts(x, -77, 3, 5, 8), { wash: C('#FFF5E2'), ink: null });
    }
    // Clawd
    figure(-40, 160, 28, { ...partyPose(p), lt: LT(), boilKey: 'party' + i });
    // confetti, falling on the frame's own clock (frozen in the air when the frame is unlit)
    const nC = L > .6 ? 30 : L > .4 ? 14 : 0;
    for (let k = 0; k < nC; k++) {
      const v = 95 + 75 * hash(k + 3), fall = ((hash(k + 7) * 900 + p * v) % 900 + 900) % 900;
      const x = -350 + hash(k) * 700 + 22 * Math.sin(p * 1.7 + k * 1.3), y = -440 + fall;
      const fl = Math.abs(Math.cos(p * 5 * (.5 + hash(k + 2)) + k)), h = 15 * (.25 + .75 * fl);
      boilSeed('cf' + k);
      push(); translate(x, y); rotate(p * (1.5 + 2.5 * hash(k + 1)) + k);
      paint(box(-5, -h / 2, 10, h), { wash: C(CONF[k % CONF.length]), ink: null });
      pop();
    }
  }

  // 5: old Clawd with a white beard and a cane under an autumn tree, the leaves hanging in the air
  const OLD = { col: mixCol(PAL.clay, '#BCAFA4', .42), dk: mixCol(PAL.clayDk, '#8E8278', .42), lt: '#EFCDB9' };
  // the old face, drawn over the body (front view): a bushy beard with a moustache, round glasses, white brows
  const beardHook = (u, sw) => {
    const S = pts => pts.map(([a, b]) => [a * u, b * u]), white = C('#F6F3EC'), hair = C('#C9C2B8');
    const P = [[-4.3, -4.9], [-4.45, -4.0], [-4.0, -3.3], [-4.3, -2.6], [-3.6, -2.0], [-3.7, -1.2], [-2.8, -.9], [-2.4, -.1], [-1.4, -.2], [-.8, .5], [0, .2],
               [.8, .5], [1.4, -.2], [2.4, -.1], [2.8, -.9], [3.7, -1.2], [3.6, -2.0], [4.3, -2.6], [4.0, -3.3], [4.45, -4.0], [4.3, -4.9], [2.5, -4.6], [0, -4.45], [-2.5, -4.6]];
    paint(S(through(P.concat([P[0]]), 3)), { wash: white, ink: PAL.ink, sw: sw * .6 });
    for (const [a, b] of [[[-2.1, -3.7], [-1.8, -1.5]], [[0, -3.5], [.1, -.6]], [[2.1, -3.7], [1.8, -1.5]]]) inkLine(S([a, [(a[0] + b[0]) / 2 + .25, (a[1] + b[1]) / 2], b]), sw * .45, hair, 'inkfine', .6);
    for (const s of [-1, 1]) {
      paint(S(through([[0, -4.8], [s * 1.2, -5.0], [s * 2.4, -4.65], [s * 3.0, -4.05], [s * 2.3, -4.2], [s * 1.2, -4.15], [0, -4.35], [0, -4.8]], 3)), { wash: white, ink: PAL.ink, sw: sw * .5 });
      paint(ellPts(s * 2.5 * u, -7.75 * u, 1.1 * u, .4 * u, 12, 0, s * .15), { wash: white, ink: PAL.ink, sw: sw * .5 });
      paint(ellPts(s * 2.5 * u, -6 * u, 1.4 * u, 1.35 * u, 20), { ink: PAL.ink, sw: sw * .7 });
      inkLine(S([[s * 3.9, -6.1], [s * 5, -6.35]]), sw * .6, PAL.ink, 'ink', 0);
    }
    inkLine(S([[-1.1, -6.1], [0, -6.45], [1.1, -6.1]]), sw * .6, PAL.ink, 'ink', .5);
  };
  function old(i) {
    flat(box(-372, -422, 744, 330), C('#F0BE92'));
    flat(box(-372, -95, 744, 215), C('#F7D9B5'));
    flat(box(-372, 118, 744, 312), C('#C49D66'));
    flat(box(-372, 285, 744, 145), C('#B08853'));
    boilSeed('sun5'); paint(ellPts(235, 40, 62, 62, 22), { wash: C('#FBD9A0'), ink: null });
    boilSeed('ground5'); inkLine([[-372, 118], [372, 118]], 1.1, PAL.ink, 'ink', 0);
    // the tree
    boilSeed('trunk');
    paint([[-262, 140], [-246, -40], [-300, -150], [-280, -160], [-232, -90], [-210, -190], [-190, -182], [-214, -40], [-198, 140]], { wash: C('#7A5A44'), ink: PAL.ink, sw: 1 });
    for (const [k, dx, dy, r, col] of [[0, -250, -250, 150, '#D0703A'], [1, -130, -300, 130, '#E0953F'], [2, -210, -360, 120, '#E8B04A']]) {
      boilSeed('crown' + k); paint(ellPts(dx, dy, r, r * .82, 24, 3), { wash: C(col), ink: PAL.ink, sw: .9 });
    }
    if (lod() > .45) for (let k = 0; k < 5; k++) { boilSeed('gl' + k); paint(ellPts(-300 + hash(k + 50) * 420, 150 + hash(k + 60) * 200, 12, 5, 8, 0, hash(k) * 3), { wash: C(['#D0703A', '#E8B04A'][k % 2]), ink: null }); }
    // leaves hanging in the air
    for (let k = 0; k < 9; k++) {
      const x = -160 + hash(k + 70) * 480, y = -320 + hash(k + 80) * 380, a = hash(k + 90) * 6;
      boilSeed('leaf' + k);
      push(); translate(x, y); rotate(a);
      paint(through([[-16, 0], [0, -8], [16, 0], [0, 8], [-16, 0]], 3), { wash: C(['#D0703A', '#E8B04A', '#C9573A'][k % 3]), ink: PAL.ink, sw: .6 });
      pop();
    }
    // old Clawd, content, leaning on a cane
    const u = 26, x = 95, y = 222;
    figure(x, y, u, { eyes: 'happy', mouth: null, blush: .3, sq: .07, rot: -.03, aL: .12, aR: -.55, lookY: -.4,
      col: C(OLD.col), dk: C(OLD.dk), lt: C(OLD.lt), draw: beardHook, boilKey: 'old' });
    boilSeed('cane');
    inkLine([[x + 7.05 * u, y - 3.2 * u], [x + 7.3 * u, y - 1.6 * u], [x + 7.5 * u, y + .1 * u]], 3.2, C('#6B4A36'), 'ink', .2);
    inkLine([[x + 7.05 * u, y - 3.2 * u], [x + 6.9 * u, y - 3.75 * u], [x + 6.35 * u, y - 3.8 * u], [x + 6.1 * u, y - 3.5 * u]], 3.2, C('#6B4A36'), 'ink', .6);
  }

  const FRAMES = [baby, steps, play, party, party, old];

  // ---------- the world around the strip ----------
  function backdrop(t) {
    const { x0, x1, y0, y1, z } = VIEW, m = 100;
    flat(box(x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m), BG);
    // specks in the dark, anchored in the world, so they show the camera's motion
    for (let i = 0; i < 170; i++) {
      const x = (hash(i) - .5) * 5600, y = STRIP_BOT + 400 - hash(i + 300) * (STRIP_BOT - STRIP_TOP + 800) - t * (4 + 8 * hash(i + 9));
      if (x < x0 - 20 || x > x1 + 20 || y < y0 - 20 || y > y1 + 20 || Math.abs(x) < HW) continue;
      const r = (1.6 + 3 * hash(i + 17)) / clamp(z, .35, 1.6), a = 40 + 70 * (.5 + .5 * Math.sin(t * (1 + hash(i + 4)) + i));
      flat(ellPts(x, y, r, r, 8), '#CFC8E8', null, a);
    }
  }
  // the light: a warm cone from up and to the right, landing on the lit frame
  function beam(t) {
    const ly = FY(litF(t)), sx = BS_X, sy = ly + BS_DY;
    blendMode(ADD);
    for (const [s, a] of [[1.55, 14], [1.28, 20], [1.06, 28]]) {
      const h = (PH / 2 + 40) * s;
      flat([[sx, sy], [0, ly - h], [0, ly + h]], WARM, null, a);
    }
    blendMode(BLEND);
  }
  function dust(t) {
    const ly = FY(litF(t)), sy = ly + BS_DY, h0 = PH / 2 + 40;
    for (let i = 0; i < 24; i++) {
      const s = .04 + .42 * frac(hash(i) + t * .02 * (.6 + hash(i + 5))), ac = (hash(i + 11) * 2 - 1) * .85;
      const x = s * BS_X + 10 * Math.sin(t * .7 + i), y = lerp(ly, sy, s) + ac * h0 * (1 - s) + 12 * Math.sin(t * .8 + i * 2);
      if (x < HW + 8 || x < VIEW.x0 - 20 || x > VIEW.x1 + 20 || y < VIEW.y0 - 20 || y > VIEW.y1 + 20) continue;
      const r = (2.5 + 3 * hash(i + 2)) / clamp(VIEW.z, .35, 1.6), a = 190 * Math.sin(Math.PI * seg(s, .04, .46));
      flat(ellPts(x, y, r, r, 8), WARM, null, a);
    }
  }
  // the film: base with a window per frame, perforation (lit through where the light falls), blank leader at both
  // ends fading into the dark, and ink edges
  function film(t) {
    const Lf = litF(t), { y0, y1 } = VIEW;
    for (let i = -1; i <= NF; i++) {
      const cy = FY(i), top = cy - PITCH / 2 - .5, bot = cy + PITCH / 2 + .5;
      if (bot < y0 - 60 || top > y1 + 60) continue;
      const real = i >= 0 && i < NF, lk = real ? clamp(1 - Math.abs(i - Lf) * 1.15) : 0;
      const outer = box(-HW, top, 2 * HW, bot - top), win = box(-PW / 2, cy - PH / 2, PW, PH);
      if (real) flat(outer, mixCol(BASE, BASE_LIT, lk), win);
      else { flat(outer, BASE); flat(win, LEADER); }
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const hy = cy + (k - 1.5) * PITCH / 4, hx = s * (PW / 2 + MARGIN / 2);
        flat(rrPts(hx - 24, hy - 32, 48, 64, 12), mixCol(HOLE, WARM, .92 * lk));
      }
    }
    // the ends fade into the dark
    const fade = (ya, dir) => {
      for (let k = 0; k < 12; k++) { const a = ya + dir * k * 70; flat(box(-HW - 8, dir > 0 ? a : a - 71, 2 * HW + 16, 71), BG, null, 255 * Math.min(1, (k + .5) / 11)); }
    };
    if (y1 > FY(0) + PH / 2) fade(FY(0) + PH / 2 + GAP / 2, 1);
    if (y0 < FY(NF - 1) - PH / 2) fade(FY(NF - 1) - PH / 2 - GAP / 2, -1);
    // ink: picture windows and the strip's edges
    for (let i = 0; i < NF; i++) {
      const cy = FY(i); if (cy + PH / 2 < y0 - 30 || cy - PH / 2 > y1 + 30) continue;
      boilSeed('win' + i); paint(rectPts(-PW / 2, cy - PH / 2, PW, PH, 1.2), { ink: PAL.ink, sw: 1.4 });
    }
    const ea = Math.max(y0 - 40, FY(-1) - 120), eb = Math.min(y1 + 40, FY(NF) + 200);
    for (let y = Math.floor(ea / 700) * 700; y < eb; y += 700) {
      if (y > FY(0) + PH / 2 + GAP / 2 + 500 || y + 700 < FY(NF - 1) - PH / 2 - GAP / 2 - 500) continue;
      boilSeed('edge' + y);
      for (const s of [-1, 1]) inkLine([[s * HW, y], [s * HW + jit(1.5), y + 350], [s * HW, y + 702]], 1.3, EDGE, 'inkfine', .3);
    }
  }
  // speed streaks over the whip pan
  function whipFX(k) {
    const a = clamp(k); if (a < .05) return;
    for (let i = 0; i < 11; i++) {
      const x = (hash(i + 40) * .9 + .05) * W, L = 500 + 700 * hash(i + 3), y = H / 2 + (hash(i) - .5) * H * .7;
      boilSeed('whip' + i);
      inkLine([[x, y - L / 2], [x + jit(4), y], [x, y + L / 2]], (i % 3 ? .9 : .5) * a, i % 3 ? '#FFF1D6' : '#8C7BA8', 'dry', .2);
    }
  }

  // ---------- frame ----------
  function frame(t, c, o = {}) {
    cam(c);
    backdrop(t);
    beam(t);
    glow(0, FY(litF(t)), 950, WARM, .42);
    for (let i = 0; i < NF; i++) {
      const cy = FY(i); if (cy + PH / 2 + 20 < VIEW.y0 || cy - PH / 2 - 20 > VIEW.y1) continue;
      inFrame(i, t, FRAMES[i]);
    }
    flushBrush();
    film(t);
    dust(t);
    camEnd();
    if (o.whip) whipFX(o.whip);
  }

  // ---------- shots ----------
  // inside a party frame, on its clock p: the loop's first and last framing (the camera creeps in as p runs)
  const HOOK = (i, p) => [15, FY(i), 2.5 * Math.exp(.012 * p), 0];
  const front = k => 1 - Math.pow(1 - ease(k), 2.2);   // fast out, long settle

  // A 0–5.33: the hook inside frame A, then the fast pull back: it's one frame on a strip
  const REV = [0, FY(FA) - 60, .62, 0], REV2 = [0, FY(FA) - 110, .57, -.015];
  function shotA(t) {
    let c;
    if (t < 1.5) c = HOOK(FA, t);
    else if (t < 3.1) c = mixCam(HOOK(FA, 1.5), REV, front(seg(t, 1.5, 3.1)));
    else c = mixCam(REV, REV2, ease(seg(t, 3.1, 5.33)));
    frame(t, c);
  }
  // B 5.33–13.33: crane down into the past, a stop at every frame
  const CRANE = [[5.33, REV2], [6.45, [0, FY(2) + 10, 1.02, .01]], [7.6, [0, FY(2) + 30, 1.06, .015]], [8.55, [0, FY(1) + 10, 1.02, -.01]],
                 [9.8, [0, FY(1) + 30, 1.06, -.015]], [10.85, [0, FY(0) + 10, 1.02, .01]], [13.33, [0, FY(0) + 55, 1.14, .02]]];
  function shotB(t) {
    const c = camKeys(t, CRANE);
    for (const [a, b] of [[7.6, 8.55], [9.8, 10.85]]) if (t > a && t < b) c[2] *= 1 - .12 * Math.sin(Math.PI * seg(t, a, b));
    frame(t, c);
  }
  // C 13.33–18: whip up the whole strip, past the light, to old Clawd at the top
  const OLDC = [0, FY(5) + 20, 1.02, -.01], OLDP = [70, FY(5) + 105, 1.5, .015];
  const whipCam = t => { const k = seg(t, 13.33, 14.45), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, c = mixCam(CRANE[6][1], OLDC, e); c[2] *= 1 - .32 * Math.sin(Math.PI * k); return c; };
  function shotC(t) {
    if (t < 14.45) {
      const c = whipCam(t), v = Math.abs(whipCam(t + .02)[1] - whipCam(t - .02)[1]) / .04 * c[2];
      frame(t, c, { whip: clamp(v / 7000) });
    } else frame(t, mixCam(OLDC, OLDP, ease(seg(t, 14.45, 18.0))));
  }
  // D 18–22.7: cut to the whole strip, the whole life at once; pull back until it all fits
  const MID = (FY(NF - 1) + FY(0)) / 2;
  const WIDE0 = [0, FY(4.25), .46, 0], WIDE1 = [0, MID - 20, .305, 0], WIDE2 = [0, MID - 45, .318, 0];
  function shotD(t) { frame(t, t < 20.4 ? mixCam(WIDE0, WIDE1, ease(seg(t, 18.0, 20.4))) : mixCam(WIDE1, WIDE2, ease(seg(t, 20.4, 22.7)))); }
  // E 22.7–30: in to frames A and B; the light moves on one frame
  const MED = [0, FY(3.5) + 20, .86, 0], MED2 = [0, FY(3.62), .9, 0];
  function shotE(t) { frame(t, t < 24.6 ? mixCam(WIDE2, MED, ease(seg(t, 22.7, 24.6))) : mixCam(MED, MED2, ease(seg(t, 24.9, 27.2)))); }
  // F 30–36: push into the lit frame until it's the first shot again
  function shotF(t) { const to = HOOK(FB, t - LOOP), k = seg(t, 30.0, 32.6); frame(t, k < 1 ? mixCam(MED2, to, ease(k)) : to); }

  shots([[0, shotA], [5.33, shotB], [13.33, shotC], [18.0, shotD], [22.7, shotE], [30.0, shotF]]);
})();
