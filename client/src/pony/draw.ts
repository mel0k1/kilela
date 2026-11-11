import * as sprites from './pt/sprites';
import type { ColorExtraSet, PonyState, Sprite, BodyAnimationFrame, HeadAnimationFrame } from './pt/interfaces';
import { Eye, Iris, Muzzle, HeadAnimationProperties, getEyeOpenness, getMuzzleOpenness } from './pt/interfaces';
import { defaultBodyFrame, defaultHeadAnimation, defaultHeadFrame } from './pt/animations';
import { WHITE, SHADOW_COLOR, FAR_COLOR, clamp } from './pt/compat';
import {
  cmOffsets, headOffsets, tailOffsets, wingOffsets, frontLegOffsets, backLegOffsets,
  chestAccessoryOffsets, backAccessoryOffsets, HEAD_ACCESSORY_OFFSETS, EXTRA_ACCESSORY_OFFSETS,
} from './pt/offsets';
import { TOY_SPRITES } from './toys';
import { EXPRESSION_PRESETS, type PaletteLook } from './look';
import {
  PonyBatch, translateMat2D, rotateMat2D, scaleMat2D, type Mat2D,
} from './batch';

export const PONY_WIDTH = 80;
export const PONY_HEIGHT = 70;

const SHADOW_OX = 20;
const SHADOW_OY = 64;
const FAR_OX = -3;
const FAR_OY = -1;
const FAR_WING_OX = -4;
const FAR_WING_OY = 0;

const headFlipOffsetX = 35.5;
const headFlipOffsetY = 42;

const headOffsetsX = [0, 1, 1, 1, 1, 1, 0];
const headOffsetsY = [0, 0, 1, 1, 0, 0, 0];

const blushTint = 0xffb6c1ff;

type Sets = any[];

type EyeSprites = any[][];

function createCompleteSets(sets: Sets, frameCount: number): Sets {
  const typeCount = sets.reduce((max, s) => Math.max(max, s ? s.length : 0), 0);
  const result: Sets = [];

  for (let frame = 0; frame < frameCount; frame++) {
    const row: ColorExtraSet | undefined = [];

    for (let type = 0; type < typeCount; type++) {
      const current = sets[frame] && sets[frame]![type];
      const previous = frame > 0 ? result[frame - 1] : undefined;
      row.push(current || (previous && previous[type]) || undefined);
    }

    result.push(row);
  }

  return result;
}

const wingSets: Sets = createCompleteSets(sprites.wings as Sets, 13);
const tailSets: Sets = createCompleteSets(sprites.tails as Sets, 3);
const sleeveFrontSets: Sets = createCompleteSets(sprites.frontLegSleeves as Sets, 40);
const sleeveBackSets: Sets = createCompleteSets(sprites.backLegSleeves as Sets, 40);
const waistSets: Sets = createCompleteSets(sprites.waistAccessories as Sets, 17);
const neckSets: Sets = createCompleteSets(sprites.neckAccessories as Sets, 17);

const blinkFrames: Eye[][] = [];

function setupBlinkFrames(frames: Eye[]) {
  frames.slice(0, -1).forEach((f, i) => {
    if (!blinkFrames[f]) {
      blinkFrames[f] = frames.slice(i + 1);
    }
  });
}

setupBlinkFrames([Eye.Neutral, Eye.Neutral2, Eye.Neutral3, Eye.Neutral4, Eye.Neutral5, Eye.Closed]);
setupBlinkFrames([Eye.Frown, Eye.Frown2, Eye.Frown3, Eye.Frown4, Eye.Closed]);
setupBlinkFrames([Eye.Sad, Eye.Sad2, Eye.Sad3, Eye.Sad4, Eye.Neutral5, Eye.Closed]);
setupBlinkFrames([Eye.Angry, Eye.Angry2, Eye.Neutral4, Eye.Neutral5, Eye.Closed]);

