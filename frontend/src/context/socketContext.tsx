'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

import { 
  syncCustomerQueries, 
  syncAccountQueries, 
  syncSystemAccountQueries, 
  syncNoteQueries, 
  syncConfigQueries 
} from '../utils/syncQueries';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastEvent: { event: string; payload: any } | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastEvent: null
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ event: string; payload: any } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('[WebSocket Client] Connected to server.');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('[WebSocket Client] Disconnected.');
    });

    // Realtime events listener - đồng bộ toàn bộ bảng và dropdown tức thì
    const handleEvent = (event: string, payload: any) => {
      setLastEvent({ event, payload });
      
      if (event.startsWith('account.')) {
        syncAccountQueries(queryClient);
      } else if (event.startsWith('customer.')) {
        syncCustomerQueries(queryClient);
      } else if (event.startsWith('note.')) {
        syncNoteQueries(queryClient);
      } else if (event.startsWith('system_account.')) {
        syncSystemAccountQueries(queryClient);
      } else if (event.startsWith('config.')) {
        syncConfigQueries(queryClient);
      } else if (event.startsWith('history.')) {
        queryClient.invalidateQueries({ queryKey: ['history'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['overview'] });
      }
    };

    const events = [
      'account.created', 'account.updated', 'account.deleted',
      'customer.created', 'customer.updated', 'customer.deleted',
      'note.created', 'note.updated', 'note.deleted',
      'system_account.created', 'system_account.updated', 'system_account.deleted',
      'config.created', 'config.updated', 'config.deleted',
      'history.created'
    ];

    events.forEach(evt => {
      socketInstance.on(evt, (data) => handleEvent(evt, data));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
