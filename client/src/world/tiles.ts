import { Texture } from 'pixi.js';
import * as sprites from '../pony/pt/sprites';
import type { Sprite } from '../pony/pt/interfaces';
import { PonyBatch } from '../pony/batch';
import { WHITE } from '../pony/pt/compat';
import { hashPosition } from './scenery';
import type { MapDef } from '../../../shared/protocol';

export const TILE_W = 32;
export const TILE_H = 24;

const T_NONE = 0;
const T_GRASS = 1;
const T_WATER = 2;
const T_WOOD = 3;
const T_DIRT = 4;
const T_ICE = 8;

const TILE_COUNTS: [number, number][] = [[0, 4], [2, 3], [4, 3], [6, 3], [8, 3], [13, 3], [14, 3], [47, 4]];
export const TILE_COUNT_MAP: number[] = [];
export const TILE_MAP_MAP: number[] = [];

TILE_COUNTS.forEach(([tile, count]) => {
  while (TILE_COUNT_MAP.length < tile + 1) {
    TILE_COUNT_MAP.push(1);
  }

  TILE_COUNT_MAP[tile] = count;
});

{
  let tileIndex = 0;

  for (let i = 0; i <= 47; i++) {
    TILE_MAP_MAP.push(tileIndex);
    tileIndex += TILE_COUNT_MAP[i];
  }
}

//   1 |  2 |   4
// ----+----+----
//   8 |    |  16
// ----+----+----
//  32 | 64 | 128
export const TILE_MAP = [
  46, 46, 22, 22, 46, 46, 22, 22, 21, 21,
  17, 11, 21, 21, 17, 11, 19, 19, 18, 18,
  19, 19, 12, 12, 14, 14, 24, 28, 14, 14,
  30, 6, 46, 46, 22, 22, 46, 46, 22, 22,
  21, 21, 17, 11, 21, 21, 17, 11, 19, 19,
  18, 18, 19, 19, 12, 12, 14, 14, 24, 28,
  14, 14, 30, 6, 20, 20, 13, 13, 20, 20,
  13, 13, 16, 16, 23, 32, 16, 16, 23, 32,
  15, 15, 25, 25, 15, 15, 34, 34, 26, 26,
  45, 41, 26, 26, 42, 36, 20, 20, 13, 13,
  20, 20, 13, 13, 10, 10, 31, 4, 10, 10,
  31, 4, 15, 15, 25, 25, 15, 15, 34, 34,
  27, 27, 43, 37, 27, 27, 35, 5, 46, 46,
  22, 22, 46, 46, 22, 22, 21, 21, 17, 11,
  21, 21, 17, 11, 19, 19, 18, 18, 19, 19,
  12, 12, 14, 14, 24, 28, 14, 14, 30, 6,
  46, 46, 22, 22, 46, 46, 22, 22, 21, 21,
  17, 11, 21, 21, 17, 11, 19, 19, 18, 18,
  19, 19, 12, 12, 14, 14, 24, 28, 14, 14,
  30, 6, 20, 20, 13, 13, 20, 20, 13, 13,
  16, 16, 23, 32, 16, 16, 23, 32, 9, 9,
  33, 33, 9, 9, 8, 8, 29, 29, 44, 39,
  29, 29, 38, 7, 20, 20, 13, 13, 20, 20,
  13, 13, 10, 10, 31, 4, 10, 10, 31, 4,
  9, 9, 33, 33, 9, 9, 8, 8, 2, 2,
  40, 3, 2, 2, 1, 0,
];

function tileTypeNumber(type: number): number {
  switch (type) {
    case T_WATER: return 2;
    case T_WOOD: return 3;
    case T_ICE: return 8;
    case T_DIRT: return 4;
    case T_GRASS: return 1;
    default: return 0;
  }
}

function clampInt(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export interface TileSet {
  name: string;
  sprites: Sprite[];
  palette: Uint32Array;
}

export interface MapTiles {
  background: string;
  w: number;
  h: number;
  grid: Uint8Array;
  indices: Int32Array;
  sets: Map<number, TileSet>;
  waterFrames: TileSet[];
}

function grassSet(name: string, tileSprites: { sprites: Sprite[]; palettes: Uint32Array[] }, paletteIndex: number): TileSet {
  return { name, sprites: tileSprites.sprites, palette: tileSprites.palettes[paletteIndex] };
}

function waterPaletteFor(mapId: string): Uint32Array {
  const index = mapId === 'forest' ? 1 : 0;
  return sprites.waterTiles1.palettes[index];
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

function buildGrid(map: MapDef): Uint8Array {
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

  return grid;
}

export function createMapTiles(map: MapDef): MapTiles {
  const { id: mapId, w, h, spawnY } = map;
  const grid = buildGrid(map);
  const sets = new Map<number, TileSet>();

  if (mapId === 'meadow') {
    sets.set(T_GRASS, grassSet('grassNew', sprites.grassTilesNew, 0));
    sets.set(T_DIRT, grassSet('dirt', sprites.grassTiles, 0));
  } else if (mapId === 'forest') {
    sets.set(T_GRASS, grassSet('grass', sprites.grassTiles, 0));
    sets.set(T_DIRT, grassSet('dirt', sprites.grassTiles, 0));
  } else {
    sets.set(T_GRASS, grassSet('snow', sprites.snowTiles, 0));
    sets.set(T_DIRT, grassSet('dirtSnow', sprites.snowTiles, 0));
  }

  sets.set(T_WOOD, grassSet('wood', sprites.woodTiles, 0));

  if (mapId === 'peaks') {
    sets.set(T_ICE, grassSet('ice', sprites.iceTiles, 0));
  }

  const waterPalette = waterPaletteFor(mapId);
  const waterFrames: TileSet[] = [sprites.waterTiles1, sprites.waterTiles2, sprites.waterTiles3, sprites.waterTiles4]
    .map((ts, i) => ({ name: `water${i + 1}`, sprites: ts.sprites, palette: waterPalette }));

  const indices = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      indices[x + y * w] = getTileIndex(grid, w, h, x, y, mapId);
    }
  }

  const background = mapId === 'meadow' ? '#5797c7' : mapId === 'forest' ? '#5e9463' : '#a9b8c9';

  return { background, w, h, grid, indices, sets, waterFrames };
}

