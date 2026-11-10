import { Application, Container, Sprite, Texture, Text, Graphics } from 'pixi.js';
import { makeSoftCircleTexture, makeGlowTexture } from './scenery';
import {
  TILE_W, TILE_H, createMapTiles, tileTexture, objectDefs, objectTexture, objectHeight,
  decorTexture, isGroundDecor, buildWallPieces, wallTexture, wallSpriteSize,
  type MapTiles, type WallPiece,
} from './tiles';
import {
  buildWorld, decorPlacements, treePlacements, findPath,
  type PathPoint, type TreePlacement,
} from '../../../shared/world';
import { getMap, type MapDef } from '../../../shared/protocol';
import { drawPonyToCanvas, PONY_WIDTH } from '../pony/draw';
import { emoteAnim, type EmoteAnim } from '../pony/emotes';
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
const WATER_FPS = 6;

interface EntityView {
  id: number;
  name: string;
  actor: PonyActor;
  look: PaletteLook;
  lookCode: string;
  sprite: Sprite;
  canvas: HTMLCanvasElement;
  label: Text;
  bubbleText: Text | undefined;
  bubbleBg: Graphics | undefined;
  bubbleTimer: number;
  emoteSprite: Sprite | undefined;
  emoteAnim: EmoteAnim | undefined;
  emoteFrame: number;
  emoteFrameTime: number;
  emoteTimer: number;
  x: number;
  y: number;
  dir: number;
}

interface DecorView {
  kind: string;
  x: number;
  y: number;
  sprite: Sprite;
  shadowless: boolean;
}

interface LanternGlow {
  sprite: Sprite;
  x: number;
  y: number;
  phase: number;
}

export class WorldView {
  readonly tileLayer = new Container();
  readonly mainLayer = new Container();
  readonly nightLayer = new Container();
  readonly weatherLayer = new Container();
  readonly fadeLayer = new Container();
  private app!: Application;
  private tiles: MapTiles | undefined;
  private tilePool: Sprite[] = [];
  private bgRect = new Graphics();
  private waterFrame = 0;
  private treeTextures: Texture[] = [];
  private trees: TreePlacement[] = [];
  private treeSprites: Sprite[] = [];
  private treeShadowSprites: Sprite[] = [];
  private wallSprites: Sprite[] = [];
  private decorSprites: Sprite[] = [];
  private blocked: Uint8Array = new Uint8Array(0);
  private lanternGlows: LanternGlow[] = [];
  private shadowTexture: Texture | undefined;
  private fireflies: Sprite[] = [];
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
    this.tileLayer.addChild(this.bgRect);
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
    this.shadowTexture = canvasTexture(makeSoftCircleTexture(96, 'rgba(16,14,40,0.9)'));

    for (let i = 0; i < 16; i++) {
      const fly = new Sprite(canvasTexture(makeSoftCircleTexture(14, 'rgba(255,242,180,0.95)')));
      fly.anchor.set(0.5);
      fly.alpha = 0;
      fly.scale.set(0.6 + Math.random() * 0.5);
      fly.x = Math.random() * window.innerWidth;
      fly.y = Math.random() * window.innerHeight;
      this.weatherLayer.addChild(fly);
      this.fireflies.push(fly);
    }

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

