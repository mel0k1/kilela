import { Application, Container, Sprite, Texture, Text, Graphics } from 'pixi.js';
import {
  TILE, makeTileTexture, makePathTexture, makeTreeTexture, makeSoftCircleTexture,
  makeGlowTexture, hashPosition, MAP_PALETTES,
} from './scenery';
import { getMap, type MapDef } from '../../../shared/protocol';
import { bakePony, PONY_WIDTH } from '../pony/draw';
import type { PonyActor } from '../pony/anim';
import type { PaletteLook } from '../pony/look';

const canvasTextures = new WeakMap<HTMLCanvasElement, Texture>();

export function canvasTexture(canvas: HTMLCanvasElement): Texture {
  let texture = canvasTextures.get(canvas);

  if (!texture) {
    texture = Texture.from(canvas);
    canvasTextures.set(canvas, texture);
  }

  return texture;
}

const DAY_LENGTH = 360;

interface EntityView {
  id: number;
  name: string;
  actor: PonyActor;
  look: PaletteLook;
  lookCode: string;
  sprite: Sprite;
  label: Text;
  bubbleText: Text | undefined;
  bubbleBg: Graphics | undefined;
  bubbleTimer: number;
  x: number;
  y: number;
  dir: number;
}

interface TreeDef {
  x: number;
  y: number;
  kind: number;
}

export class WorldView {
  readonly tileLayer = new Container();
  readonly mainLayer = new Container();
  readonly nightLayer = new Container();
  readonly weatherLayer = new Container();
  readonly fadeLayer = new Container();
  private app!: Application;
  private tilePool: Sprite[] = [];
  private tileTextures: Texture[] = [];
  private pathTexture: Texture | undefined;
  private treeTextures: Texture[] = [];
  private trees: TreeDef[] = [];
  private map: MapDef = getMap('meadow');
  readonly entities = new Map<number, EntityView>();
  private fogSprites: Sprite[] = [];
  private snowSprites: Sprite[] = [];
  private nightRect = new Graphics();
  private warmRect = new Graphics();
  private fadeRect = new Graphics();
  private portalGlows: { sprite: Sprite; label: Text; x: number; y: number }[] = [];
  private time = 0;
  fade = 0;
  fadeDir = 0;
  onFadePeak: (() => void) | undefined = undefined;
  get mapId(): string {
    return this.map.id;
  }

  init(app: Application) {
    this.app = app;
    this.mainLayer.sortableChildren = true;
    app.stage.addChild(this.tileLayer);
    app.stage.addChild(this.mainLayer);
    app.stage.addChild(this.nightLayer);
    this.nightLayer.addChild(this.nightRect);
    this.nightLayer.addChild(this.warmRect);
    app.stage.addChild(this.weatherLayer);
    app.stage.addChild(this.fadeLayer);
    this.fadeLayer.addChild(this.fadeRect);
    this.nightRect.rect(0, 0, 4000, 4000).fill(0x0a103c);
    this.warmRect.rect(0, 0, 4000, 4000).fill(0xff8c3c);
    this.fadeRect.rect(0, 0, 4000, 4000).fill(0x14100a);
    this.fadeRect.alpha = 0;

    for (let i = 0; i < 9; i++) {
      const fog = new Sprite(canvasTexture(makeSoftCircleTexture(256, 'rgba(228,238,234,0.55)')));
      fog.alpha = 0;
      fog.scale.set(3 + Math.random() * 2);
      this.weatherLayer.addChild(fog);
      this.fogSprites.push(fog);
    }

    for (let i = 0; i < 90; i++) {
      const flake = new Sprite(canvasTexture(makeSoftCircleTexture(16, 'rgba(255,255,255,0.9)')));
      flake.alpha = 0;
      flake.scale.set(0.4 + Math.random() * 0.5);
      this.weatherLayer.addChild(flake);
      this.snowSprites.push(flake);
    }
  }

  get dayTime(): number {
    return (this.time / DAY_LENGTH) % 1;
  }

