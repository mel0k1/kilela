import type {
  BodyAnimation, BodyAnimationFrame, HeadAnimation, HeadAnimationFrame, HeadAnimationProperties,
} from './interfaces';
import { HeadAnimationProperties as HAP } from './interfaces';
import { repeat, flatten } from './compat';

export function createBodyFrame(frame: number[]): Readonly<BodyAnimationFrame> {
  const [
    body = 0, head = 0, wing = 0, tail = 0,
    frontLeg = 0, frontFarLeg = 0, backLeg = 0, backFarLeg = 0,
    bodyX = 0, bodyY = 0, headX = 0, headY = 0,
    frontLegX = 0, frontLegY = 0, frontFarLegX = 0, frontFarLegY = 0,
    backLegX = 0, backLegY = 0, backFarLegX = 0, backFarLegY = 0,
  ] = frame;

  return {
    body, head, wing, tail,
    frontLeg, frontFarLeg, backLeg, backFarLeg,
    bodyX, bodyY, headX, headY,
    frontLegX, frontLegY, frontFarLegX, frontFarLegY,
    backLegX, backLegY, backFarLegX, backFarLegY,
  };
}

export function createBodyAnimation(
  name: string, fps: number, loop: boolean, frames: number[][], shadowOffsets?: number[][],
): Readonly<BodyAnimation> {
  const shadow = shadowOffsets && shadowOffsets.map(([frame, offset]) => ({ frame, offset }));

  return { name, loop, fps, frames: frames.map(createBodyFrame), shadow, disableHeadTurnFrames: 0 };
}

export const stand = createBodyAnimation('stand', 24, true, [
  [1, 1, 0, 0, 1, 1, 1, 1],
]);

export const trot = createBodyAnimation('trot', 24, true, [
  [1, 1, 0, 0, 2, 10, 2, 10, 0, 1, 0, -1],
  [1, 1, 0, 0, 3, 11, 3, 11],
  [1, 1, 0, 0, 4, 12, 4, 12, 0, -1],
  [1, 1, 0, 0, 5, 13, 5, 13, 0, -2],
  [1, 1, 0, 0, 6, 14, 6, 14, 0, -2],
  [1, 1, 0, 0, 7, 15, 7, 15, 0, -2],
  [1, 1, 0, 0, 8, 16, 8, 16, 0, -1],
  [1, 1, 0, 0, 9, 17, 9, 17],
  [1, 1, 0, 0, 10, 2, 10, 2, 0, 1, 0, -1],
  [1, 1, 0, 0, 11, 3, 11, 3],
  [1, 1, 0, 0, 12, 4, 12, 4, 0, -1],
  [1, 1, 0, 0, 13, 5, 13, 5, 0, -2],
  [1, 1, 0, 0, 14, 6, 14, 6, 0, -2],
  [1, 1, 0, 0, 15, 7, 15, 7, 0, -2],
  [1, 1, 0, 0, 16, 8, 16, 8, 0, -1],
  [1, 1, 0, 0, 17, 9, 17, 9],
]);

export const boop = createBodyAnimation('boop', 24, false, [
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 18, 1, 1, 1],
  [1, 1, 0, 0, 19, 1, 1, 1],
  [1, 1, 0, 0, 20, 1, 1, 1],
  [1, 1, 0, 0, 21, 1, 1, 1],
  [1, 1, 0, 0, 22, 28, 18, 18, -1],
  [1, 1, 0, 0, 23, 26, 19, 19, -2, -1],
  ...repeat(5, [1, 1, 0, 0, 23, 27, 20, 20, -3, -1]),
  [1, 1, 0, 0, 23, 26, 19, 19, -2, -1],
  [1, 1, 0, 0, 22, 1, 1, 1],
  [1, 1, 0, 0, 24, 1, 1, 1],
  [1, 1, 0, 0, 25, 1, 1, 1],
  [1, 1, 0, 0, 18, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
]);

