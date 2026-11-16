import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, Lock, User, Sparkles, KeyRound } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Atmosphere from '../components/Atmosphere';

const QUICK_MEMBERS = [
  { username: 'klein', codename: 'The Fool', pathway: 'Fool (Seq 5)' },
  { username: 'audrey', codename: 'Justice', pathway: 'Spectator (Seq 7)' },
  { username: 'alger', codename: 'The Hanged Man', pathway: 'Sailor (Seq 6)' },
  { username: 'derrick', codename: 'The Sun', pathway: 'Sun (Seq 7)' },
  { username: 'fors', codename: 'The Magician', pathway: 'Door (Seq 7)' },
  { username: 'emlyn', codename: 'The Moon', pathway: 'Moon (Seq 7)' },
  { username: 'leonard', codename: 'The Star', pathway: 'Darkness (Seq 7)' },
  { username: 'xio', codename: 'Judgement', pathway: 'Arbiter (Seq 7)' }
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('klein');
  const [password, setPassword] = useState('dev-only-change-me');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e, customUser) => {
    if (e) e.preventDefault();
    const u = customUser || username;
    const p = password || 'dev-only-change-me';

    setBusy(true);
    try {
      const res = await api.login(u, p);
      login(res);
      toast.success(`Welcome above the gray fog, ${res.profile?.codename || res.username}!`, {
        icon: '👁'
      });
      navigate('/home');
    } catch (err) {
      toast.error(err.message || 'The gray fog repels your approach. Verify credentials.');
      setBusy(false);
    }
  };

  const handleQuickLogin = (uname) => {
    setUsername(uname);
    setPassword('dev-only-change-me');
    handleSubmit(undefined, uname);
  };

  return (
    <div className="min-h-screen bg-void text-bone grid place-items-center p-4 relative selection:bg-crimson selection:text-gold">
      <Atmosphere />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel w-full max-w-md p-6 sm:p-8 space-y-6 border-gold/50 shadow-[0_0_60px_rgba(212,175,55,0.2)] bg-gradient-to-b from-fog/90 via-void/90 to-fog/90 backdrop-blur-md"
      >
        {/* Sacred Eye of Concealment & Tarot Emblem */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-gold bg-bronze/30 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            <Eye size={32} className="text-gold animate-pulse" />
          </div>

          <h1 className="text-2xl font-display text-gold font-bold tracking-widest uppercase">
            The Tarot Club
          </h1>
          <p className="text-xs text-bone/60 tracking-wider font-display">
            Above the Endless Gray Fog · Sefirah Castle
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={e => handleSubmit(e)} className="space-y-4 text-xs">
          <div>
            <label className="block text-bone/70 mb-1 font-display">
              Council Account / Username
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-3 text-bone/40" />
              <input
                className="inp pl-9 text-xs"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="klein, audrey, alger..."
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-bone/70 mb-1 font-display">
              Secret Passphrase
            </label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-3 text-bone/40" />
              <input
                type="password"
                className="inp pl-9 text-xs"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn w-full py-2.5 bg-gradient-to-r from-crimson/80 to-bronze/80 text-gold font-display font-semibold border-gold tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.25)]"
          >
            <Sparkles size={14} />
            <span>{busy ? 'Ascending through the fog...' : 'Enter Sefirah Castle'}</span>
          </button>
        </form>

        {/* Quick Demo Identities Selector */}
        <div className="pt-4 border-t border-bronze/40 space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-gold/80 font-display block text-center">
            Quick Persona Invocation (1-Click Demo)
          </span>

          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_MEMBERS.map(m => (
              <button
                key={m.username}
                type="button"
                onClick={() => handleQuickLogin(m.username)}
                disabled={busy}
                className="p-2 rounded border border-bronze/40 bg-void/60 hover:border-gold hover:bg-fog/60 transition text-left"
              >
                <div className="text-xs font-display text-gold font-semibold truncate">
                  {m.codename}
                </div>
                <div className="text-[9px] text-bone/50 truncate">
                  {m.pathway}
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
