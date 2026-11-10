import * as sprites from './pt/sprites';
import type { Expression, PaletteSpriteSet, ColorExtra, ColorExtraSets } from './pt/interfaces';
import { Eye, Iris, Muzzle, ExpressionExtra } from './pt/interfaces';
import { BLACK, TRANSPARENT, WHITE, darkenForOutline, bitWriter, bitReaderCustom, clamp } from './pt/compat';

export const CM_SIZE = 5;

export interface Look {
  coat: number;
  eyeWhite: number;
  eyeColor: number;
  eyelashes: number;
  expression: number;
  mane: number;
  maneColors: number[];
  backMane: number;
  backManeColors: number[];
  tail: number;
  tailColors: number[];
  muzzle: number;
  wings: number;
  wingsColor: number;
  horn: number;
  hooves: number;
  cm: number;
  cmColor: number;
  cmFlip: boolean;
  ears: number;
  facialHair: number;
  facialHairColors: number[];
  headAccessory: number;
  headAccessoryColor: number;
  chestAccessory: number;
  chestAccessoryColor: number;
  backAccessory: number;
  backAccessoryColor: number;
  legAccessory: number;
  legAccessoryColor: number;
}

export interface ExpressionPreset {
  name: string;
  label: string;
  expression: Expression;
}

export const EXPRESSION_PRESETS: ExpressionPreset[] = [
  { name: 'neutral', label: 'Спокойная', expression: { left: Eye.Neutral, leftIris: Iris.Forward, right: Eye.Neutral, rightIris: Iris.Forward, muzzle: Muzzle.Neutral, extra: ExpressionExtra.None } },
  { name: 'smile', label: 'Улыбка', expression: { left: Eye.Neutral, leftIris: Iris.Forward, right: Eye.Neutral, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.None } },
  { name: 'happy', label: 'Счастливая', expression: { left: Eye.ClosedHappy2, leftIris: Iris.Forward, right: Eye.ClosedHappy2, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.None } },
  { name: 'sad', label: 'Грустная', expression: { left: Eye.Sad, leftIris: Iris.Forward, right: Eye.Sad, rightIris: Iris.Forward, muzzle: Muzzle.Frown, extra: ExpressionExtra.None } },
  { name: 'angry', label: 'Сердитая', expression: { left: Eye.Angry, leftIris: Iris.Forward, right: Eye.Angry, rightIris: Iris.Forward, muzzle: Muzzle.Frown, extra: ExpressionExtra.None } },
  { name: 'wink', label: 'Подмигивает', expression: { left: Eye.Closed, leftIris: Iris.Forward, right: Eye.Neutral, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.None } },
  { name: 'sleepy', label: 'Сонная', expression: { left: Eye.Closed, leftIris: Iris.Forward, right: Eye.Closed, rightIris: Iris.Forward, muzzle: Muzzle.Neutral, extra: ExpressionExtra.Zzz } },
  { name: 'blush', label: 'Румяная', expression: { left: Eye.Neutral, leftIris: Iris.Forward, right: Eye.Neutral, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.Blush } },
];

export interface CutieMark {
  name: string;
  label: string;
  colors: Uint32Array;
}

function mark(rows: string[], color: number): Uint32Array {
  const result = new Uint32Array(CM_SIZE * CM_SIZE);

  for (let y = 0; y < CM_SIZE; y++) {
    for (let x = 0; x < CM_SIZE; x++) {
      result[y * CM_SIZE + x] = rows[y][x] === '#' ? color : TRANSPARENT;
    }
  }

  return result;
}

export const CUTIE_MARKS: CutieMark[] = [
  {
    name: 'heart', label: 'Сердечко',
    colors: mark(['.#.#.', '#####', '#####', '.###.', '..#..'], 0xf15f9dff),
  },
  {
    name: 'star', label: 'Звезда',
    colors: mark(['..#..', '.###.', '#####', '.###.', '#.#.#'], 0xffd94fff),
  },
  {
    name: 'note', label: 'Нотка',
    colors: mark(['..###', '..#.#', '..#.#', '###.#', '###..'], 0x9b59d0ff),
  },
  {
    name: 'sun', label: 'Солнце',
    colors: mark(['#.#.#', '.###.', '#####', '.###.', '#.#.#'], 0xffa500ff),
  },
  {
    name: 'flower', label: 'Цветок',
    colors: mark(['.#.#.', '.###.', '..#..', '.###.', '.#.#.'], 0xff8ac2ff),
  },
  {
    name: 'bolt', label: 'Молния',
    colors: mark(['...##', '..##.', '.###.', '##...', '#....'], 0xf1d224ff),
  },
  {
    name: 'apple', label: 'Яблоко',
    colors: mark(['.##..', '.###.', '#####', '#####', '.###.'], 0xcf1717ff),
  },
  {
    name: 'diamond', label: 'Кристалл',
    colors: mark(['..#..', '.###.', '.###.', '.###.', '..#..'], 0x56c7ffff),
  },
];