const danceSteps = createBodyAnimation('# 991-stand-staps-two-own', 24, true, [
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 14, 1, 1, 1, 0, 1, -1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 13, 1, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 12, 1, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 12, 1, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 11, 1, 1, 1, 0, 1, -1, 2, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 10, 1, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 3, 1, 1, 1, 0, 1, -1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 3, 1, 1, 1, 0, 1, -1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
  [1, 1, 0, 0, 1, 1, 1, 7, 0, 1, 1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 4, 0, 1, 1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 3, 0, 1, 1, 2, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 3, 0, 1, 1, 2, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 18, 0, 0, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 14, 1, 1, 0, 1, -1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 13, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 12, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 12, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 11, 1, 1, 0, 1, -1, 2, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 10, 1, 1, 0, 1, -1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 3, 1, 1, 0, 1, -1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 3, 1, 1, 0, 1, -1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
  [1, 1, 0, 0, 1, 1, 1, 7, 0, 1, 1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 4, 0, 1, 1, 1, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 3, 0, 1, 1, 2, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 3, 0, 1, 1, 2, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 18, 0, 1, 1, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [1, 1, 0, 0, 1, 1, 1, 1],
]);

export const dance = danceSteps;

export const sit = createBodyAnimation('sit', 24, true, [
  [9, 1, 2, 2, 34, 34, 26, 26],
], [[0, 6]]);

const sitShadow = [0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 6].map(offset => [0, offset]);

export const sitDown = createBodyAnimation('sit-down', 24, false, [
  [1, 1, 0, 0, 1, 1, 1, 1],
  ...repeat(2, [2, 1, 0, 0, 29, 29, 1, 1]),
  ...repeat(2, [3, 1, 0, 0, 30, 30, 21, 21]),
  [4, 1, 0, 0, 31, 31, 22, 22],
  [5, 1, 0, 1, 32, 32, 23, 23],
  [6, 1, 1, 2, 33, 33, 24, 24],
  [7, 1, 2, 2, 34, 34, 25, 25],
  [8, 1, 2, 2, 34, 34, 25, 25],
  [9, 1, 2, 2, 34, 34, 26, 26],
], sitShadow);

export const standUp = createBodyAnimation('stand-up', 24, false, [
  [9, 1, 2, 2, 34, 34, 26, 26],
  [8, 1, 2, 2, 34, 34, 25, 25],
  [7, 1, 2, 2, 34, 34, 25, 25],
  [6, 1, 1, 2, 33, 33, 24, 24],
  [5, 1, 0, 1, 32, 32, 23, 23],
  [4, 1, 0, 0, 31, 31, 22, 22],
  ...repeat(2, [3, 1, 0, 0, 30, 30, 21, 21]),
  [1, 1, 0, 0, 1, 1, 1, 1],
], sitShadow.slice(2).reverse());

export const sitToTrot = createBodyAnimation('sit-to-trot', 24, false, [
  [7, 1, 2, 2, 34, 35, 24, 25, 0, -1, 0, 0, 0, 2, 1, 1, 0, -1],
  [6, 1, 1, 2, 27, 36, 23, 24, 0, -2, 0, 0, 0, -2, 0, 0, 0, 1],
  [5, 1, 0, 1, 5, 13, 5, 23, 0, -2],
  [4, 1, 0, 0, 6, 14, 6, 5, 0, -2],
  [3, 1, 0, 0, 7, 15, 7, 15, 0, -2],
  [2, 1, 0, 0, 8, 16, 8, 16, 0, -1],
], [[0, 6], [0, 5], [0, 4], [0, 3], [0, 1], [0, 0]]);

export const lie = createBodyAnimation('lie', 24, true, [
  [15, 1, 0, 2, 38, 38, 26, 26],
], [[3, 3]]);

const lieShadow = [[0, 6], [0, 6], [1, 5], [2, 4], [3, 3], [3, 3], [3, 3]];

export const lieDown = createBodyAnimation('lie-down', 24, false, [
  [9, 1, 2, 2, 34, 34, 26, 26],
  [10, 1, 2, 2, 35, 34, 26, 26, 0, 0, 0, 0, 0, 0, 0, -1],
  [11, 1, 1, 2, 36, 36, 26, 26, 0, 0, 0, 0, 0, 0, 1],
  [12, 1, 1, 2, 37, 37, 26, 26, 0, 0, 0, 0, 0, 0, 1],
  [13, 1, 0, 2, 38, 38, 26, 26, 0, 0, 0, 0, 0, 0, 1],
  ...repeat(2, [14, 1, 0, 2, 38, 38, 26, 26]),
], lieShadow);

export const sitUp = createBodyAnimation('sit-up', 24, false, [
  ...repeat(2, [14, 1, 0, 2, 38, 38, 26, 26]),
  [13, 1, 0, 2, 38, 38, 26, 26],
  [12, 1, 1, 2, 37, 37, 26, 26],
  [11, 1, 1, 2, 36, 36, 26, 26],
  [10, 1, 2, 2, 35, 34, 26, 26, 0, 0, 0, 0, 0, 0, 0, -1],
  [9, 1, 2, 2, 34, 34, 26, 26],
], lieShadow.slice().reverse());

export const lieToTrot = createBodyAnimation('lie-to-trot', 24, false, [
  [1, 1, 0, 1, 36, 37, 24, 25, 4, 8, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 0, 30, 12, 23, 24, 2, 5, 0, 0, 0, -3],
  [1, 1, 0, 0, 5, 13, 5, 23, 1, 1],
  [1, 1, 0, 0, 6, 14, 6, 21, 0, 0, 0, -1],
  [1, 1, 0, 0, 7, 15, 7, 15, 0, -1, 0, -1],
  [1, 1, 0, 0, 8, 16, 8, 16, 0, -2],
], [[2, 1], [1, 0], ...repeat(4, [0, 0])]);

const flyLegs = (wing: number, bodyY: number, legY: number) => [
  1, 1, wing, 0, 34, 34, 26, 26,
  0, bodyY, 0, -1,
  9, 5 + legY + bodyY, 9, 5 + legY + bodyY,
  8, 11 + legY + bodyY, 8, 11 + legY + bodyY,
];

export const fly = createBodyAnimation('fly', 12, true, [
  flyLegs(2, 0, 0),
  flyLegs(3, -1, 0),
  flyLegs(4, -2, 0),
  flyLegs(5, -2, 0),
  flyLegs(6, -1, 0),
  flyLegs(7, 0, 0),
  flyLegs(4, 1, 0),
  flyLegs(3, 0, 0),
], [[0, 0], [0, 0], [0, -1], [0, -1], [0, 0], [0, 0], [0, 1], [0, 0]]);

export const swim = createBodyAnimation('swim', 4, true, [
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 14],
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 13],
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 12],
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 13],
]);

