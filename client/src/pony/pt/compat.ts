export const TRANSPARENT = 0;
export const WHITE = 0xffffffff;
export const BLACK = 0x000000ff;

export const SHADOW_COLOR = 0x0000004d;
export const SHINES_COLOR = 0xffffff66;
export const FAR_COLOR = 0xccccccff;
export const HEARTS_COLOR = 0xf15f9dff;

export function getR(color: number): number {
  return (color >>> 24) & 0xff;
}

export function getG(color: number): number {
  return (color >>> 16) & 0xff;
}

export function getB(color: number): number {
  return (color >>> 8) & 0xff;
}

export function getAlpha(color: number): number {
  return color & 0xff;
}

export function colorFromRGBA(r: number, g: number, b: number, a: number): number {
  return (((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff)) >>> 0;
}

export function colorToCSS(color: number): string {
  const r = getR(color);
  const g = getG(color);
  const b = getB(color);
  const a = getAlpha(color);

  if (a === 0xff) {
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  }

  return `rgba(${r},${g},${b},${a / 255})`;
}

function hex2(v: number): string {
  return v.toString(16).padStart(2, '0');
}

export function withAlphaFloat(color: number, alpha: number): number {
  return ((color & 0xffffff00) | ((alpha * 255) & 0xff)) >>> 0;
}

export function darkenForOutline(color: number): number {
  const mult = 159 / 255;
  const r = (mult * getR(color)) | 0;
  const g = (mult * getG(color)) | 0;
  const b = (mult * getB(color)) | 0;
  const a = getAlpha(color);
  return colorFromRGBA(r, g, b, a);
}

export function parseSpriteColor(str: string): number {
  return str === '0' ? 0 : str.length === 6 ? ((parseInt(str, 16) << 8) | 0xff) >>> 0 : parseInt(str, 16) >>> 0;
}

export type ReadBits = (bits: number) => number;

export function bitReaderCustom(readByte: () => number): ReadBits {
  let byte = 0;
  let byteBits = 0;

  return bits => {
    let result = 0;

    while (bits) {
      if (!byteBits) {
        byte = readByte();
        byteBits = 8;
      }

      const readBits = byteBits < bits ? byteBits : bits;
      const read = (byte >> (byteBits - readBits)) & (0xff >> (8 - readBits));
      result = (result << readBits) | read;
      bits -= readBits;
      byteBits -= readBits;
    }

    return result >>> 0;
  };
}

export type WriteBits = (value: number, bits: number) => void;

export function bitWriter(writes: (writer: WriteBits) => void): Uint8Array {
  let buffer = new Uint8Array(64);
  let length = 0;
  let byte = 0;
  let byteBits = 0;

  function writeByte(value: number) {
    if (buffer.length <= length) {
      const newBuffer = new Uint8Array(buffer.length * 2);
      newBuffer.set(buffer);
      buffer = newBuffer;
    }

    buffer[length] = value;
    length++;
  }

  writes((value, bits) => {
    while (bits) {
      const revByteBits = 8 - byteBits;
      const writeBits = revByteBits < bits ? revByteBits : bits;
      const write = (value >> (bits - writeBits)) & (0xff >> (8 - writeBits));
      byte |= write << (revByteBits - writeBits);
      byteBits += writeBits;
      bits -= writeBits;

      if (byteBits === 8) {
        writeByte(byte);
        byte = 0;
        byteBits = 0;
      }
    }
  });

  if (byteBits) {
    writeByte(byte);
  }

  return buffer.subarray(0, length);
}

export function toInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return value > min ? (value < max ? value : max) : min;
}

export function repeat<T>(count: number, ...values: T[]): T[] {
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    result.push(...values);
  }

  return result;
}

export function flatten<T>(items: T[][]): T[] {
  return ([] as T[]).concat(...items);
}