  buildMap(mapId: string) {
    this.map = getMap(mapId);
    this.tileTextures = [];

    for (let v = 0; v < 8; v++) {
      this.tileTextures.push(canvasTexture(makeTileTexture(mapId, v)));
    }

    this.pathTexture = canvasTexture(makePathTexture(mapId));
    this.treeTextures = [];

    for (let k = 0; k < 3; k++) {
      this.treeTextures.push(canvasTexture(makeTreeTexture(mapId, k)));
    }

    this.trees = this.generateTrees();

    for (const glow of this.portalGlows) {
      glow.sprite.destroy();
      glow.label.destroy();
    }

    this.portalGlows = [];

    for (const portal of this.map.portals) {
      const glow = new Sprite(canvasTexture(makeGlowTexture()));
      glow.anchor.set(0.5);
      glow.alpha = 0.9;
      const label = new Text({
        text: portal.label,
        style: { fontFamily: 'Trebuchet MS, sans-serif', fontSize: 13, fill: 0xfff6dd, stroke: { color: 0x5a4632, width: 3 } },
      });
      label.anchor.set(0.5, 1);
      label.position.set(portal.x * TILE + TILE / 2, portal.y * TILE - 26);
      label.zIndex = 100000;
      this.mainLayer.addChild(glow);
      this.mainLayer.addChild(label);
      this.portalGlows.push({ sprite: glow, label, x: portal.x, y: portal.y });
    }

    this.tilePool.forEach(sprite => sprite.destroy());
    this.tilePool = [];

    for (const entity of this.entities.values()) {
      this.placeEntityAtTile(entity);
    }
  }

  private generateTrees(): TreeDef[] {
    const trees: TreeDef[] = [];
    const { w, h } = this.map;
    const pathY = this.map.spawnY;

    for (let gy = 2; gy < h - 2; gy++) {
      for (let gx = 2; gx < w - 2; gx++) {
        const hash = hashPosition(this.map.id, gx, gy);
        const density = this.map.weather === 'fog' ? 10 : this.map.weather === 'snow' ? 6 : 5;

        if (hash % 100 >= density) {
          continue;
        }

        if (Math.abs(gy - pathY) <= 1) continue;

        const nearPortal = this.map.portals.some(
          p => Math.abs(p.x - gx) < 4 && Math.abs(p.y - gy) < 4,
        );
        const nearSpawn = Math.abs(gx - this.map.spawnX) < 5 && Math.abs(gy - this.map.spawnY) < 5;

        if (nearPortal || nearSpawn) continue;

        if (hash % 97 < 5) {
          trees.push({ x: gx, y: gy, kind: hash % 3 });
        }
      }
    }

    return trees;
  }

  addEntity(id: number, name: string, look: PaletteLook, lookCode: string, actor: PonyActor, x: number, y: number) {
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 1);
    const label = new Text({
      text: name,
      style: { fontFamily: 'Trebuchet MS, sans-serif', fontSize: 12, fill: 0xffffff, stroke: { color: 0x4a3826, width: 3 } },
    });
    label.anchor.set(0.5, 1);
    this.mainLayer.addChild(sprite);
    this.mainLayer.addChild(label);

    const view: EntityView = {
      id, name, actor, look, lookCode, sprite, label,
      bubbleText: undefined, bubbleBg: undefined, bubbleTimer: 0,
      x, y, dir: 0,
    };