export const trotToSwim = createBodyAnimation('trot-to-swim', 24, false, [
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 2],
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 8],
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 10],
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 16],
]);

export const swimToTrot = createBodyAnimation('swim-to-trot', 24, false, [
  [1, 1, 0, 0, 8, 10, 6, 5, 0, 12],
  [1, 1, 0, 0, 12, 3, 4, 23, 0, 8],
  [1, 1, 0, 0, 14, 26, 3, 24, 0, 4],
  [1, 1, 0, 0, 18, 27, 2, 5],
]);

export const flyToSwim = createBodyAnimation('fly-to-swim', 16, false, [
  [1, 1, 3, 0, 8, 10, 6, 5, 0, -14],
  [1, 1, 4, 0, 8, 10, 6, 5, 0, -12],
  [1, 1, 5, 0, 8, 10, 6, 5, 0, -8],
  [1, 1, 6, 0, 8, 10, 6, 5, 0, -2],
  [1, 1, 7, 0, 8, 10, 6, 5, 0, 4],
  [1, 1, 11, 0, 8, 10, 6, 5, 0, 10],
  [1, 1, 1, 0, 8, 10, 6, 5, 0, 14],
]);

export const swimToFly = createBodyAnimation('swim-to-fly', 16, false, [
  [1, 1, 11, 0, 8, 10, 6, 5, 0, 13],
  [1, 1, 12, 0, 8, 10, 6, 5, 0, 14, 0, 0, 0, -1, 0, -1, 0, -1, 0, -1],
  [2, 1, 3, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
  [2, 1, 4, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
  [2, 1, 5, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
  [1, 1, 6, 0, 8, 10, 6, 1, 0, 13],
  [1, 1, 7, 0, 6, 7, 5, 5, 0, -7, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 8, 0, 8, 10, 6, 5, 0, -15],
  [1, 1, 9, 0, 8, 10, 6, 5, 0, -17],
  [1, 1, 10, 0, 8, 10, 6, 5, 0, -18],
  [1, 1, 11, 0, 8, 10, 6, 5, 0, -18],
  [1, 1, 12, 0, 8, 10, 6, 5, 0, -17],
]);

export function createHeadFrame([headX = 0, headY = 0, left = 0, right = 0, mouth = 0]: number[]): HeadAnimationFrame {
  return { headX, headY, left, right, mouth };
}

export function createHeadAnimation(
  name: string, fps: number, loop: boolean, frames: number[][],
  properties: HeadAnimationProperties = HAP.None,
): Readonly<HeadAnimation> {
  return { name, fps, loop, properties, frames: frames.map(createHeadFrame) };
}

export const smileHead = createHeadAnimation('smile', 24, true, [
  [0, 0, 1, 1, 0],
]);

export const nom = createHeadAnimation('nom', 12, true, [
  [0, 0, 1, 1, 0],
  [0, 0, 1, 1, 25],
]);

export const laugh = createHeadAnimation('laugh', 8, false, [
  ...repeat(4, [0, 0, 14, 14, 5], [0, 1, 14, 14, 5]),
]);

export const yawn = createHeadAnimation('yawn', 12, false, [
  [0, 0, 3, 3, 8],
  ...repeat(18, [1, -1, 12, 12, 16]),
  ...repeat(8, [0, 0, 12, 12, 12]),
  [0, 0, 18, 18, 2],
], HAP.DontIncreaseEyeOpenness);

export const surprise = createHeadAnimation('surprise', 8, false, [
  [0, 1, 6, 6, 1],
  ...repeat(10, [0, 0, 1, 1, 12]),
]);

export const excite = createHeadAnimation('excite', 8, false, [
  [0, 1, 6, 6, 0],
  ...repeat(10, [0, 0, 1, 1, 5]),
]);

export const happyTongue = createHeadAnimation('happy-tongue', 12, false, [
  ...repeat(3, [0, 0, 1, 1, 0]),
  [0, 1, 6, 6, 0],
  ...repeat(8, [0, 0, 14, 14, 4]),
]);

export const kissHead = createHeadAnimation('kiss', 24, false, [
  ...repeat(2, [0, 0, 1, 1, 0]),
  ...repeat(2, [0, 0, 3, 3, 0]),
  ...repeat(63, [0, 0, 6, 6, 13]),
  [0, 0, 3, 3, 17],
  [0, 0, 1, 1, 0],
], HAP.DontIncreaseEyeOpenness);

export const defaultBodyAnimation = createBodyAnimation('default', 24, true, [[1, 1, 0, 0, 1, 1, 1, 1]]);
export const defaultHeadAnimation = createHeadAnimation('default', 24, true, [[0, 0, -1, -1, -1]]);

export const defaultBodyFrame = defaultBodyAnimation.frames[0];
export const defaultHeadFrame = defaultHeadAnimation.frames[0];

export function mergeAnimations(name: string, fps: number, loop: boolean, animations: BodyAnimation[]): BodyAnimation {
  return {
    name,
    fps,
    loop,
    disableHeadTurnFrames: Math.min(...animations.map(a => a.disableHeadTurnFrames)),
    frames: flatten(animations.map(a => a.frames)),
    shadow: flatten(animations.map(a => a.shadow || a.frames.map(() => ({ frame: 0, offset: 0 })))),
  };
}
