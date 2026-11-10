import type { MapDef } from './protocol';

export const TILE_W = 32;
export const TILE_H = 24;

export const T_NONE = 0;
export const T_GRASS = 1;
export const T_WATER = 2;
export const T_WOOD = 3;
export const T_DIRT = 4;
export const T_ICE = 8;
export const T_STONE = 10;

export function hashPosition(mapId: string, x: number, y: number): number {
  let h = 2166136261;

  for (let i = 0; i < mapId.length; i++) {
    h ^= mapId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  h ^= x * 374761393 + y * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function clampInt(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function valueNoise(mapId: string, seed: number, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hashPosition(mapId + seed, ix, iy) / 4294967296;
  const b = hashPosition(mapId + seed, ix + 1, iy) / 4294967296;
  const c = hashPosition(mapId + seed, ix, iy + 1) / 4294967296;
  const d = hashPosition(mapId + seed, ix + 1, iy + 1) / 4294967296;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function buildGrid(map: MapDef): Uint8Array {
  const { id: mapId, w, h, spawnY, spawnX, portals } = map;
  const grid = new Uint8Array(w * h);
  const seed = hashPosition(mapId, 0, 0) % 1000;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      grid[x + y * w] = T_GRASS;
    }
  }

  const nearLandmark = (x: number, y: number) =>
    portals.some(p => (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < 64) ||
    (spawnX - x) * (spawnX - x) + (spawnY - y) * (spawnY - y) < 36;

  if (mapId === 'meadow' || mapId === 'peaks') {
    const pondCount = mapId === 'meadow' ? 2 : 1;
    const liquid = mapId === 'meadow' ? T_WATER : T_ICE;

    for (let p = 0; p < pondCount; p++) {
      const hx = hashPosition(mapId + 'pond' + p, 1, 1);
      const hy = hashPosition(mapId + 'pond' + p, 2, 2);
      const cx = 20 + (hx % Math.max(1, w - 50));
      const cy = 20 + (hy % Math.max(1, h - 50));
      const radius = 5 + (hx % 5);
      const radiusY = radius * 0.7;

      for (let y = Math.max(1, Math.floor(cy - radiusY - 2)); y < Math.min(h - 1, cy + radiusY + 3); y++) {
        for (let x = Math.max(1, Math.floor(cx - radius - 2)); x < Math.min(w - 1, cx + radius + 3); x++) {
          if (nearLandmark(x, y)) continue;

          const dx = (x - cx) / radius;
          const dy = (y - cy) / radiusY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const noise = valueNoise(mapId, seed + p, x * 0.35, y * 0.35);

          if (dist < 0.85 + noise * 0.45) {
            grid[x + y * w] = liquid;
          }
        }
      }
    }
  }

  if (mapId === 'forest') {
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const noise = valueNoise(mapId, seed, x * 0.18, y * 0.18);

        if (noise > 0.74 && hashPosition(mapId + 'dirt', x, y) % 100 < 72) {
          grid[x + y * w] = T_DIRT;
        }
      }
    }
  }

  if (mapId === 'cave') {
    grid.fill(T_NONE);

    const carve = (cx: number, cy: number, rx: number, ry: number) => {
      for (let y = Math.max(1, Math.floor(cy - ry - 3)); y <= Math.min(h - 2, Math.ceil(cy + ry + 3)); y++) {
        for (let x = Math.max(1, Math.floor(cx - rx - 3)); x <= Math.min(w - 2, Math.ceil(cx + rx + 3)); x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const noise = valueNoise(mapId, seed + 7, x * 0.55, y * 0.55);

          if (dist < 1 + noise * 0.2) {
            grid[x + y * w] = T_STONE;
          }
        }
      }
    };

    const fill = (x0: number, y0: number, x1: number, y1: number) => {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
            grid[x + y * w] = T_STONE;
          }
        }
      }
    };

    carve(55, 50, 26, 24);
    carve(26, 62, 10, 9);
    carve(86, 44, 12, 10);
    fill(30, 56, 38, 64);
    fill(74, 42, 82, 50);
    fill(52, 28, 58, 34);

    const hx = hashPosition(mapId + 'pond', 3, 3);
    const cx = 58 + (hx % 12);
    const cy = 58 + (hx % 6);
    const radius = 3.4 + (hx % 2);

    for (let y = Math.floor(cy - radius - 2); y <= Math.ceil(cy + radius + 2); y++) {
      for (let x = Math.floor(cx - radius - 2); x <= Math.ceil(cx + radius + 2); x++) {
        if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) continue;

        if (grid[x + y * w] !== T_STONE) continue;

        const dx = (x - cx) / radius;
        const dy = (y - cy) / radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const noise = valueNoise(mapId, seed + 13, x * 0.4, y * 0.4);

        if (dist < 0.9 + noise * 0.35) {
          grid[x + y * w] = T_WATER;
        }
      }
    }
  }

  if (mapId !== 'cave') {
    for (let x = 0; x < w; x++) {
      for (const py of [spawnY, spawnY + 1]) {
        const type = grid[x + py * w];

        if (mapId === 'meadow' && type === T_WATER) {
          grid[x + py * w] = T_WOOD;
        } else if (type === T_GRASS || type === T_DIRT) {
          grid[x + py * w] = T_DIRT;
        }
      }
    }
  }

  return grid;
}

