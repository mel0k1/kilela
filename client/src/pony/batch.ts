import type { Sprite } from './pt/interfaces';
import { paletteSheet } from './atlas';

export type Mat2D = [number, number, number, number, number, number];

export function identityMat2D(): Mat2D {
  return [1, 0, 0, 1, 0, 0];
}

export function copyMat2D(out: Mat2D, m: Mat2D): Mat2D {
  out[0] = m[0]; out[1] = m[1]; out[2] = m[2]; out[3] = m[3]; out[4] = m[4]; out[5] = m[5];
  return out;
}

export function translateMat2D(out: Mat2D, m: Mat2D, x: number, y: number): Mat2D {
  out[4] = m[0] * x + m[2] * y + m[4];
  out[5] = m[1] * x + m[3] * y + m[5];
  return out;
}

export function multiplyMat2D(out: Mat2D, a: Mat2D, b: Mat2D): Mat2D {
  const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
  out[0] = a0 * b[0] + a1 * b[2];
  out[1] = a0 * b[1] + a1 * b[3];
  out[2] = a2 * b[0] + a3 * b[2];
  out[3] = a2 * b[1] + a3 * b[3];
  out[4] = a4 * b[0] + a5 * b[2] + b[4];
  out[5] = a4 * b[1] + a5 * b[3] + b[5];
  return out;
}

export function rotateMat2D(out: Mat2D, m: Mat2D, angle: number): Mat2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rot: Mat2D = [cos, sin, -sin, cos, 0, 0];
  return multiplyMat2D(out, rot, m);
}

export function scaleMat2D(out: Mat2D, m: Mat2D, sx: number, sy: number): Mat2D {
  const scale: Mat2D = [sx, 0, 0, sy, 0, 0];
  return multiplyMat2D(out, scale, m);
}

function isTranslation(m: Mat2D): boolean {
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
}

const typeOffsets = [0, 2, 3, 0, 1, 2, 3];

function blendColor(base: number, tint: number, shade: number): number {
  return (((((base * tint) | 0) * shade) | 0) / 65025) | 0;
}

function blendPrecise(dstData: Uint8ClampedArray, dst0: number, r: number, g: number, b: number, alpha: number) {
  if (alpha === 0xff || dstData[dst0 + 3] === 0) {
    dstData[dst0] = r;
    dstData[dst0 + 1] = g;
    dstData[dst0 + 2] = b;
    dstData[dst0 + 3] = alpha;
  } else {
    const dstAlpha = (0xff - alpha) | 0;
    dstData[dst0] = ((((r * alpha) | 0) / 255) | 0) + ((((dstData[dst0] * dstAlpha) | 0) / 255) | 0);
    dstData[dst0 + 1] = ((((g * alpha) | 0) / 255) | 0) + ((((dstData[dst0 + 1] * dstAlpha) | 0) / 255) | 0);
    dstData[dst0 + 2] = ((((b * alpha) | 0) / 255) | 0) + ((((dstData[dst0 + 2] * dstAlpha) | 0) / 255) | 0);
    const a = (alpha + ((((dstData[dst0 + 3] * dstAlpha) | 0) / 255) | 0)) | 0;
    dstData[dst0 + 3] = a > 0xff ? 0xff : a;
  }
}