export function flipIris(iris: Iris): Iris {
  switch (iris) {
    case Iris.Left: return Iris.Right;
    case Iris.Right: return Iris.Left;
    case Iris.UpLeft: return Iris.UpRight;
    case Iris.UpRight: return Iris.UpLeft;
    case Iris.DownLeft: return Iris.DownRight;
    case Iris.DownRight: return Iris.DownLeft;
    case Iris.DownLeft2: return Iris.DownRight2;
    case Iris.DownRight2: return Iris.DownLeft2;
    case Iris.ShockedLeft: return Iris.ShockedRight;
    case Iris.ShockedRight: return Iris.ShockedLeft;
    case Iris.ShockedDownLeft: return Iris.ShockedDownRight;
    case Iris.ShockedDownRight: return Iris.ShockedDownLeft;
    case Iris.ShockedUpLeft: return Iris.ShockedUpRight;
    case Iris.ShockedUpRight: return Iris.ShockedUpLeft;
    case Iris.ShockedDownLeft2: return Iris.ShockedDownRight2;
    case Iris.ShockedDownRight2: return Iris.ShockedDownLeft2;
    default: return iris;
  }
}

function at(items: unknown, index: number): any {
  const list = items as unknown[];

  return list[clamp(index | 0, 0, list.length - 1)];
}

function att(items: unknown, index: number): any {
  const list = items as unknown[] | undefined | null;

  return list ? list[clamp(index | 0, 0, list.length - 1)] : undefined;
}

export function getPonyAnimationFrame<T>(frames: T[], frame: number, defaultFrame: T): T {
  return frames.length > 0 ? frames[Math.max(0, frame) % frames.length] : defaultFrame;
}

function createHeadTransform(out: Mat2D, headX: number, headY: number, headTilt: number, headTurned: boolean): Mat2D {
  out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 1; out[4] = 0; out[5] = 0;
  translateMat2D(out, out, headX + headFlipOffsetX, headY + headFlipOffsetY);

  if (headTilt) {
    rotateMat2D(out, out, headTilt * 0.1);
  }

  scaleMat2D(out, out, headTurned ? -1 : 1, 1);
  translateMat2D(out, out, -headFlipOffsetX, -headFlipOffsetY);
  return out;
}

interface PartSet {
  type: number;
  pattern: number;
  palette: Uint32Array;
  extraPalette?: Uint32Array;
}

function drawSet(batch: PonyBatch, sets: Sets, set: PartSet | undefined, x: number, y: number, tint: number) {
  if (!set) return;

  const patterns = att(sets, set.type);

  if (!patterns) return;

  const patternSprite = at(patterns as NonNullable<ColorExtraSet>, set.pattern);

  if (patternSprite && patternSprite.color) {
    batch.drawSprite(patternSprite.color, tint, set.palette, x, y);
  }
}

function drawSetExtra(batch: PonyBatch, sets: Sets, set: PartSet | undefined, x: number, y: number, tint: number) {
  if (!set) return;

  const patterns = att(sets, set.type);

  if (!patterns) return;

  const patternSprite = at(patterns as NonNullable<ColorExtraSet>, set.pattern);

  if (!patternSprite) return;

  if (patternSprite.color) {
    batch.drawSprite(patternSprite.color, tint, set.palette, x, y);
  }

  if (patternSprite.extra && set.extraPalette) {
    batch.drawSprite(patternSprite.extra, WHITE, set.extraPalette, x, y);
  }
}

const frontHoovesInFront = [false, false, true, true, false, false];
const backHoovesInFront = [false, false, true, false, false];

interface LegDefs {
  legs: Sets;
  hooves: Sets;
  accessories: Sets;
  sleeves: Sets;
  hoovesInFront: boolean[];
}

const frontLegDefs: LegDefs = {
  legs: sprites.frontLegs as Sets,
  hooves: sprites.frontLegHooves as Sets,
  accessories: sprites.frontLegAccessories as Sets,
  sleeves: sleeveFrontSets,
  hoovesInFront: frontHoovesInFront,
};

const backLegDefs: LegDefs = {
  legs: sprites.backLegs as Sets,
  hooves: sprites.backLegHooves as Sets,
  accessories: sprites.backLegAccessories as Sets,
  sleeves: sleeveBackSets,
  hoovesInFront: backHoovesInFront,
};

