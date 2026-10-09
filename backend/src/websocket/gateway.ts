import { Server, Socket } from 'socket.io';

export class WebSocketManager {
  private io: Server | null = null;

  init(ioServer: Server) {
    this.io = ioServer;
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      socket.on('subscribe', (room: string) => {
        socket.join(room);
        console.log(`[WebSocket] Socket ${socket.id} joined room: ${room}`);
      });

      socket.on('unsubscribe', (room: string) => {
        socket.leave(room);
        console.log(`[WebSocket] Socket ${socket.id} left room: ${room}`);
      });

      socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  broadcast(event: string, payload: any, room?: string) {
    if (!this.io) return;
    if (room) {
      this.io.to(room).emit(event, payload);
    } else {
      this.io.emit(event, payload);
    }
  }
}

export const wsManager = new WebSocketManager();