export class PonyBatch {
  readonly canvas: HTMLCanvasElement;
  private data: ImageData;
  private context: CanvasRenderingContext2D;
  private transformStack: Mat2D[] = [];
  transform: Mat2D = identityMat2D();
  paletteSheetData: ImageData | undefined;
  palette = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { willReadFrequently: true })!;
    this.data = this.context.createImageData(canvas.width, canvas.height);
  }

  clear() {
    const d = this.data.data;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
    }
  }

  flush() {
    this.context.putImageData(this.data, 0, 0);
  }

  save() {
    this.transformStack.push([...this.transform] as Mat2D);
  }

  restore() {
    const top = this.transformStack.pop();

    if (top) {
      this.transform = top;
    }
  }

  translate(x: number, y: number) {
    translateMat2D(this.transform, this.transform, x, y);
  }

  multiplyTransform(m: Mat2D) {
    multiplyMat2D(this.transform, this.transform, m);
  }

  drawSprite(s: Sprite, color: number, palette: Uint32Array | undefined, x: number, y: number) {
    const sheetData = this.paletteSheetData || paletteSheet.data;

    if (!s || !sheetData) return;

    const paletteColors = palette;
    const transform = this.transform;
    const src = sheetData.data;
    const dst = this.data.data;
    const dstWidth = this.data.width;
    const srcWidth = sheetData.width;
    const tintR = (color >>> 24) & 0xff;
    const tintG = (color >>> 16) & 0xff;
    const tintB = (color >>> 8) & 0xff;
    const alpha = color & 0xff;
    const disableShading = s.type > 2;
    const offset = typeOffsets[s.type] || 0;

    if (isTranslation(transform)) {
      const dx = Math.round(x + s.ox + transform[4]);
      const dy = Math.round(y + s.oy + transform[5]);
      let sx = s.x;
      let sy = s.y;
      let w = s.w;
      let h = s.h;

      if (dx < 0) {
        w += dx;
        sx -= dx;

        if (w <= 0) return;
      }

      if (dy < 0) {
        h += dy;
        sy -= dy;

        if (h <= 0) return;
      }

      if (dx + w > dstWidth) {
        w = dstWidth - dx;

        if (w <= 0) return;
      }

      if (dy + h > this.data.height) {
        h = this.data.height - dy;

        if (h <= 0) return;
      }

      for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
          const srcO = ((sx + ix) + (sy + iy) * srcWidth) << 2;
          const index = src[srcO + offset];
          const paletteColor = paletteColors ? (paletteColors[index] || 0) : 0xffffffff;
          const pAlpha = paletteColor & 0xff;

          if (pAlpha === 0) continue;

          const srcAlpha = blendColor(pAlpha, alpha, 255);

          if (srcAlpha === 0) continue;

          const shade = disableShading ? 255 : src[srcO + 1];
          const rr = blendColor((paletteColor >>> 24) & 0xff, tintR, shade);
          const gg = blendColor((paletteColor >>> 16) & 0xff, tintG, shade);
          const bb = blendColor((paletteColor >>> 8) & 0xff, tintB, shade);
          const dst0 = ((dx + ix) + (dy + iy) * dstWidth) << 2;
          blendPrecise(dst, dst0, rr, gg, bb, srcAlpha);
        }
      }

      return;
    }

    for (let iy = 0; iy < s.h; iy++) {
      for (let ix = 0; ix < s.w; ix++) {
        const srcO = ((s.x + ix) + (s.y + iy) * srcWidth) << 2;
        const index = src[srcO + offset];
        const paletteColor = paletteColors ? (paletteColors[index] || 0) : 0xffffffff;
        const pAlpha = paletteColor & 0xff;

        if (pAlpha === 0) continue;

        const srcAlpha = blendColor(pAlpha, alpha, 255);

        if (srcAlpha === 0) continue;

        const shade = disableShading ? 255 : src[srcO + 1];
        const rr = blendColor((paletteColor >>> 24) & 0xff, tintR, shade);
        const gg = blendColor((paletteColor >>> 16) & 0xff, tintG, shade);
        const bb = blendColor((paletteColor >>> 8) & 0xff, tintB, shade);
        const px = x + s.ox + ix;
        const py = y + s.oy + iy;
        const tx = Math.round(px * transform[0] + py * transform[2] + transform[4]);
        const ty = Math.round(px * transform[1] + py * transform[3] + transform[5]);

        if (tx >= 0 && ty >= 0 && tx < dstWidth && ty < this.data.height) {
          const dst0 = (tx + ty * dstWidth) << 2;
          blendPrecise(dst, dst0, rr, gg, bb, srcAlpha);
        }
      }
    }
  }
}