  isWaterAt(tx: number, ty: number): boolean {
    if (!this.tiles || tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return false;

    return this.tiles.grid[tx + ty * this.map.w] === 2;
  }

  isBlockedAt(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return true;

    return this.blocked[tx + ty * this.map.w] === 1;
  }

  computePath(sx: number, sy: number, tx: number, ty: number): PathPoint[] {
    return findPath(this.blocked, this.map, sx, sy, tx, ty);
  }

  buildMap(mapId: string) {
    this.map = getMap(mapId);
    this.tiles = createMapTiles(this.map);
    this.bgRect.clear();
    this.bgRect.rect(0, 0, this.map.w * TILE_W, this.map.h * TILE_H).fill(this.tiles.background);

    const kinds = objectDefs(mapId);
    this.treeTextures = kinds.map(kind => objectTexture(mapId, kind));

    for (const treeSprite of this.treeSprites) {
      treeSprite.destroy();
    }

    this.treeSprites = [];

    for (const shadowSprite of this.treeShadowSprites) {
      shadowSprite.destroy();
    }

    this.treeShadowSprites = [];

    for (const wallSprite of this.wallSprites) {
      wallSprite.destroy();
    }

    this.wallSprites = [];

    for (const decorSprite of this.decorSprites) {
      decorSprite.destroy();
    }

    this.decorSprites = [];

    for (const glow of this.lanternGlows) {
      glow.sprite.destroy();
    }

    this.lanternGlows = [];
    this.blocked = buildWorld(this.map).blocked;
    this.trees = treePlacements(this.map, this.tiles.grid);

    for (const tree of this.trees) {
      const kind = kinds[tree.kind];
      const base = tree.y * TILE_H + TILE_H;
      const shadow = new Sprite(this.shadowTexture!);
      shadow.anchor.set(0.5, 0.5);
      shadow.scale.set(1.3, 0.55);
      shadow.alpha = 0.2;
      shadow.position.set(tree.x * TILE_W + TILE_W / 2 - 6, base - 4);
      shadow.zIndex = base - 3.5;
      this.mainLayer.addChild(shadow);
      this.treeShadowSprites.push(shadow);

      const sprite = new Sprite(this.treeTextures[tree.kind]);
      sprite.anchor.set(0.5, 1);
      sprite.position.set(tree.x * TILE_W + TILE_W / 2, base - 2);
      sprite.zIndex = base - 3;
      this.mainLayer.addChild(sprite);
      this.treeSprites.push(sprite);
    }

    this.buildCaveWalls();
    this.buildDecor();

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
      label.position.set(portal.x * TILE_W + TILE_W / 2, portal.y * TILE_H - 26);
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

  private buildCaveWalls() {
    if (!this.tiles) return;

    const pieces: WallPiece[] = buildWallPieces(this.tiles, this.map);

    for (const piece of pieces) {
      const { w, h, oy } = wallSpriteSize(piece.variant);
      const sprite = new Sprite(wallTexture(piece.variant));
      const baseY = (piece.ty + 1) * TILE_H;
      const topY = baseY - h + oy;
      sprite.position.set(piece.tx * TILE_W, topY);
      sprite.zIndex = piece.kind === 'face' ? baseY - 0.1 : baseY - 0.2;
      this.mainLayer.addChild(sprite);
      this.wallSprites.push(sprite);
    }
  }

  private buildDecor() {
    if (!this.tiles) return;

    for (const item of decorPlacements(this.map, this.tiles.grid, this.tiles.walls)) {
      const texture = decorTexture(item.kind);
      const sprite = new Sprite(texture);
      const base = item.y * TILE_H + TILE_H;
      sprite.anchor.set(0.5, 1);
      sprite.position.set(item.x * TILE_W + TILE_W / 2, base - 1);

      if (isGroundDecor(item.kind)) {
        sprite.zIndex = base - 0.6;
      } else {
        sprite.zIndex = base - 2.4;
      }

      this.mainLayer.addChild(sprite);
      this.decorSprites.push(sprite);

      if (item.kind === 'crystal_lantern') {
        const glow = new Sprite(canvasTexture(makeGlowTexture()));
        glow.anchor.set(0.5);
        glow.tint = 0x9fe8ff;
        glow.alpha = 0.5;
        glow.zIndex = base + 0.4;
        this.mainLayer.addChild(glow);
        this.lanternGlows.push({ sprite: glow, x: item.x, y: item.y, phase: Math.random() * 6.28 });
      }
    }
  }

  addEntity(id: number, name: string, look: PaletteLook, lookCode: string, actor: PonyActor, x: number, y: number) {
    const canvas = document.createElement('canvas');
    canvas.width = PONY_WIDTH;
    canvas.height = 70;
    drawPonyToCanvas(canvas, look, actor.state, false);
    const texture = Texture.from(canvas);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    const label = new Text({
      text: name,
      style: { fontFamily: 'Trebuchet MS, sans-serif', fontSize: 12, fill: 0xffffff, stroke: { color: 0x4a3826, width: 3 } },
    });
    label.anchor.set(0.5, 1);
    this.mainLayer.addChild(sprite);
    this.mainLayer.addChild(label);

    const view: EntityView = {
      id, name, actor, look, lookCode, sprite, canvas, label,
      bubbleText: undefined, bubbleBg: undefined, bubbleTimer: 0,
      emoteSprite: undefined, emoteAnim: undefined, emoteFrame: 0, emoteFrameTime: 0, emoteTimer: 0,
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
    this.destroyEmote(view);
    this.entities.delete(id);
  }

  private destroyEmote(view: EntityView) {
    view.emoteSprite?.destroy();
    view.emoteSprite = undefined;
    view.emoteAnim = undefined;
    view.emoteTimer = 0;
    view.emoteFrame = 0;
    view.emoteFrameTime = 0;
  }

  showEmote(id: number, name: string, seconds: number) {
    const view = this.entities.get(id);

    if (!view) return;

    const anim = emoteAnim(name);

    if (!anim) return;

    if (view.emoteSprite) {
      this.destroyEmote(view);
    }

    const sprite = new Sprite(canvasTexture(anim.canvases[0]));
    sprite.anchor.set(0.5, 1);
    sprite.zIndex = 100003;
    this.mainLayer.addChild(sprite);
    view.emoteSprite = sprite;
    view.emoteAnim = anim;
    view.emoteFrame = 0;
    view.emoteFrameTime = 0;
    view.emoteTimer = seconds;
    this.placeEntityAtTile(view);
  }

  placeEntityAtTile(view: EntityView) {
    const px = view.x * TILE_W + TILE_W / 2;
    const py = view.y * TILE_H + TILE_H;
    view.sprite.position.set(px, py);
    view.sprite.zIndex = py;
    view.label.position.set(px, py - 72);
    view.label.zIndex = py + 0.5;
    view.bubbleBg?.position.set(px, py - 96);
    view.bubbleText?.position.set(px, py - 90);

    if (view.emoteSprite) {
      view.emoteSprite.position.set(px, py);
    }
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
    this.waterFrame = Math.floor(this.time * WATER_FPS) % 4;

    const screenW = this.app.renderer.width / this.app.renderer.resolution;
    const screenH = this.app.renderer.height / this.app.renderer.resolution;

    for (const view of this.entities.values()) {
      view.actor.update(dt);
      this.placeEntityAtTile(view);
      const flipped = view.dir === 2;
      drawPonyToCanvas(view.canvas, view.look, view.actor.state, flipped);
      (view.sprite.texture as Texture).source.update();

      if (view.bubbleTimer > 0) {
        view.bubbleTimer -= dt;

        if (view.bubbleTimer <= 0) {
          view.bubbleText?.destroy();
          view.bubbleBg?.destroy();
          view.bubbleText = undefined;
          view.bubbleBg = undefined;
        }
      }

      if (view.emoteSprite && view.emoteAnim) {
        view.emoteFrameTime += dt;
        const frameDur = 1 / view.emoteAnim.fps;

        while (view.emoteFrameTime >= frameDur) {
          view.emoteFrameTime -= frameDur;
          view.emoteFrame = (view.emoteFrame + 1) % view.emoteAnim.canvases.length;
        }

        view.emoteSprite.texture = canvasTexture(view.emoteAnim.canvases[view.emoteFrame]);
        view.emoteTimer -= dt;

        if (view.emoteTimer <= 0) {
          this.destroyEmote(view);
        }
      }
    }

    const camX = playerX * TILE_W + TILE_W / 2;
    const camY = playerY * TILE_H + TILE_H / 2;
    const mapW = this.map.w * TILE_W;
    const mapH = this.map.h * TILE_H;
    const camPX = Math.max(screenW / 2, Math.min(mapW - screenW / 2, camX));
    const camPY = Math.max(screenH / 2, Math.min(mapH - screenH / 2, camY));
    this.tileLayer.position.set(Math.round(screenW / 2 - camPX), Math.round(screenH / 2 - camPY));
    this.mainLayer.position = this.tileLayer.position;

    const tilesX = Math.ceil(screenW / TILE_W) + 2;
    const tilesY = Math.ceil(screenH / TILE_H) + 2;
    const startTX = Math.floor((camPX - screenW / 2) / TILE_W) - 1;
    const startTY = Math.floor((camPY - screenH / 2) / TILE_H) - 1;
    let poolIndex = 0;

    if (this.tiles) {
      for (let ty = startTY; ty < startTY + tilesY; ty++) {
        for (let tx = startTX; tx < startTX + tilesX; tx++) {
          if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) continue;

          let sprite = this.tilePool[poolIndex];

          if (!sprite) {
            sprite = new Sprite();
            this.tileLayer.addChild(sprite);
            this.tilePool.push(sprite);
          }

          const index = this.tiles.indices[tx + ty * this.map.w];
          const typeNumber = index >>> 8;

          if (!this.tiles.sets.has(typeNumber) && typeNumber !== 2) continue;

          sprite.texture = tileTexture(this.tiles, index, this.waterFrame);
          sprite.position.set(tx * TILE_W, ty * TILE_H);
          poolIndex++;
        }
      }
    }

    for (let i = poolIndex; i < this.tilePool.length; i++) {
      this.tilePool[i].position.set(-9999, -9999);
    }

    for (const glow of this.portalGlows) {
      glow.sprite.position.set(glow.x * TILE_W + TILE_W / 2, glow.y * TILE_H + TILE_H / 2 - 8);
      glow.sprite.alpha = 0.55 + Math.sin(this.time * 2.4) * 0.18;
      glow.sprite.scale.set(0.85 + Math.sin(this.time * 1.7) * 0.08);
    }

    for (const lantern of this.lanternGlows) {
      lantern.sprite.position.set(lantern.x * TILE_W + TILE_W / 2, lantern.y * TILE_H + TILE_H - 10);
      lantern.sprite.alpha = 0.5 + Math.sin(this.time * 1.6 + lantern.phase) * 0.16;
      lantern.sprite.scale.set(1.7 + Math.sin(this.time * 2.1 + lantern.phase) * 0.16);
    }

    this.updateDayNight(dt, screenW, screenH);
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

  private updateDayNight(dt: number, screenW: number, screenH: number) {
    const t = this.dayTime;
    let darkness = 0;
    let warmth = 0;

    if (this.map.weather === 'cave') {
      darkness = 0.4;
      warmth = 0;
    } else if (t < 0.42) {
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

    for (const shadow of this.treeShadowSprites) {
      shadow.alpha = 0.2 + darkness * 0.42;
      const nightScale = 1 + darkness * 0.55;
      shadow.scale.set(1.3 * nightScale, 0.55 * nightScale);
    }

    const flyTarget = this.map.weather === 'snow' ? 0.18 : this.map.weather === 'cave' ? 0.6 : 0.85;
    const flyTint = this.map.weather === 'cave' ? 0x9fe8ff : 0xffffff;

    for (let i = 0; i < this.fireflies.length; i++) {
      const fly = this.fireflies[i];
      fly.tint = flyTint;
      const target = darkness * flyTarget;
      fly.alpha += (target - fly.alpha) * Math.min(1, dt * 2);

      if (fly.alpha > 0.02) {
        fly.y += Math.sin(this.time * (0.8 + (i % 5) * 0.13) + i) * dt * 9;
        fly.x += Math.cos(this.time * (0.6 + (i % 3) * 0.17) + i * 2) * dt * 7;
        fly.alpha = Math.max(0, fly.alpha * (0.72 + Math.sin(this.time * 2.2 + i * 1.7) * 0.28));

        if (fly.y > screenH + 20) fly.y = -20;
        if (fly.y < -40) fly.y = screenH + 10;
        if (fly.x > screenW + 20) fly.x = -20;
        if (fly.x < -40) fly.x = screenW + 10;
      }
    }
  }

  setPhotoMode(on: boolean) {
    for (const view of this.entities.values()) {
      view.label.visible = !on;
      view.bubbleText?.destroy();
      view.bubbleText = undefined;
      view.bubbleBg?.destroy();
      view.bubbleBg = undefined;

      if (view.emoteSprite) {
        view.emoteSprite.visible = !on;
      }
    }

    for (const glow of this.portalGlows) {
      glow.label.visible = !on;
    }
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
