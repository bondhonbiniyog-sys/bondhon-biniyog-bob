/**
 * Cloudflare Realtime Client - FIXED NO LOOP VERSION
 */
export interface RealtimeEvent {
  type: 'MEMBERS_CHANGED' | 'DEPOSIT_CREATED' | 'DEPOSIT_APPROVED' | 'DEPOSIT_REJECTED' | 'SETTINGS_UPDATED' | 'DIRECTORS_UPDATED' | 'LANDS_UPDATED' | 'NOTIFICATION_CREATED' | 'DATABASE_MUTATION' | 'SYNC_PING' | 'PING' | 'PONG';
  payload?: any;
  timestamp: string;
  sender?: string;
}

type EventListener = (event: RealtimeEvent) => void;

class CloudflareRealtimeClient {
  private listeners: Set<EventListener> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected = false;
  private lastEventTime = 0;

  constructor() {
    // D1 তে WebSocket নাই, তাই Mock Connected ধরে নিলাম - কোনো WS Connect করবে না!
    this.isConnected = true;
  }

  public connect() {
    // NO WS - D1 Pages এ WS নাই, তাই কিছু করবে না
    return;
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  public onStatusChange(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    listener(false); // Always offline for D1, use polling
    return () => { this.statusListeners.delete(listener); };
  }

  public getConnected(): boolean { return false; }

  public broadcast(event: Omit<RealtimeEvent, 'timestamp'>) {
    const now = Date.now();
    // 5 সেকেন্ডে 1 বারের বেশি Broadcast করবে না - Loop Stop!
    if (now - this.lastEventTime < 5000) return;
    this.lastEventTime = now;
    
    const fullEvent: RealtimeEvent = { ...event, timestamp: new Date().toISOString() };
    
    // PING/PONG Ignore
    if (fullEvent.type === 'PING' || fullEvent.type === 'PONG' || fullEvent.type === 'SYNC_PING') return;

    // Local listeners কে জানাও
    this.listeners.forEach((l) => {
      try { l(fullEvent); } catch (e) {}
    });

    // D1 তে Broadcast করার দরকার নাই, fetchAppData 2 সেকেন্ড পর হবে App.tsx থেকে
  }

  private notifyListeners(event: RealtimeEvent) {
    this.listeners.forEach((listener) => {
      try { listener(event); } catch (err) {}
    });
  }
}

export const realtimeClient = new CloudflareRealtimeClient();

export function useCloudflareRealtime(onUpdate: (event: RealtimeEvent) => void) {
  // Debounced listener - একই Event 3 সেকেন্ডে 1 বার
  let lastCall = 0;
  const debounced = (event: RealtimeEvent) => {
    const now = Date.now();
    if (now - lastCall < 3000) return;
    if (event.type === 'PING' || event.type === 'PONG' || event.type === 'SYNC_PING') return;
    lastCall = now;
    onUpdate(event);
  };
  return realtimeClient.subscribe(debounced);
}
