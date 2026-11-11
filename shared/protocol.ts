export const TICK_HZ = 10;
export const LOOK_PREFIX = 'KL';
export const MAX_NAME = 16;
export const MAX_CHAT = 200;

export interface HelloMsg {
  t: 'hello';
  name: string;
  look: string;
}

export interface PosMsg {
  t: 'pos';
  x: number;
  y: number;
  dir: number;
}

export interface ChatMsg {
  t: 'chat';
  text: string;
}

export interface EmoteMsg {
  t: 'emote';
  action: string;
}

export interface LocMsg {
  t: 'loc';
  to: string;
}

export interface LookMsg {
  t: 'look';
  look: string;
}

export interface ToysMsg {
  t: 'toys';
  toy: number;
}

export type ClientMsg = HelloMsg | PosMsg | ChatMsg | EmoteMsg | LocMsg | LookMsg | ToysMsg;

export interface WelcomeMsg {
  t: 'welcome';
  id: number;
  name: string;
  look: string;
  x: number;
  y: number;
  map: string;
  online: number;
  toy: number;
}

export interface JoinMsg {
  t: 'join';
  id: number;
  name: string;
  look: string;
  x: number;
  y: number;
  online: number;
  toy: number;
}

export interface LeaveMsg {
  t: 'leave';
  id: number;
  online: number;
}

export interface PosBatchMsg {
  t: 'pos';
  list: [number, number, number, number][];
}

export type ChatKind = 'say' | 'think' | 'whisper';

export interface ChatFromMsg {
  t: 'chat';
  id: number;
  text: string;
  kind?: ChatKind;
  name?: string;
  to?: string;
}

export interface EmoteFromMsg {
  t: 'emote';
  id: number;
  action: string;
}

export interface SwitchMsg {
  t: 'switch';
  to: string;
  x: number;
  y: number;
}

export interface LookFromMsg {
  t: 'look';
  id: number;
  look: string;
}

export interface ToysFromMsg {
  t: 'toys';
  id: number;
  toy: number;
}

export interface FixMsg {
  t: 'fix';
  x: number;
  y: number;
}

export interface SysMsg {
  t: 'sys';
  text: string;
}

export interface ErrMsg {
  t: 'err';
  text: string;
}

export type ServerMsg =
  | WelcomeMsg
  | JoinMsg
  | LeaveMsg
  | PosBatchMsg
  | ChatFromMsg
  | EmoteFromMsg
  | SwitchMsg
  | LookFromMsg
  | ToysFromMsg
  | SysMsg
  | ErrMsg
  | FixMsg;

export const DIR_S = 0;
export const DIR_N = 1;
export const DIR_W = 2;
export const DIR_E = 3;

export interface PortalDef {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  label: string;
}

export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  spawnX: number;
  spawnY: number;
  portals: PortalDef[];
  music: string;
  weather: 'clear' | 'fog' | 'snow' | 'cave';
}

export const MAPS: MapDef[] = [
  {
    id: 'meadow',
    name: 'Солнечный луг',
    w: 160,
    h: 160,
    spawnX: 80,
    spawnY: 84,
    portals: [
      { x: 12, y: 84, to: 'forest', tx: 126, ty: 70, label: 'Туманный лес' },
      { x: 148, y: 84, to: 'peaks', tx: 10, ty: 70, label: 'Снежные пики' },
      { x: 80, y: 30, to: 'cave', tx: 55, ty: 32, label: 'Кристальные пещеры' },
    ],
    music: 'bossanova.mp3',
    weather: 'clear',
  },
  {
    id: 'forest',
    name: 'Туманный лес',
    w: 140,
    h: 140,
    spawnX: 126,
    spawnY: 70,
    portals: [{ x: 132, y: 70, to: 'meadow', tx: 18, ty: 84, label: 'Солнечный луг' }],
    music: 'trees.mp3',
    weather: 'fog',
  },
  {
    id: 'peaks',
    name: 'Снежные пики',
    w: 140,
    h: 140,
    spawnX: 10,
    spawnY: 70,
    portals: [{ x: 6, y: 70, to: 'meadow', tx: 142, ty: 84, label: 'Солнечный луг' }],
    music: 'reindeer-winter.mp3',
    weather: 'snow',
  },
  {
    id: 'cave',
    name: 'Кристальные пещеры',
    w: 110,
    h: 110,
    spawnX: 55,
    spawnY: 56,
    portals: [{ x: 55, y: 30, to: 'meadow', tx: 80, ty: 32, label: 'Солнечный луг' }],
    music: 'cave-crystals.mp3',
    weather: 'cave',
  },
];

export function getMap(id: string): MapDef {
  return MAPS.find(m => m.id === id) || MAPS[0];
}

export interface ToyDef {
  name: string;
  label: string;
  aliases: string[];
}

export const TOYS: ToyDef[] = [
  { name: 'hat-red', label: 'Колпак (красный)', aliases: ['колпак', 'шляпа'] },
  { name: 'hat-green', label: 'Колпак (зелёный)', aliases: [] },
  { name: 'hat-blue', label: 'Колпак (синий)', aliases: [] },
  { name: 'hat-pink', label: 'Колпак (розовый)', aliases: [] },
  { name: 'snowpony', label: 'Снегопони', aliases: ['снеговик', 'снегопони'] },
  { name: 'gift', label: 'Подарок', aliases: ['подарок'] },
  { name: 'gift-alt', label: 'Подарок (зелёный)', aliases: [] },
  { name: 'teddy', label: 'Мишка', aliases: ['мишка', 'игрушка'] },
  { name: 'teddy-santa', label: 'Мишка-Санта', aliases: ['санта'] },
  { name: 'tree', label: 'Ёлочка', aliases: ['ёлка', 'елка'] },
  { name: 'deer', label: 'Оленёнок', aliases: ['олень', 'оленёнок'] },
  { name: 'deer-red', label: 'Оленёнок (носик)', aliases: [] },
  { name: 'candy', label: 'Конфетки-рога', aliases: ['конфетки', 'конфета'] },
  { name: 'bell', label: 'Колокольчик', aliases: ['колокольчик', 'бубенец'] },
  { name: 'mistletoe', label: 'Омела', aliases: ['омела'] },
  { name: 'cookie', label: 'Печенька', aliases: ['печенька', 'печенье'] },
  { name: 'spider', label: 'Паучок', aliases: ['паук', 'паучок'] },
  { name: 'star', label: 'Звёздочка', aliases: ['звезда', 'звёздочка'] },
  { name: 'halo', label: 'Нимб', aliases: ['нимб'] },
];

export function toyIndexByName(raw: string): number {
  const name = raw.trim().toLowerCase();

  if (!name) return -1;

  if (/^\d+$/.test(name)) {
    const index = Number(name);
    return index >= 1 && index <= TOYS.length ? index : -1;
  }

  const index = TOYS.findIndex(toy => toy.name === name || toy.aliases.includes(name));
  return index >= 0 ? index + 1 : -1;
}

export function validEmote(action: string): boolean {
  switch (action) {
    case 'sit':
    case 'stand':
    case 'sleep':
    case 'wake':
    case 'dance':
    case 'wave':
    case 'hug':
    case 'boop':
    case 'laugh':
    case 'surprise':
    case 'excite':
    case 'nom':
    case 'yawn':
    case 'tongue':
    case 'sad':
    case 'angry':
    case 'happy':
    case 'wink':
    case 'hearts':
    case 'cry':
    case 'sneeze':
    case 'fly':
    case 'land':
    case 'kiss':
    case 'turn':
      return true;
    default:
      return false;
  }
}
