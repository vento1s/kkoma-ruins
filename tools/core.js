// ===== 꼬마 탐험가의 유적 : engine with multi-cell stones =====
// Map legend: '#' wall, '%' cracked, 'H' ladder, '^' spikes, 'E' exit, 'P' player, 'C' chick, 'B' beetle,
// 'O' a single cube stone, lowercase letters = cells of one stone (same letter, touching = one stone).
const NONE = 0, LEFT = 1, RIGHT = 2, UP = 3, DOWN = 4, ACT = 5;
const ENEMY_EVERY = 3;
const WOBBLE = 3;

function classify(cells) {
  const key = cells.map(c => c.join(",")).sort().join(";");
  const K = {
    "0,0": "cube", "0,0;0,1": "tall", "0,0;1,0": "long",
    "0,0;1,0;1,1": "giyeok",   // ㄱ : bar on top, leg down on the right
    "0,0;0,1;1,0": "giyeokL",  // ┌ : bar on top, leg down on the left
    "0,0;0,1;1,1": "nieun",    // ㄴ : tall on the left, foot to the right
    "0,1;1,0;1,1": "nieunR",   // ┘ : tall on the right, foot to the left
  };
  return K[key] || "block";
}

function loadLevel(i) {
  const L = LEVELS[i];
  const H = L.map.length, W = L.map[0].length;
  const s = { W, H, t: [], pieces: [], chicks: [], enemies: [], p: null, tick: 0,
    dead: false, won: false, steps: 0, events: [] };
  const seen = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = L.map[y][x];
    let tile = c;
    if (c === "P") { s.p = { x, y, face: 1, jump: 0 }; tile = " "; }
    else if (c === "O") { s.pieces.push({ x, y, cells: [[0, 0]], kind: "cube", falling: 0, shake: 0, pushed: 0 }); tile = " "; }
    else if (c >= "a" && c <= "z") {
      tile = " ";
      if (!seen.has(x + "," + y)) {
        const stack = [[x, y]], cells = [];
        seen.add(x + "," + y);
        while (stack.length) {
          const [cx, cy] = stack.pop(); cells.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && L.map[ny][nx] === c && !seen.has(nx + "," + ny)) { seen.add(nx + "," + ny); stack.push([nx, ny]); }
          }
        }
        const mx = Math.min(...cells.map(q => q[0])), my = Math.min(...cells.map(q => q[1]));
        const rel = cells.map(([a, b]) => [a - mx, b - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
        s.pieces.push({ x: mx, y: my, cells: rel, kind: classify(rel), falling: 0, shake: 0, pushed: 0 });
      }
    }
    else if (c === "C") { s.chicks.push({ x, y, got: false }); tile = " "; }
    else if (c === "B") { s.enemies.push({ x, y, d: -1, alive: true }); tile = " "; }
    s.t.push(tile);
  }
  buildOcc(s);
  return s;
}

function clone(s) {
  const n = { W: s.W, H: s.H, t: s.t.slice(), tick: s.tick, dead: s.dead, won: s.won, steps: s.steps, events: [],
    p: { ...s.p }, pieces: s.pieces.map(b => ({ ...b })), chicks: s.chicks.map(c => ({ ...c })),
    enemies: s.enemies.map(e => ({ ...e })) };
  buildOcc(n);
  return n;
}

function buildOcc(s) {
  const o = new Int16Array(s.W * s.H).fill(-1);
  s.pieces.forEach((p, i) => { for (const [dx, dy] of p.cells) o[(p.y + dy) * s.W + p.x + dx] = i; });
  s.occ = o;
}

const T = (s, x, y) => (x < 0 || y < 0 || x >= s.W || y >= s.H) ? "#" : s.t[y * s.W + x];
const setT = (s, x, y, v) => { s.t[y * s.W + x] = v; };
const pieceAt = (s, x, y) => (x < 0 || y < 0 || x >= s.W || y >= s.H) ? -1 : s.occ[y * s.W + x];
const chickAt = (s, x, y) => s.chicks.find(c => !c.got && c.x === x && c.y === y);
const enemyAt = (s, x, y) => s.enemies.find(e => e.alive && e.x === x && e.y === y);
const solidT = c => c === "#" || c === "%";
const passP = (s, x, y) => !solidT(T(s, x, y)) && pieceAt(s, x, y) < 0;
const supportP = (s, x, y) => { const c = T(s, x, y); return solidT(c) || c === "H" || pieceAt(s, x, y) >= 0; };
const allRescued = s => s.chicks.every(c => c.got);

// can stone i move by (dx,dy)? actors (player/beetles) block unless ignoreActors (falling crushes them)
function canShift(s, i, dx, dy, ignoreActors) {
  const p = s.pieces[i];
  for (const [cx, cy] of p.cells) {
    const x = p.x + cx + dx, y = p.y + cy + dy;
    const c = T(s, x, y);
    if (c !== " " && c !== "^") return false;
    const j = pieceAt(s, x, y);
    if (j >= 0 && j !== i) return false;
    if (chickAt(s, x, y)) return false;
    if (!ignoreActors && (enemyAt(s, x, y) || (s.p.x === x && s.p.y === y))) return false;
  }
  return true;
}