export const DEFAULT_LOOK: Look = {
  coat: 0xffe0b8ff,
  eyeWhite: WHITE,
  eyeColor: 0x2e58f4ff,
  eyelashes: 1,
  expression: 1,
  mane: 2,
  maneColors: [0x8a5a3bff],
  backMane: 1,
  backManeColors: [0x8a5a3bff],
  tail: 1,
  tailColors: [0x8a5a3bff],
  muzzle: 0,
  wings: 0,
  wingsColor: 0xffe0b8ff,
  horn: 0,
  hooves: 0,
  cm: 1,
  cmColor: 0xf15f9dff,
  cmFlip: false,
  ears: 0,
  facialHair: 0,
  facialHairColors: [0x8a5a3bff, 0x8a5a3bff],
  headAccessory: 0,
  headAccessoryColor: 0xd9534fff,
  chestAccessory: 0,
  chestAccessoryColor: 0xd9534fff,
  backAccessory: 0,
  backAccessoryColor: 0xd9534fff,
  legAccessory: 0,
  legAccessoryColor: 0xd9534fff,
};

const anySets = sprites as unknown as Record<string, ColorExtraSets>;

function colorsCountOf(pattern: ColorExtra | undefined): number {
  return pattern && pattern.colors !== undefined ? (pattern.colors - 1) >> 1 : 0;
}

function paletteFor(pattern: ColorExtra | undefined, fills: number[], coat: number): Uint32Array {
  const count = colorsCountOf(pattern);
  const result = new Uint32Array(count * 2 + 1);
  const source = fills.length > 0 ? fills : [coat];

  for (let i = 0; i < count; i++) {
    const fill = source[i % source.length] || coat;
    result[i * 2 + 1] = fill;
    result[i * 2 + 2] = darkenForOutline(fill);
  }

  return result;
}

function typedSet(set: ColorExtraSets, type: number, fills: number[], coat: number): PaletteSpriteSet {
  const patterns = set && (set[type] || set[0]);
  return { type, pattern: 0, palette: paletteFor(patterns && patterns[0], fills, coat) };
}

function framedSet(setsList: unknown[], frame: number, type: number, fills: number[], coat: number): PaletteSpriteSet {
  let best: ColorExtra | undefined;

  for (const set of setsList) {
    const anySet = set as Record<number, Record<number, Record<number, ColorExtra | undefined>> | undefined> | undefined;
    const frameSets = anySet && (anySet[frame] || anySet[1] || anySet[0]);
    const patterns = frameSets && (frameSets[type] || frameSets[0]);
    const pattern = patterns && patterns[0];

    if (pattern && (!best || colorsCountOf(pattern) > colorsCountOf(best))) {
      best = pattern;
    }
  }

  return { type, pattern: 0, palette: paletteFor(best, fills, coat) };
}

function maxColorsOf(sets: ColorExtraSets[], type: number): ColorExtra | undefined {
  let best: ColorExtra | undefined;

  for (const set of sets) {
    const patterns = set && (set[type] || set[0]);
    const pattern = patterns && patterns[0];

    if (pattern && (!best || colorsCountOf(pattern) > colorsCountOf(best))) {
      best = pattern;
    }
  }

  return best;
}

function manedSet(sets: ColorExtraSets[], type: number, fills: number[], coat: number): PaletteSpriteSet | undefined {
  if (type <= 0) return undefined;

  const best = maxColorsOf(sets, type);
  return { type, pattern: 0, palette: paletteFor(best, fills, coat) };
}

function animatedSet(sets: ColorExtraSets[], type: number, fills: number[], coat: number): PaletteSpriteSet | undefined {
  if (type <= 0) return undefined;

  const best = maxColorsOf([sets[0], sets[1], sets[2], sets[3]].filter(Boolean) as ColorExtraSets[], type);
  return { type, pattern: 0, palette: paletteFor(best, fills, coat) };
}

