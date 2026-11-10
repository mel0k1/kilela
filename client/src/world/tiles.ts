import { Texture } from 'pixi.js';
import * as sprites from '../pony/pt/sprites';
import type { Sprite } from '../pony/pt/interfaces';
import { PonyBatch } from '../pony/batch';
import { WHITE } from '../pony/pt/compat';
import {
  hashPosition, buildGrid, buildWalls,
  T_NONE, T_GRASS, T_WATER, T_WOOD, T_DIRT, T_ICE, T_STONE,
  TILE_W, TILE_H,
} from '../../../shared/world';
import type { MapDef } from '../../../shared/protocol';

export { TILE_W, TILE_H };

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
    case T_STONE: return 10;
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
  walls: Uint8Array;
  indices: Int32Array;
  sets: Map<number, TileSet>;
  waterFrames: TileSet[];
}

function grassSet(name: string, tileSprites: { sprites: Sprite[]; palettes: Uint32Array[] }, paletteIndex: number): TileSet {
  return { name, sprites: tileSprites.sprites, palette: tileSprites.palettes[paletteIndex] };
}

function waterPaletteFor(mapId: string): Uint32Array {
  if (mapId === 'cave') return sprites.waterTiles1.palettes[3];
  const index = mapId === 'forest' ? 1 : 0;
  return sprites.waterTiles1.palettes[index];
}

export function createMapTiles(map: MapDef): MapTiles {
  const { id: mapId, w, h, spawnY } = map;
  const grid = buildGrid(map);
  const walls = buildWalls(map, grid);
  const sets = new Map<number, TileSet>();

  if (mapId === 'meadow') {
    sets.set(T_GRASS, grassSet(mapId + '_grassNew', sprites.grassTilesNew, 0));
    sets.set(T_DIRT, grassSet(mapId + '_dirt', sprites.grassTiles, 0));
  } else if (mapId === 'forest') {
    sets.set(T_GRASS, grassSet(mapId + '_grass', sprites.grassTiles, 0));
    sets.set(T_DIRT, grassSet(mapId + '_dirt', sprites.grassTiles, 0));
  } else if (mapId === 'cave') {
    sets.set(T_STONE, grassSet(mapId + '_cave', sprites.caveTiles, 0));
  } else {
    sets.set(T_GRASS, grassSet(mapId + '_snow', sprites.snowTiles, 0));
    sets.set(T_DIRT, grassSet(mapId + '_dirtSnow', sprites.snowTiles, 0));
  }

  sets.set(T_WOOD, grassSet(mapId + '_wood', sprites.woodTiles, 0));

  if (mapId === 'peaks') {
    sets.set(T_ICE, grassSet(mapId + '_ice', sprites.iceTiles, 0));
  }

  const waterPalette = waterPaletteFor(mapId);
  const waterFrames: TileSet[] = [sprites.waterTiles1, sprites.waterTiles2, sprites.waterTiles3, sprites.waterTiles4]
    .map((ts, i) => ({ name: `${mapId}_water${i + 1}`, sprites: ts.sprites, palette: waterPalette }));

  const indices = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      indices[x + y * w] = getTileIndex(grid, w, h, x, y, mapId);
    }
  }

  const background = mapId === 'meadow' ? '#5797c7' : mapId === 'forest' ? '#5e9463' : mapId === 'cave' ? '#141118' : '#a9b8c9';

  return { background, w, h, grid, walls, indices, sets, waterFrames };
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

export interface DecorSpriteDef {
  name: string;
  sprite: Sprite;
  shadow: Sprite | undefined;
  palette: Uint32Array;
  solid: boolean;
  ground: boolean;
}

interface DecorSource {
  color: Sprite;
  shadow?: Sprite | undefined;
  palettes?: Uint32Array[] | undefined;
}

const decorDefs = new Map<string, DecorSpriteDef>();

function defineDecor(
  name: string,
  source: DecorSource,
  paletteIndex: number,
  options: { solid?: boolean; ground?: boolean } = {},
) {
  decorDefs.set(name, {
    name,
    sprite: source.color,
    shadow: source.shadow,
    palette: (source.palettes?.[paletteIndex] || new Uint32Array(0)) as Uint32Array,
    solid: options.solid ?? false,
    ground: options.ground ?? false,
  });
}