function getTileIndex(grid: Uint8Array, w: number, h: number, x: number, y: number, mapId: string): number {
  const type = grid[x + y * w];
  const typeNumber = tileTypeNumber(type);
  let baseTileIndex = 0;

  if (type === T_DIRT) {
    baseTileIndex = 47;
  } else if (type !== T_NONE) {
    const at = (nx: number, ny: number) =>
      grid[clampInt(nx, 0, w - 1) + clampInt(ny, 0, h - 1) * w] === type ? 1 : 0;

    const index = 0
      | (at(x - 1, y - 1) << 0)
      | (at(x, y - 1) << 1)
      | (at(x + 1, y - 1) << 2)
      | (at(x - 1, y) << 3)
      | (at(x + 1, y) << 4)
      | (at(x - 1, y + 1) << 5)
      | (at(x, y + 1) << 6)
      | (at(x + 1, y + 1) << 7);

    baseTileIndex = TILE_MAP[index];
  }

  const count = type !== T_NONE ? TILE_COUNT_MAP[baseTileIndex] : 1;
  const rand = hashPosition(mapId + 'tile', x, y);
  const tileIndex = TILE_MAP_MAP[baseTileIndex] + (count > 1 ? rand % count : 0);
  return (typeNumber << 8) | tileIndex;
}

const textureCache = new Map<string, Texture>();

function bakeTileTexture(set: TileSet, spriteIndex: number): Texture {
  const key = `${set.name}:${spriteIndex}`;
  const cached = textureCache.get(key);

  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = TILE_W;
  canvas.height = TILE_H;
  const batch = new PonyBatch(canvas);
  const sprite = set.sprites[spriteIndex];

  if (sprite) {
    batch.drawSprite(sprite, WHITE, set.palette, 0, 0);
  }

  batch.flush();
  const texture = Texture.from(canvas);
  textureCache.set(key, texture);
  return texture;
}

export function tileTexture(tiles: MapTiles, tileIndex: number, waterFrame: number): Texture {
  const typeNumber = tileIndex >>> 8;
  const spriteIndex = tileIndex & 0xff;

  if (typeNumber === 2) {
    const set = tiles.waterFrames[waterFrame % tiles.waterFrames.length];
    return bakeTileTexture(set, spriteIndex);
  }

  const set = tiles.sets.get(typeNumber);

  if (!set) return Texture.WHITE;

  return bakeTileTexture(set, spriteIndex);
}

export interface ObjectSpriteDef {
  name: string;
  sprite: Sprite;
  shadow: Sprite | undefined;
  palette: Uint32Array;
}

const objects = new Map<string, ObjectSpriteDef>();

function defineObject(name: string, source: { color: Sprite; shadow?: Sprite; palettes: Uint32Array[] }, paletteIndex: number) {
  objects.set(name, {
    name,
    sprite: source.color,
    shadow: source.shadow,
    palette: source.palettes[paletteIndex],
  });
}

export function objectDefs(mapId: string): string[] {
  if (mapId === 'meadow') return ['tree_big', 'tree_mid', 'bush'];
  if (mapId === 'forest') return ['tree_forest', 'tree_mid_forest', 'bush_forest'];
  return ['tree_winter', 'rock_a', 'rock_b'];
}

function ensureObjects() {
  if (objects.size > 0) return;

  defineObject('tree_big', sprites.tree_3, 0);
  defineObject('tree_mid', sprites.tree_2, 0);
  defineObject('bush', sprites.large_leafed_bush_1, 0);
  defineObject('tree_forest', sprites.tree_3, 0);
  defineObject('tree_mid_forest', sprites.tree_2, 0);
  defineObject('bush_forest', sprites.large_leafed_bush_1, 0);
  defineObject('tree_winter', sprites.tree_3, 1);
  defineObject('rock_a', sprites.rock_1, 0);
  defineObject('rock_b', sprites.rock_2, 0);
}

const objectTextures = new Map<string, Texture>();

export function objectTexture(mapId: string, name: string): Texture {
  ensureObjects();
  const key = `${mapId}:${name}`;
  const cached = objectTextures.get(key);

  if (cached) return cached;

  const def = objects.get(name);
  const texture = Texture.WHITE;

  if (!def) return texture;

  const { sprite, shadow, palette } = def;
  const width = Math.max(sprite.w, shadow ? shadow.ox + shadow.w : 0) + 2;
  const height = Math.max(sprite.h, shadow ? shadow.oy + shadow.h : 0) + 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const batch = new PonyBatch(canvas);

  if (shadow) {
    batch.drawSprite(shadow, WHITE, palette, 0, 0);
  }

  batch.drawSprite(sprite, WHITE, palette, 0, 0);
  batch.flush();

  const baked = Texture.from(canvas);
  objectTextures.set(key, baked);
  return baked;
}

export function objectHeight(name: string): number {
  ensureObjects();
  const def = objects.get(name);
  return def ? def.sprite.h : 32;
}
