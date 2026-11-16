import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  Wifi,
  Volume2,
  VolumeX,
  Bell,
  UserCheck,
  LogOut,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

const DEMO_ACCOUNTS = [
  { username: 'klein', codename: 'The Fool', role: 'ADMIN' },
  { username: 'audrey', codename: 'Justice', role: 'MEMBER' },
  { username: 'alger', codename: 'The Hanged Man', role: 'MEMBER' },
  { username: 'derrick', codename: 'The Sun', role: 'MEMBER' },
  { username: 'fors', codename: 'The Magician', role: 'MEMBER' },
  { username: 'emlyn', codename: 'The Moon', role: 'MEMBER' },
  { username: 'leonard', codename: 'The Star', role: 'MEMBER' },
  { username: 'xio', codename: 'Judgement', role: 'MEMBER' }
];

export default function Settings() {
  const { user, socket, logout, login } = useApp();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [switching, setSwitching] = useState(false);

  const handleSwitchAccount = async (targetUsername) => {
    setSwitching(true);
    try {
      const res = await api.login(targetUsername, 'dev-only-change-me');
      login(res);
      toast.success(`Spirit transmuted to ${res.profile?.codename || targetUsername}!`);
    } catch (err) {
      toast.error('Switch failed: ' + err.message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-bronze/40 pb-3">
        <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
          Council Settings & Sanctuary Config
        </h1>
        <p className="text-xs text-bone/70 mt-1">
          Manage your Sefirah Castle connection, atmospheric toggles, and council persona switching.
        </p>
      </div>

      <div className="space-y-4">
        {/* Connection Gateway */}
        <div className="panel space-y-3">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-gold" />
              <h3 className="font-display text-sm text-gold font-semibold uppercase tracking-wider">
                Sefirah Real-Time Gateway
              </h3>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                socket.status === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-crimson/20 text-crimson border border-crimson/50'
              }`}
            >
              {socket.status}
            </span>
          </div>

          <p className="text-xs text-bone/70 leading-relaxed font-serif">
            WebSocket connection authenticated via secure HTTP cookies. Pushes live seat movements, public table messages, whispers, and prayer broadcasts.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={socket.connect}
              className="btn text-xs py-1.5 px-4"
            >
              Force Reconnect
            </button>
            <button
              onClick={socket.disconnect}
              className="btn text-xs py-1.5 px-4 text-bone/60 hover:text-bone"
            >
              Sever Connection
            </button>
          </div>
        </div>

        {/* Ambient & Occult Audio */}
        <div className="panel space-y-3">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
            <div className="flex items-center gap-2">
              {audioEnabled ? <Volume2 className="w-4 h-4 text-gold" /> : <VolumeX className="w-4 h-4 text-crimson" />}
              <h3 className="font-display text-sm text-gold font-semibold uppercase tracking-wider">
                Atmospheric Audio & Chimes
              </h3>
            </div>
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                toast(audioEnabled ? 'Occult chimes silenced' : 'Atmospheric chimes enabled');
              }}
              className="text-xs text-gold border border-gold/40 px-2 py-0.5 rounded"
            >
              {audioEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          <p className="text-xs text-bone/70 leading-relaxed font-serif">
            Auditory chimes upon receiving new secret whispers, table announcements, or unlocked achievements.
          </p>
        </div>

        {/* Quick Demo Switcher */}
        <div className="panel space-y-3">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-gold" />
              <h3 className="font-display text-sm text-gold font-semibold uppercase tracking-wider">
                Council Persona Quick-Switch
              </h3>
            </div>
            <span className="text-[10px] text-gold border border-gold/40 px-1.5 py-0.2 rounded">
              Local Dev & Demo
            </span>
          </div>

          <p className="text-xs text-bone/70 leading-relaxed font-serif">
            Switch between different Tarot Club members to test seat interactions, speaking states, whispers, and commission claims.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {DEMO_ACCOUNTS.map(acc => {
              const isCurrent = user?.username === acc.username;

              return (
                <button
                  key={acc.username}
                  disabled={switching || isCurrent}
                  onClick={() => handleSwitchAccount(acc.username)}
                  className={`p-2.5 rounded border text-left transition flex flex-col justify-between ${
                    isCurrent
                      ? 'border-gold bg-gold/20 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                      : 'border-bronze/40 bg-void/60 hover:border-gold/60'
                  }`}
                >
                  <span className="font-display text-xs text-gold font-bold truncate">
                    {acc.codename}
                  </span>
                  <span className="text-[10px] text-bone/50 capitalize truncate">
                    {acc.username} {isCurrent ? '(Active)' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Departure */}
        <div className="panel p-4 flex items-center justify-between border-crimson/50 bg-crimson/10">
          <div>
            <h4 className="font-display text-sm text-gold font-semibold">
              Depart from Sefirah Castle
            </h4>
            <p className="text-xs text-bone/70">
              Clear your session cookies and return to the physical world.
            </p>
          </div>

          <button
            onClick={logout}
            className="btn py-1.5 px-4 text-crimson border-crimson hover:bg-crimson/20"
          >
            Leave Gathering
          </button>
        </div>
      </div>
    </div>
  );
}