const backLegDefs2: LegDefs = {
  legs: sprites.backLegs2 as Sets,
  hooves: sprites.backLegHooves2 as Sets,
  accessories: sprites.backLegAccessories2 as Sets,
  sleeves: sleeveBackSets,
  hoovesInFront: backHoovesInFront,
};

function drawLegPattern(
  batch: PonyBatch, x: number, y: number, frame: number, defs: LegDefs,
  legSet: PartSet | undefined, hoofSet: PartSet | undefined, sockSet: PartSet | undefined,
  sleeveSet: PartSet | undefined, tint: number, markSet: PartSet | undefined,
) {
  const hoofInFront = hoofSet !== undefined && !!defs.hoovesInFront[hoofSet.type];
  const legPatterns = at(defs.legs, frame);
  const legPattern = legSet && att(legPatterns, legSet.type);

  if (legPattern && legPattern[0] && legPattern[0]!.color) {
    batch.drawSprite(legPattern[0]!.color, tint, legSet!.palette, x, y);
  }

  if (markSet && legPattern) {
    const markSprite = at(legPattern as NonNullable<ColorExtraSet>, markSet.pattern);

    if (markSprite && markSprite.color) {
      batch.drawSprite(markSprite.color, tint, markSet.palette, x, y);
    }
  }

  if (!hoofInFront && hoofSet) {
    drawHoof(batch, defs, frame, hoofSet, x, y, tint);
  }

  if (sockSet) {
    drawSet(batch, at(defs.accessories, frame) as Sets, sockSet, x, y, tint);
  }

  if (sleeveSet) {
    drawSet(batch, at(defs.sleeves, frame) as Sets, sleeveSet, x, y, tint);
  }

  return hoofInFront;
}

function drawHoof(batch: PonyBatch, defs: LegDefs, frame: number, hoofSet: PartSet, x: number, y: number, tint: number) {
  const hoofPatterns = at(defs.hooves, frame);
  const hoofPattern = att(hoofPatterns, hoofSet.type);

  if (hoofPattern && hoofPattern[0] && hoofPattern[0]!.color) {
    batch.drawSprite(hoofPattern[0]!.color, tint, hoofSet.palette, x, y);
  }
}

function getEyeFrame(
  base: Eye, expressionEye: number, animEye: number, properties: HeadAnimationProperties, blinkFrame: number,
): Eye {
  const frame = expressionEye === -1 ? base : (expressionEye as Eye);

  if (animEye !== -1) {
    if ((properties & HeadAnimationProperties.DontIncreaseEyeOpenness) !== 0) {
      if (getEyeOpenness(animEye as Eye) > getEyeOpenness(frame)) {
        return frame;
      }
    }

    return animEye as Eye;
  }

  const blink = blinkFrames[frame];

  if (blinkFrame > 1 && blink) {
    const frameOffset = 6 - blinkFrame;

    if (frameOffset < blink.length) {
      return blink[blink.length - frameOffset - 1];
    }
  }

  return frame;
}

function getMouthFrame(
  expressionMuzzle: number | undefined, headFrameMuzzle: number, currentMuzzle: Muzzle,
  properties: HeadAnimationProperties,
): Muzzle {
  const applyMuzzle = expressionMuzzle !== undefined ? (expressionMuzzle as Muzzle) : currentMuzzle;

  if (headFrameMuzzle !== -1) {
    if ((properties & HeadAnimationProperties.DontDecreaseMouthOpenness) !== 0) {
      if (getMuzzleOpenness(headFrameMuzzle as Muzzle) < getMuzzleOpenness(applyMuzzle)) {
        return applyMuzzle;
      }
    }

    return headFrameMuzzle as Muzzle;
  }

  return applyMuzzle;
}

function drawEye(
  batch: PonyBatch, eye: { base?: Sprite; irises: (Sprite | undefined)[]; shadow?: Sprite; shine?: Sprite } | undefined,
  iris: Iris, eyePalette: Uint32Array, irisPalette: Uint32Array, shadowPalette: Uint32Array | undefined, x: number, y: number,
) {
  if (!eye) return;

  eye.base && batch.drawSprite(eye.base, WHITE, eyePalette, x, y);

  const irisSprite = at(eye.irises, iris);

  irisSprite && batch.drawSprite(irisSprite, WHITE, irisPalette, x, y);

  if (eye.shadow && shadowPalette) {
    batch.drawSprite(eye.shadow, WHITE, shadowPalette, x, y);
  }

  eye.shine && batch.drawSprite(eye.shine, WHITE, undefined, x, y);
}

