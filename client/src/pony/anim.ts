import type { BodyAnimation, HeadAnimation, PonyState, Expression } from './pt/interfaces';
import { ExpressionExtra, Eye, Iris, Muzzle } from './pt/interfaces';
import {
  stand, trot, sit, sitDown, standUp, lie, lieDown, sitUp, sitToTrot, lieToTrot, dance, boop,
  smileHead, nom, laugh, yawn, surprise, excite, happyTongue,
} from './pt/animations';
import { EXPRESSION_PRESETS } from './look';

export type Target = 'stand' | 'walk' | 'sit' | 'lie' | 'dance';

const HEAD_ANIMS: Record<string, HeadAnimation | undefined> = {
  laugh, surprise, excite, nom, yawn, tongue: happyTongue,
};

const TEMP_EXPRESSIONS: Record<string, () => Expression | undefined> = {
  happy: () => ({ left: Eye.ClosedHappy2, leftIris: Iris.Forward, right: Eye.ClosedHappy2, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.None }),
  wink: () => ({ left: Eye.Closed, leftIris: Iris.Forward, right: Eye.Neutral, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.None }),
  sad: () => ({ left: Eye.Sad, leftIris: Iris.Forward, right: Eye.Sad, rightIris: Iris.Forward, muzzle: Muzzle.Frown, extra: ExpressionExtra.None }),
  angry: () => ({ left: Eye.Angry, leftIris: Iris.Forward, right: Eye.Angry, rightIris: Iris.Forward, muzzle: Muzzle.Frown, extra: ExpressionExtra.None }),
  hearts: () => ({ left: Eye.ClosedHappy2, leftIris: Iris.Forward, right: Eye.ClosedHappy2, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.Blush | ExpressionExtra.Hearts }),
  hug: () => ({ left: Eye.ClosedHappy, leftIris: Iris.Forward, right: Eye.ClosedHappy, rightIris: Iris.Forward, muzzle: Muzzle.Smile, extra: ExpressionExtra.Blush }),
};

const TEMP_EXPRESSION_TIME = 4;
const SLEEPY_EXPRESSION: Expression = {
  left: Eye.Closed, leftIris: Iris.Forward, right: Eye.Closed, rightIris: Iris.Forward,
  muzzle: Muzzle.Neutral, extra: ExpressionExtra.Zzz,
};

export class PonyActor {
  state: PonyState;
  target: Target = 'stand';
  private baseTime = 0;
  private chain: BodyAnimation[] = [];
  private chainIndex = 0;
  private pendingTarget: Target | undefined;
  private headTime = 0;
  private headOnce: HeadAnimation | undefined;
  private tempExpression: Expression | undefined;
  private tempExpressionTimer = 0;
  private blinkTimer = 2 + Math.random() * 4;
  private blinkActive = 0;

  constructor() {
    this.state = {
      animation: stand,
      animationFrame: 0,
      headAnimation: undefined,
      headAnimationFrame: 0,
      headTurned: false,
      headTilt: 0,
      headTurn: 0,
      blinkFrame: 0,
      expression: undefined,
      blushColor: 0,
      flags: 0,
    };
  }

  get currentAnimation(): BodyAnimation {
    return this.state.animation;
  }

  private setAnim(anim: BodyAnimation) {
    this.state.animation = anim;
    this.state.animationFrame = 0;
    this.baseTime = 0;
  }

  private baseAnimFor(target: Target): BodyAnimation {
    switch (target) {
      case 'walk': return trot;
      case 'sit': return sit;
      case 'lie': return lie;
      case 'dance': return dance;
      default: return stand;
    }
  }

  private poseOf(anim: BodyAnimation): Target | 'transit' {
    if (anim === sit) return 'sit';
    if (anim === lie) return 'lie';
    if (anim === trot) return 'walk';
    if (anim === dance) return 'dance';
    if (anim === stand) return 'stand';
    return 'transit';
  }

  private chainTo(target: Target): BodyAnimation[] {
    const current = this.poseOf(this.state.animation);
    const chain: BodyAnimation[] = [];

    const push = (anim: BodyAnimation) => chain.push(anim);

    if (target === current) {
      return chain;
    }

    if (current === 'sit') {
      if (target === 'stand') push(standUp);
      else if (target === 'walk') push(sitToTrot);
      else if (target === 'lie') push(lieDown);
      else if (target === 'dance') { push(standUp); }
    } else if (current === 'lie') {
      if (target === 'sit') push(sitUp);
      else if (target === 'stand') { push(sitUp); push(standUp); }
      else if (target === 'walk') push(lieToTrot);
      else if (target === 'dance') { push(sitUp); push(standUp); }
    } else {
      if (target === 'sit') push(sitDown);
      else if (target === 'lie') { push(sitDown); push(lieDown); }
    }

    push(this.baseAnimFor(target));
    return chain;
  }

  setTarget(target: Target) {
    if (target === this.target && this.chain.length === 0) {
      return;
    }

    if (this.chain.length > 0) {
      this.pendingTarget = target;
      return;
    }

    this.target = target;
    this.chain = this.chainTo(target);
    this.chainIndex = 0;

    if (this.chain.length > 0) {
      this.setAnim(this.chain[0]);
    } else {
      this.setAnim(this.baseAnimFor(target));
    }

    if (target === 'lie') {
      this.tempExpression = SLEEPY_EXPRESSION;
      this.tempExpressionTimer = Infinity;
    } else if (this.tempExpression === SLEEPY_EXPRESSION) {
      this.tempExpression = undefined;
      this.tempExpressionTimer = 0;
    }
  }