export function buildWalls(map: MapDef, grid: Uint8Array): Uint8Array {
  const { id: mapId, w, h } = map;
  const walls = new Uint8Array(w * h);

  if (mapId !== 'cave') return walls;

  for (let i = 0; i < w * h; i++) {
    walls[i] = grid[i] === T_NONE ? 1 : 0;
  }

  return walls;
}

export const DECOR_SPANS: Record<string, number> = {
  fence_a: 3,
  fence_b: 5,
  fence_c: 7,
  fence_winter_a: 3,
  fence_winter_b: 5,
  wooden_fence_h1: 1,
  wooden_fence_pole1: 1,
  stone_wall_h1: 2,
  stone_wall_pole1: 1,
  bench: 3,
  barrel: 1,
  crate: 1,
  sign_a: 1,
  sign_b: 1,
  sign_winter: 1,
  flower_patch_a: 4,
  flower_patch_b: 2,
  flower_patch_c: 2,
  flower_patch_d: 1,
  snowpony_a: 1,
  snowpony_b: 2,
  crystals_a: 1,
  crystals_b: 1,
  crystals_c: 1,
  crystal_lantern: 1,
  mine_entrance: 3,
};

export const DECOR_SOLID: Record<string, boolean> = {
  fence_a: true,
  fence_b: true,
  fence_c: true,
  fence_winter_a: true,
  fence_winter_b: true,
  wooden_fence_h1: true,
  wooden_fence_pole1: true,
  stone_wall_h1: true,
  stone_wall_pole1: true,
  bench: true,
  barrel: true,
  crate: true,
  sign_a: true,
  sign_b: true,
  sign_winter: true,
  crystals_a: true,
  crystals_b: true,
  crystals_c: true,
  crystal_lantern: true,
  mine_entrance: true,
};

export interface DecorPlacement {
  x: number;
  y: number;
  kind: string;
}