let decorReady = false;

function ensureDecorDefs() {
  if (decorReady) return;

  decorReady = true;
  defineDecor('fence_a', sprites.fence_1, 0, { solid: true });
  defineDecor('fence_b', sprites.fence_2, 0, { solid: true });
  defineDecor('fence_c', sprites.fence_3, 0, { solid: true });
  defineDecor('fence_winter_a', sprites.fence_winter_1, 0, { solid: true });
  defineDecor('fence_winter_b', sprites.fence_winter_2, 0, { solid: true });
  defineDecor('wooden_fence_h1', sprites.wooden_fence_horizontal1, 0, { solid: true });
  defineDecor('wooden_fence_pole1', sprites.wooden_fence_pole1, 0, { solid: true });
  defineDecor('stone_wall_h1', sprites.stone_wall_horizontal1, 0, { solid: true });
  defineDecor('stone_wall_pole1', sprites.stone_wall_pole1, 0, { solid: true });
  defineDecor('bench', sprites.bench_1, 0, { solid: true });
  defineDecor('barrel', sprites.barrel, 0, { solid: true });
  defineDecor('crate', sprites.crate_1, 0, { solid: true });
  defineDecor('sign_a', sprites.sign_1, 0, { solid: true });
  defineDecor('sign_b', sprites.sign_2, 0, { solid: true });
  defineDecor('sign_winter', sprites.sign_winter, 0, { solid: true });
  defineDecor('flower_patch_a', sprites.flower_patch4, 0, { ground: true });
  defineDecor('flower_patch_b', sprites.flower_patch5, 0, { ground: true });
  defineDecor('flower_patch_c', sprites.flower_patch6, 0, { ground: true });
  defineDecor('flower_patch_d', sprites.flower_patch7, 0, { ground: true });
  defineDecor('snowpony_a', sprites.snowpony_2, 0);
  defineDecor('snowpony_b', sprites.snowpony_5, 0);
  defineDecor('crystals_a', sprites.crystals_1, 0, { solid: true });
  defineDecor('crystals_b', sprites.crystals_4, 0, { solid: true });
  defineDecor('crystals_c', sprites.crystals_7, 0, { solid: true });
  defineDecor('crystal_lantern', sprites.crystal_lantern, 0, { solid: true });
  defineDecor('mine_entrance', sprites.mine_entrance, 0, { solid: true });
}

const decorTextures = new Map<string, Texture>();

export function decorTexture(name: string): Texture {
  ensureDecorDefs();
  const cached = decorTextures.get(name);

  if (cached) return cached;

  const def = decorDefs.get(name);

  if (!def) return Texture.WHITE;

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
  decorTextures.set(name, baked);
  return baked;
}

export function isGroundDecor(name: string): boolean {
  ensureDecorDefs();
  return decorDefs.get(name)?.ground ?? false;
}

export interface WallPiece {
  kind: 'face' | 'rim';
  variant: string;
  tx: number;
  ty: number;
}

const WALL_FACE_STRAIGHT = ['cave_s1', 'cave_s2', 'cave_s3', 'cave_sb'] as const;
const RIM_KINDS = {
  n: 'cave_top_n',
  nw: 'cave_top_nw',
  ne: 'cave_top_ne',
  w: 'cave_top_w',
  e: 'cave_top_e',
} as const;

const wallSources: Record<string, DecorSource> = {
  cave_s1: sprites.cave_walls_s1,
  cave_s2: sprites.cave_walls_s2,
  cave_s3: sprites.cave_walls_s3,
  cave_sb: sprites.cave_walls_sb,
  cave_sw: sprites.cave_walls_sw,
  cave_se: sprites.cave_walls_se,
  cave_top_n: sprites.cave_walls_top_n,
  cave_top_nw: sprites.cave_walls_top_nw,
  cave_top_ne: sprites.cave_walls_top_ne,
  cave_top_w: sprites.cave_walls_top_w,
  cave_top_e: sprites.cave_walls_top_e,
};

