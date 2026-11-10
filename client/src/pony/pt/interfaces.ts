export interface Sprite {
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  type: number;
}

export interface SpriteBorder {
  border: number;
  topLeft: Sprite;
  top: Sprite;
  topRight: Sprite;
  left: Sprite;
  bg: Sprite;
  right: Sprite;
  bottomLeft: Sprite;
  bottom: Sprite;
  bottomRight: Sprite;
}

export interface PonyEye {
  base?: Sprite;
  irises: (Sprite | undefined)[];
  shadow?: Sprite;
  shine?: Sprite;
}

export interface PonyNose {
  color: Sprite;
  colors: number;
  mouth: Sprite;
  fangs: Sprite;
}

export interface ColorExtra {
  color: Sprite;
  colors?: number;
  extra?: Sprite;
  palettes?: Uint32Array[];
  title?: string;
  label?: string;
  timestamp?: unknown;
  colorMany?: Sprite[];
}

export type ColorExtraSet = (ColorExtra | undefined)[];

export type ColorExtraSets = ColorExtraSet[] | undefined;

export type Sets = ColorExtraSets[];

export interface Shadow {
  shadow: Sprite;
}

export interface ColorShadow {
  color: Sprite;
  shadow: Sprite;
  palettes: Uint32Array[];
}

export interface TileSprites {
  sprites: Sprite[];
  palettes: Uint32Array[];
}

export interface SpriteSheet {
  src?: string;
  srcA?: string;
  data?: ImageData;
  texture?: unknown;
  sprites: Sprite[];
  isSingleChannel: boolean;
  palette: boolean;
}

export interface PaletteSpriteSet {
  type: number;
  pattern: number;
  palette: Uint32Array;
  extraPalette?: Uint32Array;
}

export const HeadAnimationProperties = {
  None: 0,
  DontIncreaseEyeOpenness: 1,
  DontDecreaseMouthOpenness: 2,
} as const;

export type HeadAnimationProperties = typeof HeadAnimationProperties[keyof typeof HeadAnimationProperties];


export interface BodyAnimationFrame {
  body: number;
  head: number;
  wing: number;
  tail: number;
  frontLeg: number;
  frontFarLeg: number;
  backLeg: number;
  backFarLeg: number;
  bodyX: number;
  bodyY: number;
  headX: number;
  headY: number;
  frontLegX: number;
  frontLegY: number;
  frontFarLegX: number;
  frontFarLegY: number;
  backLegX: number;
  backLegY: number;
  backFarLegX: number;
  backFarLegY: number;
}

export interface BodyShadow {
  frame: number;
  offset: number;
}

export interface BodyAnimation {
  name: string;
  fps: number;
  loop: boolean;
  frames: BodyAnimationFrame[];
  shadow?: { frame: number; offset: number }[];
  disableHeadTurnFrames: number;
}

export interface HeadAnimationFrame {
  headX: number;
  headY: number;
  left: number;
  right: number;
  mouth: number;
}

export interface HeadAnimation {
  name: string;
  fps: number;
  loop: boolean;
  properties: HeadAnimationProperties;
  frames: HeadAnimationFrame[];
}

export const Muzzle = {
  Smile: 0,
  Frown: 1,
  Neutral: 2,
  Scrunch: 3,
  Blep: 4,
  SmileOpen: 5,
  Flat: 6,
  Concerned: 7,
  ConcernedOpen: 8,
  SmileOpen2: 9,
  FrownOpen: 10,
  NeutralOpen2: 11,
  ConcernedOpen2: 12,
  Kiss: 13,
  SmileOpen3: 14,
  NeutralOpen3: 15,
  ConcernedOpen3: 16,
  Kiss2: 17,
  SmileTeeth: 18,
  FrownTeeth: 19,
  NeutralTeeth: 20,
  ConcernedTeeth: 21,
  SmilePant: 22,
  NeutralPant: 23,
  Oh: 24,
  FlatBlep: 25,
} as const;

export type Muzzle = typeof Muzzle[keyof typeof Muzzle];