function tryHoriz(s, d) {
  const p = s.p, nx = p.x + d;
  const i = pieceAt(s, nx, p.y);
  if (i >= 0) {
    if (canShift(s, i, d, 0, false)) {
      const b = s.pieces[i]; b.x += d; b.pushed = 1; b.shake = 0; buildOcc(s);
      p.x = nx; s.events.push("push"); return true;
    }
    return false;
  }
  if (passP(s, nx, p.y)) { p.x = nx; return true; }
  return false;
}

function checkPlayer(s) {
  const p = s.p;
  if (s.dead) return;
  const c = chickAt(s, p.x, p.y);
  if (c) { c.got = true; s.events.push("chick"); if (allRescued(s)) s.events.push("open"); }
  if (T(s, p.x, p.y) === "^") { s.dead = true; s.events.push("die"); return; }
  if (enemyAt(s, p.x, p.y)) { s.dead = true; s.events.push("die"); return; }
  if (T(s, p.x, p.y) === "E" && allRescued(s)) { s.won = true; s.events.push("win"); }
}

function breakFront(s) {
  const fx = s.p.x + s.p.face;
  if (T(s, fx, s.p.y) === "%") { setT(s, fx, s.p.y, " "); s.events.push("break"); return true; }
  return false;
}

function step(s, input) {
  s.events = [];
  if (s.dead || s.won) return s;
  const p = s.p;
  const onLadder = T(s, p.x, p.y) === "H";
  const supported = onLadder || supportP(s, p.x, p.y + 1);
  let acted = false;
  if (p.jump) {
    p.jump = 0;
    if (input === LEFT || input === RIGHT) { const d = input === LEFT ? -1 : 1; p.face = d; acted = tryHoriz(s, d); }
    else if (input === ACT) acted = breakFront(s);
  } else if (!supported) {
    if (passP(s, p.x, p.y + 1)) p.y++;
  } else {
    if (input === LEFT || input === RIGHT) {
      const d = input === LEFT ? -1 : 1; p.face = d; acted = tryHoriz(s, d);
    } else if (input === UP) {
      if (passP(s, p.x, p.y - 1)) {
        p.y--; acted = true;
        if (!onLadder && T(s, p.x, p.y) !== "H") { p.jump = 1; s.events.push("jump"); }
      }
    } else if (input === DOWN) {
      const below = T(s, p.x, p.y + 1);
      if ((onLadder || below === "H") && passP(s, p.x, p.y + 1)) { p.y++; acted = true; }
      else if (below === "%" && !onLadder) { setT(s, p.x, p.y + 1, " "); s.events.push("break"); acted = true; }
    } else if (input === ACT) acted = breakFront(s);
  }
  if (acted) s.steps++;
  checkPlayer(s);

  // stones: lowest first, one cell per tick. A resting stone that loses support shakes first.
  const order = s.pieces.map((b, i) => [i, b.y + Math.max(...b.cells.map(c => c[1]))]).sort((a, b) => b[1] - a[1]);
  const vacated = new Set();
  for (const [i] of order) {
    const b = s.pieces[i];
    if (canShift(s, i, 0, 1, true)) {
      if (!b.falling && !b.pushed) {
        let follow = false;
        for (const [cx, cy] of b.cells) if (vacated.has((b.x + cx) + "," + (b.y + cy + 1))) follow = true;
        if (!follow) {
          if (!b.shake) { b.shake = WOBBLE; s.events.push("rumble"); continue; }
          b.shake--;
          if (b.shake > 0) continue;
        }
      }
      for (const [cx, cy] of b.cells) {
        const x = b.x + cx, y = b.y + cy + 1;
        if (!s.dead && p.x === x && p.y === y) { s.dead = true; s.events.push("die"); }
        const e = enemyAt(s, x, y);
        if (e) { e.alive = false; s.events.push("crush"); }
        vacated.add((b.x + cx) + "," + (b.y + cy));
      }
      b.y++; b.falling = 1; b.shake = 0; buildOcc(s);
    } else {
      if (b.falling) s.events.push("thud");
      b.falling = 0; b.shake = 0;
    }
    b.pushed = 0;
  }

  // beetles
  if (s.tick % ENEMY_EVERY === 0) {
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const below = T(s, e.x, e.y + 1);
      const sup = solidT(below) || below === "H" || pieceAt(s, e.x, e.y + 1) >= 0 || enemyAt(s, e.x, e.y + 1);
      if (!sup) { e.y++; if (T(s, e.x, e.y) === "^") e.alive = false; continue; }
      const nx = e.x + e.d;
      const c = T(s, nx, e.y);
      const bc = T(s, nx, e.y + 1);
      const ground = solidT(bc) || bc === "H" || pieceAt(s, nx, e.y + 1) >= 0;
      if ((c === " " || c === "H") && pieceAt(s, nx, e.y) < 0 && !chickAt(s, nx, e.y) && !enemyAt(s, nx, e.y) && ground) e.x = nx;
      else e.d = -e.d;
    }
  }
  checkPlayer(s);
  s.tick++;
  return s;
}

if (typeof module !== "undefined" && module.exports) module.exports = { LEVELS, loadLevel, clone, step, NONE, LEFT, RIGHT, UP, DOWN, ACT };