  playOnce(anim: BodyAnimation, returnTo?: Target) {
    if (this.chain.length > 0) {
      return;
    }

    const currentPose = this.poseOf(this.state.animation);

    if (anim === boop && currentPose !== 'stand') {
      return;
    }

    this.chain = [anim, this.baseAnimFor(returnTo || this.target)];
    this.chainIndex = 0;
    this.setAnim(anim);
  }

  playHead(name: string) {
    const anim = HEAD_ANIMS[name];

    if (!anim) return;

    this.headOnce = anim.loop ? undefined : anim;
    this.state.headAnimation = anim;
    this.state.headAnimationFrame = 0;
    this.headTime = 0;

    if (!anim.loop) {
      this.tempExpressionTimer = Math.max(this.tempExpressionTimer, anim.frames.length / anim.fps + 0.5);
    }
  }

  playExpression(name: string) {
    const maker = TEMP_EXPRESSIONS[name];

    if (!maker) return;

    const expression = maker();

    this.tempExpression = expression;
    this.tempExpressionTimer = TEMP_EXPRESSION_TIME;
  }

  update(dt: number) {
    const anim = this.state.animation;
    this.baseTime += dt;
    const frameDur = 1 / anim.fps;

    while (this.baseTime >= frameDur) {
      this.baseTime -= frameDur;

      if (anim.loop) {
        this.state.animationFrame = (this.state.animationFrame + 1) % anim.frames.length;
      } else {
        this.state.animationFrame++;

        if (this.state.animationFrame >= anim.frames.length) {
          this.chainIndex++;

          if (this.chainIndex < this.chain.length) {
            const next = this.chain[this.chainIndex];
            this.state.animation = next;
            this.state.animationFrame = 0;
            this.baseTime = 0;

            if (next.loop) {
              this.chain = [];
              this.chainIndex = 0;
            }
          } else {
            this.chain = [];
            this.chainIndex = 0;

            const finalTarget = this.pendingTarget ?? this.target;
            this.pendingTarget = undefined;

            if (finalTarget !== this.target) {
              this.target = finalTarget;
              this.chain = this.chainTo(finalTarget);
              this.chainIndex = 0;

              if (this.chain.length > 0) {
                this.state.animation = this.chain[0];
                this.state.animationFrame = 0;
                this.baseTime = 0;
              } else {
                this.state.animation = this.baseAnimFor(finalTarget);
                this.state.animationFrame = 0;
                this.baseTime = 0;
              }
            } else {
              this.state.animation = this.baseAnimFor(this.target);
              this.state.animationFrame = 0;
              this.baseTime = 0;
            }

            if (this.target === 'lie') {
              this.tempExpression = SLEEPY_EXPRESSION;
              this.tempExpressionTimer = Infinity;
            } else if (this.tempExpression === SLEEPY_EXPRESSION) {
              this.tempExpression = undefined;
              this.tempExpressionTimer = 0;
            }
          }
        }
      }
    }

    if (this.state.headAnimation) {
      const head = this.state.headAnimation;
      this.headTime += dt;
      const headDur = 1 / head.fps;

      while (this.headTime >= headDur) {
        this.headTime -= headDur;
        this.state.headAnimationFrame++;

        if (this.state.headAnimationFrame >= head.frames.length) {
          if (head.loop || this.headOnce !== head) {
            this.state.headAnimationFrame = 0;

            if (!head.loop) {
              this.state.headAnimation = undefined;
              this.state.headAnimationFrame = 0;
              this.headOnce = undefined;
            }

            break;
          } else {
            this.state.headAnimation = undefined;
            this.state.headAnimationFrame = 0;
            this.headOnce = undefined;
            break;
          }
        }
      }
    }

    if (this.tempExpressionTimer > 0) {
      if (this.tempExpressionTimer !== Infinity) {
        this.tempExpressionTimer -= dt;

        if (this.tempExpressionTimer <= 0) {
          this.tempExpression = undefined;
          this.tempExpressionTimer = 0;
        }
      }
    }

    this.state.expression = this.tempExpression ||
      (this.target === 'lie' ? SLEEPY_EXPRESSION : undefined);

    this.blinkTimer -= dt;

    if (this.blinkTimer <= 0 && this.blinkActive === 0) {
      this.blinkActive = 1;
      this.blinkTimer = 2.5 + Math.random() * 4;
    }

    if (this.blinkActive > 0) {
      this.blinkActive += dt * 24;
      this.state.blinkFrame = Math.min(6, Math.floor(this.blinkActive));

      if (this.state.blinkFrame >= 6) {
        this.blinkActive = 0;
        this.state.blinkFrame = 0;
      }
    } else {
      this.state.blinkFrame = 0;
    }
  }
}

export function expressionPresetOfLook(expressionIndex: number): Expression | undefined {
  const preset = EXPRESSION_PRESETS[expressionIndex];
  return preset ? preset.expression : undefined;
}