    this.entities.set(id, view);
    this.placeEntityAtTile(view);
    return view;
  }

  removeEntity(id: number) {
    const view = this.entities.get(id);

    if (!view) return;

    view.sprite.destroy();
    view.label.destroy();
    view.bubbleText?.destroy();
    view.bubbleBg?.destroy();
    this.entities.delete(id);
  }

  placeEntityAtTile(view: EntityView) {
    const px = view.x * TILE + TILE / 2;
    const py = view.y * TILE + TILE;
    view.sprite.position.set(px, py);
    view.sprite.zIndex = py;
    view.label.position.set(px, py - 72);
    view.label.zIndex = py + 0.5;
    view.bubbleBg?.position.set(px, py - 96);
    view.bubbleText?.position.set(px, py - 90);
  }

  setEntityPos(id: number, x: number, y: number, dir: number) {
    const view = this.entities.get(id);

    if (!view) return;

    view.x = x;
    view.y = y;
    view.dir = dir;
  }

  setEntityLook(id: number, look: PaletteLook, lookCode: string) {
    const view = this.entities.get(id);

    if (!view) return;

    view.look = look;
    view.lookCode = lookCode;
  }

  showBubble(id: number, text: string) {
    const view = this.entities.get(id);

    if (!view) return;

    if (view.bubbleText) {
      view.bubbleText.destroy();
      view.bubbleBg?.destroy();
    }

    const bubbleText = new Text({
      text,
      style: {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: 12, fill: 0x3a2e1e,
        wordWrap: true, wordWrapWidth: 170, breakWords: true, align: 'center',
      },
    });
    bubbleText.anchor.set(0.5, 1);
    const bg = new Graphics();
    const w = Math.max(34, bubbleText.width + 16);
    const h = bubbleText.height + 12;
    bg.roundRect(-w / 2, -h, w, h, 8);
    bg.fill({ color: 0xfff9e8, alpha: 0.94 });
    bg.stroke({ color: 0xd8c49a, width: 1.5 });
    bg.position.set(0, 0);
    bg.zIndex = 100001;
    bubbleText.zIndex = 100002;
    this.mainLayer.addChild(bg);
    this.mainLayer.addChild(bubbleText);
    view.bubbleText = bubbleText;
    view.bubbleBg = bg;
    view.bubbleTimer = 6;
    this.placeEntityAtTile(view);
  }

  update(dt: number, playerX: number, playerY: number, playerDir: number) {
    this.time += dt;

    const screenW = this.app.renderer.width / this.app.renderer.resolution;
    const screenH = this.app.renderer.height / this.app.renderer.resolution;

    for (const view of this.entities.values()) {
      view.actor.update(dt);
      const flipped = view.dir === 2;
      const expr = view.actor.state.expression;
      const exprKey = expr ? `${expr.left},${expr.right},${expr.muzzle},${expr.extra}` : '-';
      const key = `${view.lookCode}|${flipped ? 1 : 0}|${view.actor.state.animation.name}|${view.actor.state.animationFrame}|${view.actor.state.headAnimation?.name || '-'}|${view.actor.state.headAnimationFrame}|${view.actor.state.blinkFrame}|${exprKey}`;
      const canvas = bakePony(key, view.look, view.actor.state, flipped);
      view.sprite.texture = canvasTexture(canvas);
      view.sprite.scale.set(1, 1);

      if (view.bubbleTimer > 0) {
        view.bubbleTimer -= dt;

        if (view.bubbleTimer <= 0) {
          view.bubbleText?.destroy();
          view.bubbleBg?.destroy();
          view.bubbleText = undefined;
          view.bubbleBg = undefined;
        }
      }
    }

    const camX = playerX * TILE + TILE / 2;
    const camY = playerY * TILE + TILE / 2;
    const mapW = this.map.w * TILE;
    const mapH = this.map.h * TILE;
    const camPX = Math.max(screenW / 2, Math.min(mapW - screenW / 2, camX));
    const camPY = Math.max(screenH / 2, Math.min(mapH - screenH / 2, camY));
    this.tileLayer.position.set(Math.round(screenW / 2 - camPX), Math.round(screenH / 2 - camPY));
    this.mainLayer.position = this.tileLayer.position;

    const tilesX = Math.ceil(screenW / TILE) + 2;
    const tilesY = Math.ceil(screenH / TILE) + 2;
    const startTX = Math.floor((camX - screenW / 2) / TILE) - 1;
    const startTY = Math.floor((camY - screenH / 2) / TILE) - 1;
    const pathY = this.map.spawnY;
    let poolIndex = 0;

    for (let ty = startTY; ty < startTY + tilesY; ty++) {
      for (let tx = startTX; tx < startTX + tilesX; tx++) {
        if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) continue;

        let sprite = this.tilePool[poolIndex];

        if (!sprite) {
          sprite = new Sprite();
          this.tileLayer.addChild(sprite);
          this.tilePool.push(sprite);
        }

        const isPath = ty === pathY || ty === pathY + 1;
        const hash = hashPosition(this.map.id, tx, ty);
        sprite.texture = isPath ? this.pathTexture! : this.tileTextures[hash % this.tileTextures.length];
        sprite.position.set(tx * TILE, ty * TILE);
        poolIndex++;
      }
    }

    for (let i = poolIndex; i < this.tilePool.length; i++) {
      this.tilePool[i].position.set(-9999, -9999);
    }

    for (const glow of this.portalGlows) {
      glow.sprite.position.set(glow.x * TILE + TILE / 2, glow.y * TILE + TILE / 2 - 8);
      glow.sprite.alpha = 0.55 + Math.sin(this.time * 2.4) * 0.18;
      glow.sprite.scale.set(0.85 + Math.sin(this.time * 1.7) * 0.08);
    }

    this.updateDayNight(screenW, screenH);
    this.updateWeather(dt, screenW, screenH);

    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * dt * 2.2;

      if (this.fade >= 1) {
        this.fade = 1;
        this.fadeDir = -1;
        this.onFadePeak?.();
      }

      if (this.fade <= 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }

    this.fadeRect.alpha = this.fade;
  }

  private updateDayNight(screenW: number, screenH: number) {
    const t = this.dayTime;
    let darkness = 0;
    let warmth = 0;

    if (t < 0.42) {
      darkness = 0;
      warmth = t < 0.06 ? (0.06 - t) * 2 : 0;
    } else if (t < 0.5) {
      const k = (t - 0.42) / 0.08;
      darkness = k * 0.28;
      warmth = 0.16;
    } else if (t < 0.58) {
      const k = (t - 0.5) / 0.08;
      darkness = 0.28 + k * 0.17;
      warmth = 0.16 * (1 - k);
    } else if (t < 0.92) {
      darkness = 0.45;
      warmth = 0;
    } else {
      const k = (t - 0.92) / 0.08;
      darkness = 0.45 * (1 - k);
      warmth = k * 0.12;
    }

    this.nightRect.alpha = darkness;
    this.nightRect.width = screenW + 8;
    this.nightRect.height = screenH + 8;
    this.warmRect.alpha = warmth;
    this.warmRect.width = screenW + 8;
    this.warmRect.height = screenH + 8;
  }

  private updateWeather(dt: number, screenW: number, screenH: number) {
    const weather = this.map.weather;

    for (const fog of this.fogSprites) {
      if (weather === 'fog') {
        fog.alpha = Math.min(0.16, fog.alpha + dt * 0.05);
        fog.x += dt * 6;

        if (fog.x > screenW + 200) {
          fog.x = -300;
          fog.y = Math.random() * screenH;
        }

        if (fog.y === 0) {
          fog.y = Math.random() * screenH;
        }
      } else {
        fog.alpha = Math.max(0, fog.alpha - dt * 0.1);
      }
    }

    for (const flake of this.snowSprites) {
      if (weather === 'snow') {
        flake.alpha = Math.min(0.85, flake.alpha + dt * 0.4);

        if (flake.x === 0 && flake.y === 0) {
          flake.x = Math.random() * screenW;
          flake.y = Math.random() * screenH;
        }

        flake.y += dt * (28 + flake.scale.x * 30);
        flake.x += Math.sin(this.time * 1.4 + flake.y * 0.02) * dt * 14;

        if (flake.y > screenH + 10) {
          flake.y = -10;
          flake.x = Math.random() * screenW;
        }
      } else {
        flake.alpha = Math.max(0, flake.alpha - dt * 0.5);

        if (flake.alpha === 0) {
          flake.x = 0;
          flake.y = 0;
        }
      }
    }
  }
}

export function directionFromVector(dx: number, dy: number): number {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 3 : 2;
  }

  return dy > 0 ? 0 : 1;
}

export { PONY_WIDTH };