function expressionBaseEyes(look: PaletteLook): [Eye, Eye] {
  const openness = clamp(look.look.eyeOpenness || 0, 0, 25);

  if (openness > 0) {
    return [openness as Eye, openness as Eye];
  }

  const preset = EXPRESSION_PRESETS[look.look.expression];
  const expr = preset ? preset.expression : undefined;
  return [expr ? expr.left : Eye.Neutral, expr ? expr.right : Eye.Neutral];
}

export function drawPony(batch: PonyBatch, look: PaletteLook, state: PonyState, flipped: boolean, swimming = false, toy = 0) {
  const anim = state.animation;
  const frame = getPonyAnimationFrame(anim.frames, state.animationFrame, defaultBodyFrame) as BodyAnimationFrame;
  const headAnim = state.headAnimation || defaultHeadAnimation;
  const headFrame = getPonyAnimationFrame(headAnim.frames, state.headAnimationFrame, defaultHeadFrame) as HeadAnimationFrame;
  const headProperties = headAnim.properties;
  const x = frame.bodyX;
  const y = frame.bodyY;
  const body = frame.body;
  const headTurned = state.headTurned;
  const headBodyOffset = at(headOffsets, body);
  const headX = x + frame.headX + (headFrame.headX * (headTurned ? -1 : 1)) + headBodyOffset.x;
  const headY = y + frame.headY + headFrame.headY + headBodyOffset.y;
  const frontLegOffset = at(frontLegOffsets, body);
  const backLegOffset = at(backLegOffsets, body);
  const wingOffset = at(wingOffsets, body);
  const headTurn = clamp(state.headTurn, 0, headOffsetsX.length - 1);
  const headTotalX = headX + headOffsetsX[headTurn];
  const headTotalY = headY + headOffsetsY[headTurn];
  const headTransform = createHeadTransform([1, 0, 0, 1, 0, 0] as Mat2D, headTotalX, headTotalY, state.headTilt, headTurned);
  const expression = state.expression;
  const mane = look.mane;
  const backMane = look.backMane;
  const headFlip = headTurned ? !flipped : flipped;
  const noMane = !mane || mane.type === 0 || mane.type === 16;
  const hatOffset = HEAD_ACCESSORY_OFFSETS[clamp(mane ? mane.type : 0, 0, HEAD_ACCESSORY_OFFSETS.length - 1)];
  const extraOffset = EXTRA_ACCESSORY_OFFSETS[clamp(mane ? mane.type : 0, 0, EXTRA_ACCESSORY_OFFSETS.length - 1)];
  const toySprite = toy > 0 ? TOY_SPRITES[toy] : undefined;
  const chestOffset = at(chestAccessoryOffsets, body);
  const backOffset = at(backAccessoryOffsets, body);
  const sock = look.legAccessory;

  if (swimming) {
    batch.crop(0, 0, PONY_WIDTH, PONY_HEIGHT - 5);
  }

  if (anim.shadow && anim.shadow.length > 0 && !swimming) {
    const shadow = anim.shadow[state.animationFrame % anim.shadow.length];
    const shadowSprite = (sprites.ponyShadows as any[])[shadow.frame % sprites.ponyShadows.length];

    if (shadowSprite && shadowSprite.color) {
      batch.drawSprite(shadowSprite.color, SHADOW_COLOR, look.defaultPalette, SHADOW_OX + shadow.offset, SHADOW_OY);
    }
  }

  if (look.wings) {
    const farWingPattern = att(at(wingSets, frame.wing), look.wings.type);

    if (farWingPattern && farWingPattern[0] && farWingPattern[0]!.color) {
      batch.drawSprite(farWingPattern[0]!.color, FAR_COLOR, look.wings.palette, x + FAR_WING_OX + wingOffset.x, y + FAR_WING_OY + wingOffset.y);
    }
  }

  batch.save();
  batch.multiplyTransform(headTransform);

  if (noMane && look.headAccessory) {
    drawSet(batch, sprites.headAccessoriesBehind as Sets, look.headAccessory, hatOffset.x, hatOffset.y, WHITE);
  }

  drawSet(batch, sprites.earsFar as Sets, look.ears, 0, 0, FAR_COLOR);

  if (look.earAccessory) {
    drawSet(batch, sprites.earAccessoriesBehind as Sets, look.earAccessory, 0, 0, WHITE);
  }

  if (look.horn) {
    drawSet(batch, sprites.hornsBehind as Sets, look.horn, 0, 0, WHITE);
  }

  if (!noMane && look.headAccessory) {
    drawSet(batch, sprites.headAccessoriesBehind as Sets, look.headAccessory, hatOffset.x, hatOffset.y, WHITE);
  }

  if (backMane) {
    drawSet(batch, sprites.backBehindManes as Sets, backMane, 0, 0, WHITE);
  }

  if (!headTurned && mane) {
    drawSet(batch, sprites.behindManes as Sets, mane, 0, 0, WHITE);
  }

  batch.restore();

  if (look.chestAccessory) {
    drawSet(batch, at(sprites.chestAccessoriesBehind as Sets, body) as Sets, look.chestAccessory, x + chestOffset.x, y + chestOffset.y, WHITE);
  }

  const behindX = x + FAR_OX;
  const behindY = y + FAR_OY;

  drawLegPattern(
    batch, behindX + backLegOffset.x + frame.backFarLegX, behindY + backLegOffset.y + frame.backFarLegY,
    frame.backFarLeg, backLegDefs, look.backLegs, look.backHooves, sock, look.sleeves, FAR_COLOR, look.legMark,
  );

  drawLegPattern(
    batch, behindX + frontLegOffset.x + frame.frontFarLegX, behindY + frontLegOffset.y + frame.frontFarLegY,
    frame.frontFarLeg, frontLegDefs, look.frontLegs, look.frontHooves, sock, look.sleeves, FAR_COLOR, look.legMark,
  );

  const tailPattern = look.tail && att(at(tailSets, frame.tail), look.tail.type);

  if (tailPattern && tailPattern[0] && tailPattern[0]!.color) {
    const tailOffset = at(tailOffsets, body);
    batch.drawSprite(tailPattern[0]!.color, WHITE, look.tail!.palette, x + tailOffset.x, y + tailOffset.y);
  }

  if (look.backAccessory && look.backAccessory.type === 1) {
    drawSet(batch, at(sprites.backAccessories as Sets, body) as Sets, look.backAccessory, x + backOffset.x, y + backOffset.y, WHITE);
  }

  drawSet(batch, at(sprites.body as Sets, body), look.body, x, y, WHITE);
  drawSet(batch, at(sprites.body as Sets, body), look.bodyMark, x, y, WHITE);

  if (look.waist) {
    drawSet(batch, at(waistSets, body) as Sets, look.waist, x, y, WHITE);
  }

  const cmOffset = at(cmOffsets, body);
  const cmFlip = flipped && look.cmFlip;

  const backHoofInFront = drawLegPattern(
    batch, x + backLegOffset.x + frame.backLegX, y + backLegOffset.y + frame.backLegY,
    frame.backLeg, backLegDefs, look.backLegs, look.backHooves, sock, look.sleeves, WHITE, look.legMark,
  );

  if (look.cmPalette) {
    const cm = cmFlip ? sprites.cmsFlip : sprites.cms;
    batch.drawSprite(cm, WHITE, look.cmPalette, x + cmOffset.x, y + cmOffset.y);
  }

  if (backHoofInFront && look.backHooves) {
    drawHoof(batch, backLegDefs, frame.backLeg, look.backHooves, x + backLegOffset.x + frame.backLegX, y + backLegOffset.y + frame.backLegY, WHITE);
  }

  if (look.backAccessory && look.backAccessory.type !== 1) {
    drawSet(batch, at(sprites.backAccessories as Sets, body) as Sets, look.backAccessory, x + backOffset.x, y + backOffset.y, WHITE);
  }

  if (look.chestAccessory && look.chestAccessory.type !== 1) {
    drawSet(batch, at(sprites.chestAccessories as Sets, body) as Sets, look.chestAccessory, x + chestOffset.x, y + chestOffset.y, WHITE);
  }

  const frontHoofInFront = drawLegPattern(
    batch, x + frontLegOffset.x + frame.frontLegX, y + frontLegOffset.y + frame.frontLegY,
    frame.frontLeg, frontLegDefs, look.frontLegs, look.frontHooves, sock, look.sleeves, WHITE, look.legMark,
  );

  if (frontHoofInFront && look.frontHooves) {
    drawHoof(batch, frontLegDefs, frame.frontLeg, look.frontHooves, x + frontLegOffset.x + frame.frontLegX, y + frontLegOffset.y + frame.frontLegY, WHITE);
  }

  if (look.chestAccessory && look.chestAccessory.type === 1) {
    drawSet(batch, at(sprites.chestAccessories as Sets, body) as Sets, look.chestAccessory, x + chestOffset.x, y + chestOffset.y, WHITE);
  }

  drawLegPattern(
    batch, x + backLegOffset.x + frame.backLegX, y + backLegOffset.y + frame.backLegY,
    frame.backLeg, backLegDefs2, look.backLegs, look.backHooves, sock, look.sleeves, WHITE, look.legMark,
  );

  if (look.neck) {
    drawSet(batch, at(neckSets, body) as Sets, look.neck, x + chestOffset.x, y + chestOffset.y, WHITE);
  }

  if (look.wings) {
    const closeWingPattern = att(at(wingSets, frame.wing), look.wings.type);

    if (closeWingPattern && closeWingPattern[0] && closeWingPattern[0]!.color) {
      batch.drawSprite(closeWingPattern[0]!.color, WHITE, look.wings.palette, x + wingOffset.x, y + wingOffset.y);
    }
  }

  batch.save();
  batch.multiplyTransform(headTransform);

  if (headTurned && mane) {
    drawSet(batch, sprites.behindManes as Sets, mane, 0, 0, WHITE);
  }

  if (toySprite) {
    drawSet(batch, sprites.extraAccessoriesBehind as Sets, toySprite, x + extraOffset.x, y + extraOffset.y, WHITE);
  }

  const headSprite = headFlip ? sprites.head0 : sprites.head1;
  const headSet = at(headSprite as Sets, frame.head);
  drawSet(batch, headSet, look.head, x, y, WHITE);
  drawSet(batch, headSet, look.faceMark, x, y, WHITE);

  if (look.faceAccessory) {
    drawSetExtra(batch, sprites.faceAccessories as Sets, look.faceAccessory, x, y, WHITE);
  }

  if (expression && (expression.extra & 1) !== 0) {
    batch.drawSprite(sprites.blush, look.look.blushColor || blushTint, look.defaultPalette, x, y);
  } else if (look.look.blush) {
    batch.drawSprite(sprites.blush, look.look.blushColor || blushTint, look.defaultPalette, x, y);
  }

  const [baseEyeLeft, baseEyeRight] = expressionBaseEyes(look);
  const eyeFrameLeft = getEyeFrame(baseEyeLeft, expression ? expression.left : -1, headFrame.left, headProperties, state.blinkFrame);
  const eyeFrameRight = getEyeFrame(baseEyeRight, expression ? expression.right : -1, headFrame.right, headProperties, state.blinkFrame);
  const irisLeft = expression ? expression.leftIris : Iris.Forward;
  const irisRight = expression ? expression.rightIris : Iris.Forward;
  const drawnEyeFrameLeft = headFlip ? eyeFrameRight : eyeFrameLeft;
  const drawnEyeFrameRight = headFlip ? eyeFrameLeft : eyeFrameRight;
  const drawnIrisLeft = headFlip ? flipIris(irisRight) : irisLeft;
  const drawnIrisRight = headFlip ? flipIris(irisLeft) : irisRight;
  const eyeSets = sprites.eyeLeft as unknown as EyeSprites[];
  const eyeSetsRight = sprites.eyeRight as unknown as EyeSprites[];
  const shadowPalette = look.look.eyeShadowColor ? new Uint32Array([0, look.look.eyeShadowColor]) : undefined;

  drawEye(batch, att(at(eyeSets, drawnEyeFrameLeft), look.eyelashes), drawnIrisLeft, look.eyePalette, look.eyeColor, shadowPalette, x, y);
  drawEye(batch, att(at(eyeSetsRight, drawnEyeFrameRight), look.eyelashes), drawnIrisRight, look.eyePalette, look.eyeColor, shadowPalette, x, y);

  if (look.facialHair) {
    drawSet(batch, sprites.facialHairBehind as Sets, look.facialHair, x, y, WHITE);
  }

  const muzzle = getMouthFrame(expression ? expression.muzzle : undefined, headFrame.mouth, look.look.muzzle as Muzzle, headProperties);
  const noses = at(sprites.noses as unknown as Sets[], muzzle);
  const noseExtra = look.nose && att(att(noses as unknown as { mouth?: Sprite }[][], look.nose.type), 0);

  if (noseExtra && noseExtra.mouth) {
    batch.drawSprite(noseExtra.mouth, WHITE, look.defaultPalette, x, y);
  }

  if (look.nose) {
    drawSet(batch, noses as Sets, look.nose, x, y, WHITE);
  }

  if (look.look.fangs && noseExtra && noseExtra.fangs) {
    batch.drawSprite(noseExtra.fangs, WHITE, look.defaultPalette, x, y);
  }

  if (look.facialHair) {
    drawSet(batch, sprites.facialHair as Sets, look.facialHair, x, y, WHITE);
  }

  if (backMane) {
    drawSet(batch, sprites.backFrontManes as Sets, backMane, x, y, WHITE);
  }

  if (mane) {
    drawSet(batch, sprites.topManes as Sets, mane, x, y, WHITE);
  }

  if (toySprite) {
    drawSet(batch, sprites.extraAccessories as Sets, toySprite, x + extraOffset.x, y + extraOffset.y, WHITE);
  }

  if (look.horn) {
    drawSet(batch, sprites.horns as Sets, look.horn, x, y, WHITE);
  }

  drawSet(batch, sprites.ears as Sets, look.ears, x, y, WHITE);

  if (look.faceAccessory) {
    drawSetExtra(batch, sprites.faceAccessories2 as Sets, look.faceAccessory, x, y, WHITE);
  }

  if (look.earAccessory) {
    drawSet(batch, sprites.earAccessories as Sets, look.earAccessory, x, y, WHITE);
  }

  if (mane) {
    drawSet(batch, sprites.frontManes as Sets, mane, x, y, WHITE);
  }

  batch.restore();

  if (swimming) {
    batch.clearCrop();
  }
}