export interface PaletteLook {
  body: PaletteSpriteSet;
  head: PaletteSpriteSet;
  ears: PaletteSpriteSet;
  frontLegs: PaletteSpriteSet;
  backLegs: PaletteSpriteSet;
  frontHooves: PaletteSpriteSet | undefined;
  backHooves: PaletteSpriteSet | undefined;
  mane: PaletteSpriteSet | undefined;
  backMane: PaletteSpriteSet | undefined;
  tail: PaletteSpriteSet;
  wings: PaletteSpriteSet | undefined;
  horn: PaletteSpriteSet | undefined;
  nose: PaletteSpriteSet;
  facialHair: PaletteSpriteSet | undefined;
  headAccessory: PaletteSpriteSet | undefined;
  chestAccessory: PaletteSpriteSet | undefined;
  backAccessory: PaletteSpriteSet | undefined;
  legAccessory: PaletteSpriteSet | undefined;
  eyePalette: Uint32Array;
  eyeColor: Uint32Array;
  eyelashes: number;
  cmPalette: Uint32Array | undefined;
  cmFlip: boolean;
  defaultPalette: Uint32Array;
  look: Look;
}

export function buildPaletteLook(look: Look): PaletteLook {
  const coat = [look.coat];
  const hooves = look.hooves ? [look.hooves] : coat;
  const maneSets = [anySets.behindManes, anySets.topManes, anySets.frontManes];
  const backManeSets = [anySets.backBehindManes, anySets.backFrontManes];
  const cmPalette = look.cm > 0 && look.cm < CUTIE_MARKS.length ? CUTIE_MARKS[look.cm].colors : undefined;
  const accColor = [look.headAccessoryColor || 0xd9534fff];

  return {
    body: framedSet([anySets.body as ColorExtraSets], 1, 0, coat, look.coat),
    head: framedSet([anySets.head0 as ColorExtraSets], 1, 0, coat, look.coat),
    ears: typedSet(anySets.ears, look.ears, coat, look.coat),
    frontLegs: framedSet([anySets.frontLegs as ColorExtraSets], 1, 0, coat, look.coat),
    backLegs: framedSet([anySets.backLegs as ColorExtraSets], 1, 0, coat, look.coat),
    frontHooves: look.hooves
      ? framedSet([anySets.frontLegHooves as ColorExtraSets], 1, 1, hooves, look.coat)
      : undefined,
    backHooves: look.hooves
      ? framedSet([anySets.backLegHooves as ColorExtraSets], 1, 1, hooves, look.coat)
      : undefined,
    mane: manedSet(maneSets, look.mane, look.maneColors, look.coat),
    backMane: manedSet(backManeSets, look.backMane, look.backManeColors, look.coat),
    tail: framedSet([anySets.tails as ColorExtraSets], 0, look.tail, look.tailColors, look.coat),
    wings: look.wings > 0
      ? framedSet([anySets.wings as ColorExtraSets], 0, look.wings, [look.wingsColor || look.coat], look.coat)
      : undefined,
    horn: look.horn > 0 ? typedSet(anySets.horns, look.horn, coat, look.coat) : undefined,
    nose: typedSet((anySets.noses as unknown as ColorExtraSets[])[0], 0, coat, look.coat),
    facialHair: manedSet([anySets.facialHairBehind, anySets.facialHair], look.facialHair, look.facialHairColors, look.coat),
    headAccessory: look.headAccessory > 0
      ? typedSet(anySets.headAccessoriesBehind, look.headAccessory, accColor, look.coat)
      : undefined,
    chestAccessory: animatedSet(anySets.chestAccessories as unknown as ColorExtraSets[], look.chestAccessory, [look.chestAccessoryColor || 0xd9534fff], look.coat),
    backAccessory: animatedSet(anySets.backAccessories as unknown as ColorExtraSets[], look.backAccessory, [look.backAccessoryColor || 0xd9534fff], look.coat),
    legAccessory: animatedSet(
      [anySets.frontLegAccessories, anySets.backLegAccessories] as unknown as ColorExtraSets[],
      look.legAccessory, [look.legAccessoryColor || 0xd9534fff], look.coat,
    ),
    eyePalette: new Uint32Array([0, look.eyeWhite || WHITE, BLACK]),
    eyeColor: new Uint32Array([0, look.eyeColor]),
    eyelashes: clamp(look.eyelashes, 0, 2),
    cmPalette,
    cmFlip: look.cmFlip,
    defaultPalette: sprites.defaultPalette,
    look,
  };
}

function typeCount(set: ColorExtraSets): number {
  return set ? set.length : 1;
}

export function maneCount(): number {
  return Math.max(typeCount(anySets.behindManes), typeCount(anySets.topManes), typeCount(anySets.frontManes));
}

