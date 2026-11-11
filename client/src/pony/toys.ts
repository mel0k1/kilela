import { TRANSPARENT, darkenForOutline } from './pt/compat';

export interface ToySprite {
  type: number;
  pattern: number;
  palette: Uint32Array;
}

function toySet(type: number, pattern: number, colors: number[]): ToySprite {
  const palette = new Uint32Array(colors.length * 2 + 1);

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    palette[i * 2 + 1] = color;
    palette[i * 2 + 2] = color === TRANSPARENT ? TRANSPARENT : darkenForOutline(color);
  }

  return { type, pattern, palette };
}

export const TOY_SPRITES: (ToySprite | undefined)[] = [
  undefined,
  toySet(2, 0, [0xffffffff, 0xff2525ff]),
  toySet(2, 0, [0xffffffff, 0x22ac22ff]),
  toySet(2, 0, [0xffffffff, 0x2e58f4ff]),
  toySet(2, 0, [0xffffffff, 0xff71ffff]),
  toySet(3, 0, [0xffffffff, 0x000000ff, 0xff9100ff, 0xff0000ff]),
  toySet(6, 0, [0xcf1717ff, 0xecd132ff]),
  toySet(6, 0, [0x7fc484ff, 0x4a79daff]),
  toySet(8, 0, [0xa86230ff, 0xdfbe8bff, TRANSPARENT, TRANSPARENT]),
  toySet(9, 0, [0xdce5edff, 0xffffffff, 0xff0000ff, 0xdfbe8bff, 0x645137ff]),
  toySet(11, 0, [0x1a9b2fff, 0x56c7ffff, 0xde4d68ff, 0xf1d224ff]),
  toySet(12, 0, [0x7b4b24ff, 0xcf0e0eff, 0xbfaa8cff]),
  toySet(16, 0, [0x7b4b24ff, 0xcf0e0eff, 0xbfaa8cff, 0xffffffff, 0x56c7ffff, 0xf1d224ff]),
  toySet(13, 0, [0xffffffff, 0xff1b1bff, TRANSPARENT, TRANSPARENT]),
  toySet(5, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0xb9c0d8ff, 0xffd94fff, 0xeca242ff]),
  toySet(7, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0xb9c0d8ff, 0xc0ccc4ff]),
  toySet(17, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0x000000ff, 0xe7b86fff, 0x3f1d0fff]),
  toySet(10, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0x000000ff]),
  toySet(14, 0, [0xffd94fff, 0xeca242ff]),
  toySet(15, 0, [0xffd94fff, 0xeca242ff]),
];