export function getMuzzleOpenness(muzzle: Muzzle): number {
  switch (muzzle) {
    case Muzzle.Smile:
    case Muzzle.Frown:
    case Muzzle.Neutral:
    case Muzzle.Scrunch:
    case Muzzle.Blep:
    case Muzzle.Flat:
    case Muzzle.Concerned:
    case Muzzle.Kiss:
    case Muzzle.Kiss2:
    case Muzzle.FlatBlep:
      return 0;
    case Muzzle.SmileOpen:
    case Muzzle.ConcernedOpen:
    case Muzzle.FrownOpen:
    case Muzzle.NeutralOpen2:
    case Muzzle.SmileTeeth:
    case Muzzle.FrownTeeth:
    case Muzzle.NeutralTeeth:
    case Muzzle.ConcernedTeeth:
    case Muzzle.Oh:
      return 1;
    case Muzzle.SmileOpen2:
      return 2;
    case Muzzle.ConcernedOpen2:
    case Muzzle.SmileOpen3:
    case Muzzle.NeutralOpen3:
    case Muzzle.SmilePant:
    case Muzzle.NeutralPant:
      return 3;
    case Muzzle.ConcernedOpen3:
      return 4;
    default:
      return 0;
  }
}

export const Eye = {
  None: 0,
  Neutral: 1,
  Neutral2: 2,
  Neutral3: 3,
  Neutral4: 4,
  Neutral5: 5,
  Closed: 6,
  Frown: 7,
  Frown2: 8,
  Frown3: 9,
  Frown4: 10,
  Lines: 11,
  ClosedHappy3: 12,
  ClosedHappy2: 13,
  ClosedHappy: 14,
  Sad: 15,
  Sad2: 16,
  Sad3: 17,
  Sad4: 18,
  Angry: 19,
  Angry2: 20,
  Peaceful: 21,
  Peaceful2: 22,
  X: 23,
  X2: 24,
} as const;

export type Eye = typeof Eye[keyof typeof Eye];


export function getEyeOpenness(eye: Eye): number {
  switch (eye) {
    case Eye.None:
    case Eye.Closed:
    case Eye.ClosedHappy:
    case Eye.ClosedHappy2:
    case Eye.ClosedHappy3:
    case Eye.Lines:
    case Eye.Peaceful:
    case Eye.Peaceful2:
    case Eye.X:
    case Eye.X2:
      return 0;
    case Eye.Neutral5:
    case Eye.Frown4:
      return 1;
    case Eye.Neutral4:
    case Eye.Frown3:
    case Eye.Sad4:
      return 2;
    case Eye.Neutral3:
    case Eye.Frown2:
    case Eye.Sad3:
    case Eye.Angry2:
      return 3;
    case Eye.Neutral2:
    case Eye.Sad2:
    case Eye.Angry:
    case Eye.Frown:
      return 4;
    case Eye.Neutral:
    case Eye.Sad:
      return 5;
    default:
      return 5;
  }
}

export const Iris = {
  Forward: 0,
  Up: 1,
  Left: 2,
  Right: 3,
  UpLeft: 4,
  UpRight: 5,
  Shocked: 6,
  Down: 7,
  DownRight: 8,
  DownLeft: 9,
  Down2: 10,
  DownRight2: 11,
  DownLeft2: 12,
  ShockedRight: 13,
  ShockedLeft: 14,
  ShockedDownRight: 15,
  ShockedDownLeft: 16,
  ShockedUpRight: 17,
  ShockedUpLeft: 18,
  ShockedDownRight2: 19,
  ShockedDownLeft2: 20,
  ShockedDown2: 21,
  ShockedDown: 22,
  ShockedUp: 23,
} as const;

export type Iris = typeof Iris[keyof typeof Iris];


export const ExpressionExtra = {
  None: 0,
  Blush: 1,
  Zzz: 2,
  Cry: 4,
  Tears: 8,
  Hearts: 16,
} as const;

export type ExpressionExtra = typeof ExpressionExtra[keyof typeof ExpressionExtra];


export interface Expression {
  left: Eye;
  leftIris: Iris;
  right: Eye;
  rightIris: Iris;
  muzzle: Muzzle;
  extra: number;
}

export const PonyStateFlags = {
  None: 0,
  CurlTail: 1,
  FaceForward: 2,
} as const;

export type PonyStateFlags = typeof PonyStateFlags[keyof typeof PonyStateFlags];


export interface PonyState {
  animation: BodyAnimation;
  animationFrame: number;
  headAnimation: HeadAnimation | undefined;
  headAnimationFrame: number;
  headTurned: boolean;
  headTilt: number;
  headTurn: number;
  blinkFrame: number;
  expression: Expression | undefined;
  blushColor: number;
  flags: PonyStateFlags;
}

export interface DrawPonyOptions {
  flipped: boolean;
  shadow: boolean;
  shadowColor: number;
  noEars: boolean;
}
