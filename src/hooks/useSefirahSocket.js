import { useSyncExternalStore } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
let ws = null;
let refs = 0;
let tries = 0;
let hb;
let pongT;
let rt;
let stopped = true;

const seen = new Set();
const subs = {};
const ls = new Set();

let S = {
  status: 'offline',
  onlineMembers: [],
  incomingPrayers: [],
  activeProjections: [],
  seats: [],
  recentMessages: [],
  unreadNotifications: 0
};

const set = p => {
  S = { ...S, ...p };
  ls.forEach(f => f());
};

const emit = (t, p) => (subs[t] || []).forEach(f => f(p));

async function fetchSnapshot() {
  try {
    const r = await fetch(`${API}/api/snapshot`, { credentials: 'include' });
    if (!r.ok) return;
    const d = await r.json();
    set({
      onlineMembers: d.members.filter(m => m.online).map(m => m.id),
      incomingPrayers: d.prayers || [],
      activeProjections: d.projections || [],
      seats: d.seats || [],
      unreadNotifications: d.unreadNotifications || 0
    });
  } catch (err) {
    console.warn('Failed to fetch snapshot:', err);
  }
}

function handleMessage(raw) {
  let m;
  try {
    m = JSON.parse(raw);
  } catch {
    return;
  }

  if (m.type === 'pong') {
    clearTimeout(pongT);
    return;
  }

  if (!m.id || seen.has(m.id)) return;
  seen.add(m.id);
  if (seen.size > 500) seen.delete(seen.values().next().value);

  const p = m.payload;

  if (m.type === 'MEMBER_PRESENCE_UPDATED') {
    set({ onlineMembers: p.online || [] });
  } else if (m.type === 'PRAYER_BROADCAST') {
    set({ incomingPrayers: [p, ...S.incomingPrayers].slice(0, 50) });
  } else if (m.type === 'PROJECTION_UPDATED') {
    set({ activeProjections: [p, ...S.activeProjections.filter(x => x.id !== p.id)] });
  } else if (m.type === 'PROJECTION_EXPIRED') {
    set({ activeProjections: S.activeProjections.filter(x => x.id !== p.id) });
  } else if (m.type === 'TABLE_MESSAGE_CREATED') {
    set({ recentMessages: [...S.recentMessages, p].slice(-50) });
  } else if (m.type === 'NOTIFICATION_RECEIVED') {
    set({ unreadNotifications: S.unreadNotifications + 1 });
  }

  emit(m.type, p);
  emit('*', m);
}

function connect() {
  if (ws) return;
  stopped = false;
  set({ status: tries ? 'reconnecting' : 'connecting' });

  const wsUrl = API.replace(/^http/, 'ws') + '/ws';
  try {
    const w = (ws = new WebSocket(wsUrl));

    w.onopen = () => {
      tries = 0;
      set({ status: 'connected' });
      fetchSnapshot();

      hb = setInterval(() => {
        if (w.readyState !== WebSocket.OPEN) return;
        w.send(JSON.stringify({ type: 'ping' }));
        pongT = setTimeout(() => w.close(), 10000);
      }, 20000);
    };

    w.onmessage = e => handleMessage(e.data);
    w.onerror = () => w.close();

    w.onclose = () => {
      clearInterval(hb);
      clearTimeout(pongT);
      ws = null;
      if (stopped) {
        set({ status: 'offline' });
        return;
      }
      set({ status: 'reconnecting' });
      rt = setTimeout(connect, Math.min(15000, 1000 * 2 ** tries++) * (0.8 + Math.random() * 0.4));
    };
  } catch (err) {
    console.error('Socket connect failed:', err);
    set({ status: 'offline' });
  }
}

function disconnect() {
  stopped = true;
  clearTimeout(rt);
  clearInterval(hb);
  clearTimeout(pongT);
  ws?.close();
  ws = null;
  set({ status: 'offline' });
}

const on = (t, f) => {
  (subs[t] ??= []).push(f);
  return () => {
    subs[t] = subs[t].filter(x => x !== f);
  };
};

const sub = f => {
  ls.add(f);
  if (++refs === 1) connect();
  return () => {
    ls.delete(f);
    if (--refs === 0) disconnect();
  };
};

export default function useSefirahSocket() {
  const s = useSyncExternalStore(sub, () => S);
  return { ...s, on, connect, disconnect, refreshSnapshot: fetchSnapshot };
}