export function backManeCount(): number {
  return Math.max(typeCount(anySets.backBehindManes), typeCount(anySets.backFrontManes));
}

export function tailCount(): number {
  return typeCount((anySets.tails as unknown as ColorExtraSets[])[0]);
}

export function wingsCount(): number {
  return typeCount((anySets.wings as unknown as ColorExtraSets[])[0]);
}

export function hornCount(): number {
  return typeCount(anySets.horns);
}

export function earsCount(): number {
  return typeCount(anySets.ears);
}

export function facialHairCount(): number {
  return Math.max(typeCount(anySets.facialHairBehind), typeCount(anySets.facialHair));
}

export function headAccessoryCount(): number {
  return typeCount(anySets.headAccessoriesBehind);
}

export function chestAccessoryCount(): number {
  return typeCount(anySets.chestAccessories);
}

export function backAccessoryCount(): number {
  return typeCount(anySets.backAccessories);
}

export function legAccessoryCount(): number {
  return Math.min(typeCount(anySets.frontLegAccessories), typeCount(anySets.backLegAccessories));
}

export function eyelashCount(): number {
  return 3;
}

export function randomLook(): Look {
  const coats = [
    0xffe0b8ff, 0xffdab9ff, 0xf5deb3ff, 0xe6c8a0ff, 0xd9b8dfff, 0xc9b1e8ff, 0xa8c8f0ff,
    0xb8e0d0ff, 0xf0f0f0ff, 0xe8e0d0ff, 0xfff0f5ff, 0xffe4e1ff, 0xdcdcc8ff, 0xc8e8f8ff,
    0xf8d8e8ff, 0xffc8b8ff,
  ];
  const maneColors = [
    0x8a5a3bff, 0xd9a45bff, 0xf1d224ff, 0xff8ac2ff, 0x9b59d0ff, 0x56c7ffff, 0x50c878ff,
    0xe7559bff, 0xff6b6bff, 0x704838ff, 0xf0f0f0ff, 0x404040ff, 0xffa500ff, 0x2ecc71ff,
  ];
  const pick = (arr: number[]) => arr[Math.floor(Math.random() * arr.length)];
  const pick2 = (arr: number[]) => {
    const first = pick(arr);
    return [first, Math.random() < 0.3 ? pick(arr) : first];
  };

  const look: Look = {
    coat: pick(coats),
    eyeWhite: WHITE,
    eyeColor: pick([0x2e58f4ff, 0x50c878ff, 0x9b59d0ff, 0xd97e09ff, 0x56c7ffff, 0xc0392bff, 0x8e44adff]),
    eyelashes: Math.random() < 0.5 ? 1 : 0,
    expression: Math.floor(Math.random() * 3),
    mane: 1 + Math.floor(Math.random() * (maneCount() - 1)),
    maneColors: pick2(maneColors),
    backMane: Math.random() < 0.4 ? Math.floor(Math.random() * backManeCount()) : 0,
    backManeColors: pick2(maneColors),
    tail: Math.floor(Math.random() * tailCount()),
    tailColors: pick2(maneColors),
    muzzle: 0,
    wings: Math.random() < 0.25 ? 1 : 0,
    wingsColor: 0,
    horn: Math.random() < 0.25 ? Math.floor(Math.random() * hornCount()) : 0,
    hooves: 0,
    cm: Math.random() < 0.8 ? Math.floor(Math.random() * CUTIE_MARKS.length) : 0,
    cmColor: pick(maneColors),
    cmFlip: Math.random() < 0.5,
    ears: Math.random() < 0.3 ? Math.floor(Math.random() * earsCount()) : 0,
    facialHair: Math.random() < 0.12 ? Math.floor(Math.random() * facialHairCount()) : 0,
    facialHairColors: pick2(maneColors),
    headAccessory: Math.random() < 0.2 ? 1 + Math.floor(Math.random() * (headAccessoryCount() - 1)) : 0,
    headAccessoryColor: pick(maneColors),
    chestAccessory: Math.random() < 0.18 ? 1 + Math.floor(Math.random() * Math.max(1, chestAccessoryCount() - 1)) : 0,
    chestAccessoryColor: pick(maneColors),
    backAccessory: Math.random() < 0.1 ? 1 + Math.floor(Math.random() * Math.max(1, backAccessoryCount() - 1)) : 0,
    backAccessoryColor: pick(maneColors),
    legAccessory: Math.random() < 0.12 ? 1 : 0,
    legAccessoryColor: pick(maneColors),
  };

  look.wingsColor = look.coat;
  return look;
}

