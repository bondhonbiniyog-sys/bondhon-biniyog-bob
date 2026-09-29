/**
 * Cloudflare Realtime Client
 * Uses Cloudflare Durable Objects + WebSockets for instant, zero-reload updates across all devices.
 * Connects to /api/realtime/ws with automatic reconnect, ping/pong, and event dispatch.
 */

export interface RealtimeEvent {
  type:
    | 'MEMBERS_CHANGED'
    | 'DEPOSIT_CREATED'
    | 'DEPOSIT_APPROVED'
    | 'DEPOSIT_REJECTED'
    | 'SETTINGS_UPDATED'
    | 'DIRECTORS_UPDATED'
    | 'LANDS_UPDATED'
    | 'NOTIFICATION_CREATED'
    | 'DATABASE_MUTATION'
    | 'SYNC_PING'
    | 'PING'
    | 'PONG';
  payload?: any;
  timestamp: string;
  sender?: string;
}

type EventListener = (event: RealtimeEvent) => void;

class CloudflareRealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Set<EventListener> = new Set();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isConnecting = false;
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to Cloudflare Pages Functions / dev server WebSocket endpoint
    const wsUrl = `${protocol}//${window.location.host}/api/realtime/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.notifyStatus(true);
        console.log('⚡ Cloudflare Durable Objects Realtime WebSocket Connected');

        // Start ping heartbeat every 25 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          if (data.type === 'PONG') return;
          this.notifyListeners(data);
        } catch (e) {
          // ignore non-json
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {}
        }
      };
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onStatusChange(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public broadcast(event: Omit<RealtimeEvent, 'timestamp'>) {
    const fullEvent: RealtimeEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullEvent));
    } else {
      // Also notify local listeners in case WS is momentarily reconnecting
      this.notifyListeners(fullEvent);
      // And trigger HTTP broadcast endpoint as fallback
      fetch('/api/realtime/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent),
      }).catch(() => {});
    }
  }

  private notifyListeners(event: RealtimeEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Realtime listener error:', err);
      }
    });
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (err) {}
    });
  }
}

export const realtimeClient = new CloudflareRealtimeClient();

export function useCloudflareRealtime(onUpdate: (event: RealtimeEvent) => void) {
  return realtimeClient.subscribe(onUpdate);
}