const cache = new Map<string, { canvas: HTMLCanvasElement; used: number }>();
let cacheMisses = 0;
let cacheHits = 0;

export function ponyCacheStats() {
  return { size: cache.size, misses: cacheMisses, hits: cacheHits };
}

export function bakePony(key: string, look: PaletteLook, state: PonyState, flipped: boolean): HTMLCanvasElement {
  const cached = cache.get(key);

  if (cached) {
    cacheHits++;
    cached.used = performance.now();
    return cached.canvas;
  }

  cacheMisses++;

  const canvas = document.createElement('canvas');
  canvas.width = PONY_WIDTH;
  canvas.height = PONY_HEIGHT;
  const batch = new PonyBatch(canvas);
  drawPony(batch, look, state, flipped);
  batch.flush();
  cache.set(key, { canvas, used: performance.now() });

  if (cache.size > 128) {
    const entries = [...cache.entries()].sort((a, b) => a[1].used - b[1].used);

    for (let i = 0; i < 32; i++) {
      cache.delete(entries[i][0]);
    }
  }

  return canvas;
}

export function drawPonyToCanvas(canvas: HTMLCanvasElement, look: PaletteLook, state: PonyState, flipped: boolean, swimming = false, toy = 0) {
  const batch = new PonyBatch(canvas);
  drawPony(batch, look, state, flipped, swimming, toy);
  batch.flush();
}