export function decorPlacements(map: MapDef, grid: Uint8Array, walls: Uint8Array): DecorPlacement[] {
  const { id: mapId, w, h, spawnX, spawnY, portals } = map;
  const placements: DecorPlacement[] = [];
  const taken = new Set<number>();

  const free = (x: number, y: number, span = 1) => {
    for (let i = 0; i < span; i++) {
      const idx = (x + i) + y * w;

      if (x + i < 1 || x + i >= w - 1 || y < 1 || y >= h - 1) return false;

      if (grid[idx] === T_WATER || walls[idx] === 1) return false;

      if (grid[idx] !== T_GRASS && grid[idx] !== T_DIRT && grid[idx] !== T_STONE) return false;

      if (taken.has(idx)) return false;

      if (Math.abs(y - spawnY) <= 1 && Math.abs(x + i - spawnX) < 3) return false;

      if (portals.some(p => Math.abs(p.x - (x + i)) < 3 && Math.abs(p.y - y) < 3)) return false;
    }

    return true;
  };

  const place = (x: number, y: number, kind: string, span = 1, force = false) => {
    if (!force && !free(x, y, span)) return;

    for (let i = 0; i < span; i++) {
      taken.add((x + i) + y * w);
    }

    placements.push({ x, y, kind });
  };

  const put = (x: number, y: number, kind: string) => {
    place(x, y, kind, DECOR_SPANS[kind] || 1);
  };

  if (mapId === 'meadow') {
    place(80, 29, 'mine_entrance', DECOR_SPANS.mine_entrance, true);
    put(83, 30, 'sign_b');
    put(spawnX - 10, spawnY + 4, 'fence_b');
    put(spawnX + 2, spawnY + 4, 'fence_c');
    put(spawnX + 14, spawnY - 6, 'fence_a');
    put(spawnX - 18, spawnY - 12, 'bench');
    put(spawnX - 16, spawnY - 12, 'barrel');
    put(spawnX + 12, spawnY + 6, 'crate');
    put(spawnX + 13, spawnY + 6, 'sign_a');

    for (let i = 0; i < 10; i++) {
      const hash = hashPosition('meadowflower', i, 7);
      const x = 6 + (hash % (w - 12));
      const y = 6 + (hashPosition('meadowflower2', i, 3) % (h - 12));
      const kinds = ['flower_patch_a', 'flower_patch_b', 'flower_patch_c', 'flower_patch_d'];

      if (y > spawnY - 3 && y < spawnY + 8) continue;

      place(x, y, kinds[hash % 4], DECOR_SPANS[kinds[hash % 4]]);
    }
  } else if (mapId === 'forest') {
    put(spawnX - 8, spawnY + 3, 'wooden_fence_h1');
    put(spawnX - 6, spawnY + 3, 'wooden_fence_pole1');
    put(spawnX - 5, spawnY + 3, 'wooden_fence_h1');
    put(spawnX + 1, spawnY + 3, 'wooden_fence_h1');
    put(spawnX + 3, spawnY + 3, 'wooden_fence_pole1');
    put(spawnX + 4, spawnY + 3, 'wooden_fence_h1');
    put(spawnX - 12, spawnY - 4, 'barrel');
    put(spawnX + 9, spawnY - 6, 'crate');
    put(spawnX + 14, spawnY + 2, 'sign_a');

    for (let i = 0; i < 6; i++) {
      const hash = hashPosition('forestcrate', i, 11);
      const x = 8 + (hash % (w - 16));
      const y = 8 + (hashPosition('forestcrate2', i, 5) % (h - 16));

      if (y > spawnY - 4 && y < spawnY + 6) continue;

      place(x, y, i % 2 ? 'barrel' : 'crate', 1);
    }
  } else if (mapId === 'peaks') {
    put(spawnX + 4, spawnY + 3, 'fence_winter_a');
    put(spawnX - 9, spawnY + 3, 'fence_winter_b');
    put(spawnX + 6, spawnY - 5, 'stone_wall_h1');
    put(spawnX + 3, spawnY - 5, 'stone_wall_pole1');
    put(spawnX + 1, spawnY - 5, 'stone_wall_h1');
    put(spawnX - 14, spawnY + 2, 'snowpony_a');
    put(spawnX + 16, spawnY - 8, 'snowpony_b');
    put(spawnX - 6, spawnY - 8, 'sign_winter');
    put(spawnX + 12, spawnY + 5, 'barrel');
  } else if (mapId === 'cave') {
    put(59, 33, 'crystal_lantern');
    put(51, 33, 'crystal_lantern');
    put(spawnX + 2, spawnY - 1, 'barrel');
    put(spawnX - 3, spawnY + 2, 'crate');

    for (let i = 0; i < 14; i++) {
      const hash = hashPosition('cavecrystal', i, 9);
      const x = 6 + (hash % (w - 12));
      const y = 6 + (hashPosition('cavecrystal2', i, 4) % (h - 12));
      const kinds = ['crystals_a', 'crystals_b', 'crystals_c'];

      place(x, y, kinds[hash % 3], 1);
    }

    for (let i = 0; i < 6; i++) {
      const hash = hashPosition('cavelantern', i, 21);
      const x = 10 + (hash % (w - 20));
      const y = 10 + (hashPosition('cavelantern2', i, 13) % (h - 20));

      place(x, y, 'crystal_lantern', 1);
    }
  }

  return placements;
}

export interface TreePlacement {
  x: number;
  y: number;
  kind: number;
}