const wallTextureCache = new Map<string, Texture>();

export function wallTexture(variant: string): Texture {
  const cached = wallTextureCache.get(variant);

  if (cached) return cached;

  const source = wallSources[variant];

  if (!source) return Texture.WHITE;

  const sprite = source.color;
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const batch = new PonyBatch(canvas);
  batch.drawSprite(sprite, WHITE, (source.palettes?.[0] || new Uint32Array(0)) as Uint32Array, 0, 0);
  batch.flush();

  const baked = Texture.from(canvas);
  wallTextureCache.set(variant, baked);
  return baked;
}

export function wallSpriteSize(variant: string): { w: number; h: number; oy: number } {
  const source = wallSources[variant];

  if (!source) return { w: TILE_W, h: TILE_H, oy: 0 };

  return { w: source.color.w, h: source.color.h, oy: source.color.oy };
}

export function buildWallPieces(tiles: MapTiles, map: MapDef): WallPiece[] {
  const pieces: WallPiece[] = [];

  if (map.id !== 'cave') return pieces;

  const { w, h } = map;
  const wall = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && tiles.walls[x + y * w] === 1;
  const floorAt = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && tiles.walls[x + y * w] === 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!wall(x, y)) continue;

      const floorS = floorAt(x, y + 1);
      const floorN = floorAt(x, y - 1);
      const floorW = floorAt(x - 1, y);
      const floorE = floorAt(x + 1, y);

      if (floorS) {
        const runW = wall(x - 1, y) && !wall(x - 1, y + 1);
        const runE = wall(x + 1, y) && !wall(x + 1, y + 1);
        let variant: string;

        if (!runW && !runE) {
          variant = 'cave_sb';
        } else if (!runW) {
          variant = 'cave_sw';
        } else if (!runE) {
          variant = 'cave_se';
        } else {
          variant = WALL_FACE_STRAIGHT[hashPosition('wallface', x, y) % 3];
        }

        pieces.push({ kind: 'face', variant, tx: x, ty: y });
      } else {
        for (let k = 2; k <= 3; k++) {
          const deepFloor = floorAt(x, y + k) && wall(x, y + 1);

          if (deepFloor) {
            const variant = WALL_FACE_STRAIGHT[hashPosition('wallface2', x, y) % 3];
            pieces.push({ kind: 'face', variant, tx: x, ty: y + k - 1 });
            break;
          }
        }

        if (floorN && floorW) {
          pieces.push({ kind: 'rim', variant: RIM_KINDS.nw, tx: x, ty: y });
        } else if (floorN && floorE) {
          pieces.push({ kind: 'rim', variant: RIM_KINDS.ne, tx: x, ty: y });
        } else if (floorN) {
          pieces.push({ kind: 'rim', variant: RIM_KINDS.n, tx: x, ty: y });
        } else if (floorW) {
          pieces.push({ kind: 'rim', variant: RIM_KINDS.w, tx: x, ty: y });
        } else if (floorE) {
          pieces.push({ kind: 'rim', variant: RIM_KINDS.e, tx: x, ty: y });
        }
      }
    }
  }

  return pieces;
}

export interface ObjectSpriteDef {
  name: string;
  sprite: Sprite;
  shadow: Sprite | undefined;
  palette: Uint32Array;
}

const objects = new Map<string, ObjectSpriteDef>();

function defineObject(name: string, source: DecorSource, paletteIndex: number) {
  objects.set(name, {
    name,
    sprite: source.color,
    shadow: source.shadow,
    palette: (source.palettes?.[paletteIndex] || new Uint32Array(0)) as Uint32Array,
  });
}

export function objectDefs(mapId: string): string[] {
  if (mapId === 'meadow') return ['tree_big', 'tree_mid', 'bush'];
  if (mapId === 'forest') return ['tree_forest', 'tree_mid_forest', 'bush_forest'];
  if (mapId === 'cave') return ['crystal_stone'];
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
  defineObject('crystal_stone', sprites.rock_1, 0);
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