export function encodeLook(look: Look): string {
  const bytes = bitWriter(w => {
    w(look.coat, 32);
    w(look.eyeWhite, 32);
    w(look.eyeColor, 32);
    w(look.eyelashes, 2);
    w(look.expression, 5);
    w(look.mane, 7);
    w(look.maneColors[0] || 0, 32);
    w(look.maneColors[1] ? 1 : 0, 1);
    if (look.maneColors[1]) w(look.maneColors[1], 32);
    w(look.backMane, 7);
    w(look.backManeColors[0] || 0, 32);
    w(look.tail, 7);
    w(look.tailColors[0] || 0, 32);
    w(look.tailColors[1] ? 1 : 0, 1);
    if (look.tailColors[1]) w(look.tailColors[1], 32);
    w(look.muzzle, 5);
    w(look.wings, 7);
    w(look.wingsColor, 32);
    w(look.horn, 7);
    w(look.hooves ? 1 : 0, 1);
    if (look.hooves) w(look.hooves, 32);
    w(look.cm, 5);
    w(look.cmColor, 32);
    w(look.cmFlip ? 1 : 0, 1);
    w(look.ears || 0, 3);
    w(look.facialHair || 0, 5);
    w(look.facialHairColors[0] || 0, 32);
    w(look.facialHairColors[1] ? 1 : 0, 1);
    if (look.facialHairColors[1]) w(look.facialHairColors[1], 32);
    w(look.headAccessory || 0, 5);
    w(look.headAccessoryColor || 0, 32);
    w(look.chestAccessory || 0, 3);
    w(look.chestAccessoryColor || 0, 32);
    w(look.backAccessory || 0, 3);
    w(look.backAccessoryColor || 0, 32);
    w(look.legAccessory || 0, 1);
    w(look.legAccessoryColor || 0, 32);
  });

  let binary = '';

  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return 'KL3.' + btoa(binary);
}

export function decodeLook(code: string): Look {
  if (!code.startsWith('KL2.') && !code.startsWith('KL3.')) {
    return { ...DEFAULT_LOOK };
  }

  const version = code.startsWith('KL3.') ? 3 : 2;

  try {
    const binary = atob(code.slice(4));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length < 42) {
      return { ...DEFAULT_LOOK };
    }

    let offset = 0;
    const read = bitReaderCustom(() => (bytes.length <= offset ? 0 : bytes[offset++]));

    const look: Look = {
      coat: read(32),
      eyeWhite: read(32),
      eyeColor: read(32),
      eyelashes: read(2),
      expression: read(5),
      mane: read(7),
      maneColors: [read(32)],
      backMane: 0,
      backManeColors: [0],
      tail: 0,
      tailColors: [0],
      muzzle: 0,
      wings: 0,
      wingsColor: 0,
      horn: 0,
      hooves: 0,
      cm: 0,
      cmColor: 0,
      cmFlip: false,
      ears: 0,
      facialHair: 0,
      facialHairColors: [0x8a5a3bff, 0x8a5a3bff],
      headAccessory: 0,
      headAccessoryColor: 0xd9534fff,
      chestAccessory: 0,
      chestAccessoryColor: 0xd9534fff,
      backAccessory: 0,
      backAccessoryColor: 0xd9534fff,
      legAccessory: 0,
      legAccessoryColor: 0xd9534fff,
    };

    if (read(1)) look.maneColors.push(read(32));

    look.backMane = read(7);
    look.backManeColors = [read(32)];
    look.tail = read(7);
    look.tailColors = [read(32)];

    if (read(1)) look.tailColors.push(read(32));

    look.muzzle = read(5);
    look.wings = read(7);
    look.wingsColor = read(32);
    look.horn = read(7);

    if (read(1)) look.hooves = read(32);

    look.cm = read(5);
    look.cmColor = read(32);
    look.cmFlip = read(1) === 1;

    if (version >= 3) {
      look.ears = read(3);
      look.facialHair = read(5);
      look.facialHairColors = [read(32), 0];

      if (read(1)) look.facialHairColors[1] = read(32);

      look.headAccessory = read(5);
      look.headAccessoryColor = read(32);
      look.chestAccessory = read(3);
      look.chestAccessoryColor = read(32);
      look.backAccessory = read(3);
      look.backAccessoryColor = read(32);
      look.legAccessory = read(1);
      look.legAccessoryColor = read(32);
    }

    return look;
  } catch {
    return { ...DEFAULT_LOOK };
  }
}