export function treePlacements(map: MapDef, grid: Uint8Array): TreePlacement[] {
  const trees: TreePlacement[] = [];
  const { id, w, h, spawnY, spawnX, portals, weather } = map;
  const density = weather === 'fog' ? 30 : weather === 'snow' ? 10 : 8;

  for (let gy = 2; gy < h - 2; gy++) {
    for (let gx = 2; gx < w - 2; gx++) {
      const hash = hashPosition(id, gx, gy);

      if (hash % 100 >= density) {
        continue;
      }

      if (Math.abs(gy - spawnY) <= 1) continue;

      if (grid[gx + gy * w] !== T_GRASS) continue;

      const nearPortal = portals.some(p => Math.abs(p.x - gx) < 4 && Math.abs(p.y - gy) < 4);
      const nearSpawn = Math.abs(gx - spawnX) < 5 && Math.abs(gy - spawnY) < 5;

      if (nearPortal || nearSpawn) continue;

      trees.push({ x: gx, y: gy, kind: hash % 3 });
    }
  }

  return trees;
}

export interface WorldData {
  grid: Uint8Array;
  walls: Uint8Array;
  blocked: Uint8Array;
  decor: DecorPlacement[];
  trees: TreePlacement[];
}

export function buildWorld(map: MapDef): WorldData {
  const { w, h } = map;
  const grid = buildGrid(map);
  const walls = buildWalls(map, grid);
  const blocked = new Uint8Array(w * h);

  for (let i = 0; i < blocked.length; i++) {
    blocked[i] = grid[i] === T_WATER || walls[i] === 1 ? 1 : 0;
  }

  const decor = decorPlacements(map, grid, walls);

  for (const item of decor) {
    if (!DECOR_SOLID[item.kind]) continue;

    const span = DECOR_SPANS[item.kind] || 1;

    for (let i = 0; i < span; i++) {
      const tx = item.x + i;

      if (tx >= 0 && tx < w) {
        blocked[tx + item.y * w] = 1;
      }
    }
  }

  const trees = treePlacements(map, grid);

  for (const tree of trees) {
    blocked[tree.x + tree.y * w] = 1;
  }

  return { grid, walls, blocked, decor, trees };
}

export function isBlockedTile(blocked: Uint8Array, map: MapDef, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;

  return blocked[tx + ty * map.w] === 1;
}

export interface PathPoint {
  x: number;
  y: number;
}

export function findPath(blocked: Uint8Array, map: MapDef, sx: number, sy: number, tx: number, ty: number): PathPoint[] {
  const { w, h } = map;
  const clampV = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
  const sxT = clampV(Math.round(sx), 0, w - 1);
  const syT = clampV(Math.round(sy), 0, h - 1);
  const start = sxT + syT * w;
  let gx = clampV(Math.round(tx), 0, w - 1);
  let gy = clampV(Math.round(ty), 0, h - 1);

  if (blocked[start] === 1) return [];

  if (blocked[gx + gy * w] === 1) {
    let best = -1;
    let bestDist = Infinity;

    for (let r = 1; r <= 4 && best < 0; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = gx + dx;
          const y = gy + dy;

          if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;

          const i = x + y * w;

          if (blocked[i] === 1) continue;

          const d = dx * dx + dy * dy;

          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
      }
    }

    if (best < 0) return [];

    gx = best % w;
    gy = (best / w) | 0;
  }

  const goal = gx + gy * w;

  if (start === goal) return [];

  const prev = new Int32Array(w * h).fill(-1);
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  seen[start] = 1;
  let bestNode = start;
  let bestH = Infinity;

  while (head < tail) {
    const cur = queue[head++];

    if (cur === goal) {
      bestNode = goal;
      break;
    }

    const cx = cur % w;
    const cy = (cur / w) | 0;
    const dist = (cx - gx) * (cx - gx) + (cy - gy) * (cy - gy);

    if (dist < bestH) {
      bestH = dist;
      bestNode = cur;
    }

    const push = (next: number) => {
      if (!seen[next] && blocked[next] !== 1) {
        seen[next] = 1;
        prev[next] = cur;
        queue[tail++] = next;
      }
    };

    if (cx > 0) push(cur - 1);
    if (cx < w - 1) push(cur + 1);
    if (cy > 0) push(cur - w);
    if (cy < h - 1) push(cur + w);
  }

  const path: PathPoint[] = [];
  let node = bestNode;

  while (node !== start && node >= 0) {
    path.push({ x: node % w, y: (node / w) | 0 });
    node = prev[node];
  }

  path.reverse();
  return path;
}
