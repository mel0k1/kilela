export const TILE = 32;

function mulberry32(seed: number) {
  let a = seed;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')!];
}

export interface MapPalette {
  ground: string;
  groundAlt: string;
  path: string;
  detail: string[];
  treeTrunk: string;
  treeCrown: string[];
}

export const MAP_PALETTES: Record<string, MapPalette> = {
  meadow: {
    ground: '#9ed86f',
    groundAlt: '#8fc95f',
    path: '#d8c49a',
    detail: ['#ffe08a', '#ff8ac2', '#fff5f5', '#f1d224'],
    treeTrunk: '#8a5a3b',
    treeCrown: ['#5fae4a', '#6fbe55', '#4f9e40'],
  },
  forest: {
    ground: '#5f9463',
    groundAlt: '#528557',
    path: '#b3a284',
    detail: ['#8ac26f', '#c96f6f', '#e8d9a0'],
    treeTrunk: '#5a4432',
    treeCrown: ['#3e7a48', '#4a8a52', '#356e40'],
  },
  peaks: {
    ground: '#eef4fa',
    groundAlt: '#dfe9f4',
    path: '#c9d4e2',
    detail: ['#ffffff', '#cfe4f8', '#bcd8f0'],
    treeTrunk: '#6b5a4a',
    treeCrown: ['#3e6e58', '#4a7e64', '#356050'],
  },
};

export function makeTileTexture(mapId: string, variant: number): HTMLCanvasElement {
  const pal = MAP_PALETTES[mapId] || MAP_PALETTES.meadow;
  const [canvas, ctx] = makeCanvas(TILE, TILE);
  const rand = mulberry32(variant * 7919 + mapId.length * 131);

  ctx.fillStyle = variant === 0 ? pal.ground : pal.groundAlt;
  ctx.fillRect(0, 0, TILE, TILE);

  for (let i = 0; i < 7; i++) {
    const x = rand() * TILE;
    const y = rand() * TILE;
    ctx.fillStyle = rand() < 0.5 ? pal.groundAlt : pal.ground;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
  }

  ctx.globalAlpha = 1;

  if (rand() < 0.6) {
    ctx.fillStyle = pal.detail[Math.floor(rand() * pal.detail.length)];
    const x = 4 + rand() * (TILE - 8);
    const y = 4 + rand() * (TILE - 8);
    ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);

    if (mapId === 'meadow') {
      ctx.fillRect(Math.floor(x) - 1, Math.floor(y) + 1, 4, 1);
    }
  }

  return canvas;
}

export function makePathTexture(mapId: string): HTMLCanvasElement {
  const pal = MAP_PALETTES[mapId] || MAP_PALETTES.meadow;
  const [canvas, ctx] = makeCanvas(TILE, TILE);
  const rand = mulberry32(mapId.length * 977 + 5);

  ctx.fillStyle = pal.path;
  ctx.fillRect(0, 0, TILE, TILE);

  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)';
    ctx.fillRect(Math.floor(rand() * TILE), Math.floor(rand() * TILE), 3, 2);
  }

  return canvas;
}

export function makeTreeTexture(mapId: string, kind: number): HTMLCanvasElement {
  const pal = MAP_PALETTES[mapId] || MAP_PALETTES.meadow;
  const w = 64;
  const h = 80;
  const [canvas, ctx] = makeCanvas(w, h);
  const rand = mulberry32(kind * 613 + mapId.length * 17);

  ctx.fillStyle = pal.treeTrunk;
  ctx.fillRect(w / 2 - 5, h - 26, 10, 26);
  ctx.fillRect(w / 2 - 8, h - 8, 16, 5);

  if (mapId === 'peaks') {
    ctx.fillStyle = pal.treeCrown[0];
    ctx.beginPath();
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2 + 20, h - 22);
    ctx.lineTo(w / 2 - 20, h - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.treeCrown[1];
    ctx.beginPath();
    ctx.moveTo(w / 2, 18);
    ctx.lineTo(w / 2 + 15, h - 30);
    ctx.lineTo(w / 2 - 15, h - 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2 + 9, 22);
    ctx.lineTo(w / 2 - 9, 22);
    ctx.closePath();
    ctx.fill();
  } else {
    const crownColors = pal.treeCrown;

    for (let i = 0; i < 4; i++) {
      const cx = w / 2 + (rand() * 24 - 12);
      const cy = 22 + rand() * 22;
      const r = 14 + rand() * 10;
      ctx.fillStyle = crownColors[Math.floor(rand() * crownColors.length)];
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}

export function makeSoftCircleTexture(size: number, color: string): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function makeGlowTexture(): HTMLCanvasElement {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);

  grad.addColorStop(0, 'rgba(255,240,190,0.95)');
  grad.addColorStop(0.4, 'rgba(255,220,150,0.45)');
  grad.addColorStop(1, 'rgba(255,210,130,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

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
