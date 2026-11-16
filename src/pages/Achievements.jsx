import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Trophy,
  Shield,
  Eye,
  Coins,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

export default function Achievements() {
  const { user } = useApp();
  const [achievements, setAchievements] = useState([]);
  const [members, setMembers] = useState([]);
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [achList, mList] = await Promise.all([
        api.getAchievements(),
        api.getMembers()
      ]);
      setAchievements(achList);
      setMembers(mList.sort((a, b) => b.reputation - a.reputation));
    } catch (err) {
      toast.error('Failed to load achievements: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPoints = achievements
    .filter(a => a.unlocked)
    .reduce((acc, a) => acc + (a.points || 0), 0);
  const maxPoints = achievements.reduce((acc, a) => acc + (a.points || 0), 0);

  const filtered = achievements.filter(
    a => category === 'ALL' || a.category === category
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Tarot Milestones & Reputations
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Track your mystical progression, unlocked seals, and standing among the Tarot Club assembly.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Overview Banner & Progression Meter */}
      <div className="panel p-6 bg-gradient-to-r from-void via-fog/60 to-void border-gold/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            <h2 className="text-lg font-display text-gold font-bold">
              Consecrated Progression
            </h2>
          </div>
          <p className="text-xs text-bone/70 max-w-md">
            Every step taken through the gray fog, seat occupied, or mystery solved elevates your standing in the eyes of The Fool.
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-2 text-right">
          <div className="flex justify-between text-xs font-display">
            <span className="text-bone/60">Honor Points</span>
            <span className="text-gold font-bold">
              {totalPoints} / {maxPoints || 100}
            </span>
          </div>
          <div className="h-2.5 bg-void rounded-full overflow-hidden border border-bronze/50">
            <div
              className="h-full bg-gradient-to-r from-bronze via-gold to-emerald-400 transition-all duration-700"
              style={{ width: `${maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-bone/40 block">
            {achievements.filter(a => a.unlocked).length} of {achievements.length} Seals Unlocked
          </span>
        </div>
      </div>

      {/* Main Grid: Achievements & Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Achievements Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {['ALL', 'EXPLORATION', 'SOCIAL', 'OCCULT', 'MYSTERY'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-display transition shrink-0 border ${
                  category === cat
                    ? 'bg-crimson/40 text-gold border-gold'
                    : 'bg-void text-bone/70 border-bronze/40 hover:border-gold/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map(a => (
              <motion.div
                key={a.id}
                whileHover={{ y: -2 }}
                className={`panel p-3 flex items-start gap-3 transition-all ${
                  a.unlocked
                    ? 'border-gold/60 bg-gold/5 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                    : 'border-bronze/30 bg-void/40 opacity-70'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${
                    a.unlocked
                      ? 'border-gold bg-bronze/40 text-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                      : 'border-bronze/30 bg-void text-bone/30'
                  }`}
                >
                  {a.unlocked ? <Award size={20} /> : <Lock size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-display text-xs font-bold truncate ${
                        a.unlocked ? 'text-gold' : 'text-bone/60'
                      }`}
                    >
                      {a.title}
                    </h4>
                    <span className="text-[10px] font-mono text-gold font-semibold shrink-0">
                      +{a.points} pts
                    </span>
                  </div>

                  <p className="text-[11px] text-bone/70 mt-0.5 leading-relaxed font-serif">
                    {a.description}
                  </p>

                  {a.unlocked && (
                    <span className="text-[9px] text-emerald-400 flex items-center gap-1 mt-1.5">
                      <CheckCircle2 size={10} />
                      <span>Unlocked {new Date(a.unlockedAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Council Standing / Leaderboard */}
        <div className="panel space-y-4">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2">
            <h3 className="font-display text-sm text-gold font-semibold uppercase tracking-wider">
              Council Standing
            </h3>
            <span className="text-[10px] text-bone/50">Reputation Rank</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {members.map((m, idx) => (
              <div
                key={m.id}
                className={`p-2.5 rounded border flex items-center justify-between text-xs transition ${
                  m.id === user?.id
                    ? 'border-gold bg-gold/15 shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                    : 'border-bronze/30 bg-void/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-display font-bold text-[10px] ${
                      idx === 0
                        ? 'bg-gold text-void'
                        : idx === 1
                        ? 'bg-bone text-void'
                        : idx === 2
                        ? 'bg-amber-700 text-bone'
                        : 'bg-void text-bone/50 border border-bronze/40'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div className="truncate">
                    <span className="font-display text-gold font-semibold truncate block">
                      {m.codename}
                    </span>
                    <span className="text-[10px] text-bone/50 truncate block">
                      {m.pathway} · Seq {m.sequence ?? 'Secret'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-gold text-xs block">
                    {m.reputation} Rep
                  </span>
                  <span className="text-[10px] text-emerald-400 block">
                    {m.contributions} £
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
