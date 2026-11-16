import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Castle,
  Table2,
  ScrollText,
  Briefcase,
  HelpCircle,
  Users,
  Sparkles,
  Eye,
  Send,
  Bell,
  Award,
  ChevronRight,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function ClubHome() {
  const { user, socket } = useApp();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [prayerText, setPrayerText] = useState('');
  const [prayerType, setPrayerType] = useState('PRAYER');
  const [sendingPrayer, setSendingPrayer] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHomeData = async () => {
    try {
      const [snap, prayerList] = await Promise.all([
        api.getSnapshot(),
        api.getPrayers()
      ]);
      setSnapshot(snap);
      setPrayers(prayerList);
    } catch (err) {
      console.error('Home load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    const unsub = socket.on('PRAYER_BROADCAST', (p) => {
      setPrayers(prev => [p, ...prev].slice(0, 30));
    });
    return () => unsub();
  }, [socket]);

  const handleSendPrayer = async (e) => {
    e.preventDefault();
    if (!prayerText.trim()) return;
    setSendingPrayer(true);
    try {
      await api.sendPrayer({
        type: prayerType,
        message: prayerText.trim()
      });
      toast.success('Your prayer echoes through the gray fog.');
      setPrayerText('');
      loadHomeData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingPrayer(false);
    }
  };

  const occupiedSeats = snapshot?.seats?.filter((s) => s.occupiedId || s.occupantId).length || 8;
  const onlineCount = snapshot?.members?.filter((m) => m.online).length || 1;
  const activeGathering = snapshot?.activeGathering;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Sefirah Castle Banner */}
      <div className="relative panel p-6 md:p-8 overflow-hidden bg-gradient-to-r from-void via-fog/60 to-void border-gold/40 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Eye size={180} className="text-gold" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs text-gold font-display tracking-widest uppercase">
            <Sparkles size={14} />
            <span>Tarot Club Sanctuary · Fourth Epoch Architecture</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-display text-gold font-bold tracking-wide">
            Welcome, {user?.profile?.codename || user?.username}
          </h1>

          <p className="text-bone/80 text-xs md:text-sm leading-relaxed">
            You stand within the majestic Sefirah Castle above the endless gray fog. Here, beyond the sight of the Seven True Churches and orthodox inquisitors, the members of the Tarot Club assemble to exchange forbidden formulas, unravel cosmic mysteries, and guide destiny.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/bronze-table')}
              className="btn flex items-center gap-2 bg-gold/15 text-gold border-gold"
            >
              <Table2 size={15} />
              <span>Enter The Bronze Table</span>
            </button>
            <button
              onClick={() => navigate('/intelligence')}
              className="btn flex items-center gap-2"
            >
              <ScrollText size={15} />
              <span>Intelligence Exchange</span>
            </button>
            <button
              onClick={() => navigate('/commissions')}
              className="btn flex items-center gap-2"
            >
              <Briefcase size={15} />
              <span>Commission Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => navigate('/bronze-table')}
          className="panel p-4 cursor-pointer hover:border-gold/80 transition group"
        >
          <div className="flex items-center justify-between text-bone/60 mb-1">
            <span className="text-[11px] font-display">Bronze Table</span>
            <Table2 size={16} className="text-gold group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-display text-gold font-bold">
            {occupiedSeats} / 22
          </div>
          <div className="text-[10px] text-bone/60 mt-1">Seated Major Arcana</div>
        </div>

        <div
          onClick={() => navigate('/members')}
          className="panel p-4 cursor-pointer hover:border-gold/80 transition group"
        >
          <div className="flex items-center justify-between text-bone/60 mb-1">
            <span className="text-[11px] font-display">Council Roster</span>
            <Users size={16} className="text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-display text-bone font-bold">
            {snapshot?.members?.length || 8}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            {onlineCount} Spirits Present
          </div>
        </div>

        <div
          onClick={() => navigate('/mysteries')}
          className="panel p-4 cursor-pointer hover:border-gold/80 transition group"
        >
          <div className="flex items-center justify-between text-bone/60 mb-1">
            <span className="text-[11px] font-display">Weekly Mysteries</span>
            <HelpCircle size={16} className="text-spectral group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-display text-spectral font-bold">Active</div>
          <div className="text-[10px] text-bone/60 mt-1">Earn Gold Pounds & Rep</div>
        </div>

        <div
          onClick={() => navigate('/artifacts')}
          className="panel p-4 cursor-pointer hover:border-gold/80 transition group"
        >
          <div className="flex items-center justify-between text-bone/60 mb-1">
            <span className="text-[11px] font-display">Historical Echoes</span>
            <ShieldAlert size={16} className="text-crimson group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-display text-crimson font-bold">
            {snapshot?.projections?.length || 0}
          </div>
          <div className="text-[10px] text-bone/60 mt-1">Active Projections</div>
        </div>
      </div>

      {/* Assembly Status & Active Convocation */}
      {activeGathering && (
        <div className="panel p-5 border-l-4 border-l-gold bg-gradient-to-r from-gold/10 via-fog/60 to-void">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-display text-gold tracking-wider uppercase">
                  Convocation In Progress
                </span>
              </div>
              <h3 className="text-lg font-display text-gold font-bold mt-1">
                {activeGathering.title}
              </h3>
              <p className="text-xs text-bone/70 mt-0.5">
                Theme: <span className="text-bone font-medium">{activeGathering.theme}</span> · Chaired by The Fool
              </p>
            </div>

            <button
              onClick={() => navigate('/bronze-table')}
              className="btn self-start sm:self-auto flex items-center gap-1.5 py-1.5"
            >
              <span>Join Deliberations</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Two Column Section: Live Prayer Transmissions & Quick Dossier */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Crimson Stars & Prayers Hub */}
        <div className="lg:col-span-2 panel space-y-4">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-crimson" />
              <h2 className="text-gold font-display text-sm font-semibold">
                Crimson Star Prayers & Dispatches
              </h2>
            </div>
            <span className="text-[10px] text-bone/60 font-mono">Real-time Echoes</span>
          </div>

          {/* New Prayer Input */}
          <form onSubmit={handleSendPrayer} className="p-3 rounded border border-bronze/40 bg-void/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-display text-gold">Transmit Prayer into the Fog</span>
              <select
                className="inp w-auto text-[11px] py-0.5 px-2"
                value={prayerType}
                onChange={e => setPrayerType(e.target.value)}
              >
                <option value="PRAYER">Devotional Prayer</option>
                <option value="SUPPORT">Support Request</option>
                <option value="EMERGENCY">Emergency Dispatch</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                className="inp text-xs flex-1"
                value={prayerText}
                onChange={e => setPrayerText(e.target.value)}
                placeholder="The crimson star flickers as you utter your request..."
              />
              <button
                type="submit"
                disabled={sendingPrayer || !prayerText.trim()}
                className="btn flex items-center gap-1 text-xs shrink-0"
              >
                <Send size={12} />
                <span>Transmit</span>
              </button>
            </div>
          </form>

          {/* Prayers Feed */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {prayers.length === 0 ? (
              <p className="text-xs text-bone/50 italic py-4 text-center">
                The crimson stars shine calmly. No prayers resonate at this hour.
              </p>
            ) : (
              prayers.map(p => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded border text-xs transition ${
                    p.type === 'EMERGENCY'
                      ? 'border-crimson bg-crimson/15 shadow-[0_0_10px_rgba(139,0,0,0.3)]'
                      : p.type === 'SUPPORT'
                      ? 'border-amber-600/50 bg-amber-900/10'
                      : 'border-bronze/30 bg-fog/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-display font-semibold text-gold">
                      {p.persona?.name || p.author?.profile?.codename || 'Believer'}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono ${
                        p.type === 'EMERGENCY'
                          ? 'bg-crimson text-white'
                          : p.type === 'SUPPORT'
                          ? 'bg-amber-600/40 text-amber-200'
                          : 'bg-bronze/30 text-bone/80'
                      }`}
                    >
                      {p.type}
                    </span>
                  </div>
                  <p className="text-bone/85 leading-relaxed">{p.message}</p>
                  <div className="text-[9px] text-bone/40 text-right mt-1">
                    {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Member Identity & Persona Summary Card */}
        <div className="panel space-y-4">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
            <h2 className="text-gold font-display text-sm font-semibold">
              Tarot Identity
            </h2>
            <button
              onClick={() => navigate('/persona')}
              className="text-[10px] text-gold hover:underline"
            >
              Edit Persona
            </button>
          </div>

          <div className="p-4 rounded border border-gold/40 bg-gradient-to-b from-fog/90 to-void text-center space-y-3">
            <div className="w-16 h-20 mx-auto rounded border-2 border-gold/70 bg-bronze/40 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <span className="text-[9px] text-gold font-display">TAROT</span>
              <span className="font-display text-xl text-gold font-bold">
                {user?.profile?.avatarCard?.slice(0, 2) || 'TF'}
              </span>
              <span className="text-[8px] text-bone/70 uppercase">Arcana</span>
            </div>

            <div>
              <h3 className="font-display text-base text-gold font-bold">
                {user?.profile?.codename}
              </h3>
              <p className="text-xs text-bone/70">
                {user?.profile?.pathway} Pathway · Sequence {user?.profile?.sequence}
              </p>
              <p className="text-[10px] text-bone/50 italic mt-1">
                "{user?.profile?.statusMessage || 'Contemplating above the gray fog'}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left text-[11px] pt-2 border-t border-bronze/30">
              <div>
                <span className="text-bone/50 block text-[9px] uppercase">Reputation</span>
                <span className="text-gold font-display font-semibold">
                  {user?.profile?.reputation || 100} pts
                </span>
              </div>
              <div>
                <span className="text-bone/50 block text-[9px] uppercase">Contributions</span>
                <span className="text-emerald-400 font-display font-semibold">
                  {user?.profile?.contributions || 0} £
                </span>
              </div>
              <div>
                <span className="text-bone/50 block text-[9px] uppercase">Assemblies</span>
                <span className="text-bone font-display">
                  {user?.profile?.gatheringsAttended || 12}
                </span>
              </div>
              <div>
                <span className="text-bone/50 block text-[9px] uppercase">Region</span>
                <span className="text-bone font-display truncate block">
                  {user?.profile?.region || 'Backlund'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => navigate('/pathways')}
              className="w-full text-left p-2 rounded bg-void/60 hover:bg-fog border border-bronze/30 text-xs flex items-center justify-between text-bone/80 hover:text-gold transition"
            >
              <span>Potion & Pathway Codices</span>
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => navigate('/achievements')}
              className="w-full text-left p-2 rounded bg-void/60 hover:bg-fog border border-bronze/30 text-xs flex items-center justify-between text-bone/80 hover:text-gold transition"
            >
              <span>Achievements & Milestones</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
