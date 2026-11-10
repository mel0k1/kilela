import type { WebSocket } from 'ws';

export interface Player {
  id: number;
  ws: WebSocket | null;
  name: string;
  look: string;
  map: string;
  x: number;
  y: number;
  dir: number;
  emote: string;
  bot: boolean;
  botTimer?: number;
}

export class Room {
  readonly id: string;
  readonly players = new Map<number, Player>();

  constructor(id: string) {
    this.id = id;
  }

  add(p: Player) {
    this.players.set(p.id, p);
  }

  remove(p: Player) {
    this.players.delete(p.id);
  }
}

export const rooms = new Map<string, Room>();

export function getRoom(id: string): Room {
  let room = rooms.get(id);

  if (!room) {
    room = new Room(id);
    rooms.set(id, room);
  }

  return room;
}
