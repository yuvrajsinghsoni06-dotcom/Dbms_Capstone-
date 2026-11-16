import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Library,
  Sparkles,
  ShieldAlert,
  Search,
  Clock,
  Eye,
  AlertTriangle,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

const stateDescriptor = (seconds) => {
  if (seconds > 35) return ['Materialized', 'text-emerald-400 border-emerald-500/50'];
  if (seconds > 15) return ['Unstable', 'text-amber-400 border-amber-500/50'];
  return ['Dissolving', 'text-crimson border-crimson/50 animate-pulse'];
};

const GRADE_INFO = {
  0: { title: 'Grade 0: Divine & Conceptual', color: 'text-amber-300 border-amber-500/60 bg-amber-950/20', desc: 'Capable of destroying nations or altering universal laws. Concealment required at all times.' },
  1: { title: 'Grade 1: Highly Dangerous', color: 'text-crimson border-crimson/60 bg-crimson/20', desc: 'Can devastate cities. Extreme negative side-effects; high Beyonder casualty rate.' },
  2: { title: 'Grade 2: Hazardous', color: 'text-spectral border-spectral/60 bg-spectral/20', desc: 'Potent and volatile. Manageable under strict orthodox rituals and isolation.' },
  3: { title: 'Grade 3: Minor & Utility', color: 'text-gold border-gold/60 bg-gold/15', desc: 'Low hazard rating. Minor sanity drainage or quirky side effects.' }
};

export default function Artifacts() {
  const { user, socket } = useApp();
  const [artifacts, setArtifacts] = useState([]);
  const [gradeFilter, setGradeFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [projections, setProjections] = useState([]);
  const [projecting, setProjecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const loadData = async () => {
    try {
      const [artList, activeProjs] = await Promise.all([
        api.getArtifacts({ grade: gradeFilter ?? undefined, search }),
        api.getActiveProjections()
      ]);
      setArtifacts(artList);
      setProjections(activeProjs);
    } catch (err) {
      toast.error('Failed to access archives: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [gradeFilter, search]);

  // Tick interval for countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
      setProjections(prev =>
        prev.filter(p => new Date(p.expiresAt).getTime() > Date.now())
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Socket updates
  useEffect(() => {
    const unsubProj = socket.on('PROJECTION_UPDATED', (payload) => {
      setProjections(prev => [payload, ...prev.filter(x => x.id !== payload.id)]);
      toast('✦ A historical echo took shape from the fog!', { icon: '✨' });
    });

    const unsubExp = socket.on('PROJECTION_EXPIRED', (payload) => {
      setProjections(prev => prev.filter(x => x.id !== payload.id));
    });

    return () => {
      unsubProj();
      unsubExp();
    };
  }, [socket]);

  const handleReachIntoFog = async () => {
    setProjecting(true);
    try {
      const newProj = await api.projectArtifact();
      setProjections(prev => [newProj, ...prev]);
      toast.success(`You summoned an echo of ${newProj.artifact.name} from the fog!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProjecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Sealed Artifact Repository
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Ancient Grade 0 to Grade 3 relics, containment protocols, and historical projections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReachIntoFog}
            disabled={projecting}
            className="btn flex items-center gap-1.5 bg-gold/15 text-gold border-gold"
          >
            <Sparkles size={14} />
            <span>{projecting ? 'Reaching into Fog...' : 'Reach Into The Fog'}</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition"
            title="Refresh Repository"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Active Projections Section */}
      {projections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-display text-gold">
            <Sparkles size={13} className="text-emerald-400" />
            <span>Active Historical Projections Above the Gray Fog</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projections.map(p => {
              const remainingSec = Math.max(
                0,
                Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 1000)
              );
              const [statusText, statusClass] = stateDescriptor(remainingSec);

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="panel p-3 border-bronze/60 bg-gradient-to-r from-void via-fog/80 to-void flex items-center justify-between"
                >
                  <div>
                    <span className="font-display text-xs text-gold font-bold block truncate max-w-[180px]">
                      {p.artifact?.name}
                    </span>
                    <span className="text-[10px] text-bone/60">
                      Summoned by {p.user?.profile?.codename || 'Scholar'}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${statusClass}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-2xl text-gold font-bold">
                      {remainingSec}s
                    </span>
                    <span className="text-[9px] text-bone/40 block">Time Remaining</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setGradeFilter(null)}
            className={`px-3 py-1.5 rounded text-xs font-display transition shrink-0 border ${
              gradeFilter === null
                ? 'bg-crimson/40 text-gold border-gold'
                : 'bg-void text-bone/70 border-bronze/40 hover:border-gold/60'
            }`}
          >
            All Grades
          </button>
          {[0, 1, 2, 3].map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded text-xs font-display transition shrink-0 border ${
                gradeFilter === g
                  ? 'bg-crimson/40 text-gold border-gold'
                  : 'bg-void text-bone/70 border-bronze/40 hover:border-gold/60'
              }`}
            >
              Grade {g}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-bone/40" />
          <input
            className="inp pl-9 text-xs py-1.5"
            placeholder="Search sealed artifacts or containment rules..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Artifacts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {artifacts.map(a => {
          const info = GRADE_INFO[a.grade] || GRADE_INFO[3];

          return (
            <motion.div
              key={a.id}
              whileHover={{ y: -3 }}
              onClick={() => setSelectedArtifact(a)}
              className="panel flex flex-col justify-between cursor-pointer hover:border-gold/70 transition bg-gradient-to-br from-fog/70 to-void"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider font-semibold border ${info.color}`}>
                    Grade {a.grade}
                  </span>
                  <span className="text-[10px] text-bone/60 font-mono">
                    Drain: {a.drainRate} {a.drainUnit}
                  </span>
                </div>

                <h3 className="font-display text-base text-gold font-bold line-clamp-1">
                  {a.name}
                </h3>

                <p className="text-xs text-bone/80 line-clamp-2 mt-1.5 leading-relaxed">
                  {a.description}
                </p>

                <div className="mt-3 p-2 rounded bg-void/60 border border-bronze/30 text-[11px] space-y-1">
                  <div className="text-gold/90 font-medium line-clamp-1">
                    ✦ {a.abilities}
                  </div>
                  <div className="text-crimson/90 line-clamp-1">
                    ⚠ {a.negativeEffects}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-bronze/30 flex items-center justify-between text-[11px] text-bone/50">
                <span className="truncate max-w-[200px]">
                  {a.discoveryRecord || 'Recovered from unknown catacombs'}
                </span>
                <span className="text-gold hover:underline">Inspect</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Artifact Dossier Modal */}
      <Modal
        open={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        title={selectedArtifact?.name || 'Artifact Codex'}
      >
        {selectedArtifact && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* Grade banner */}
            <div className={`p-3 rounded border ${GRADE_INFO[selectedArtifact.grade]?.color}`}>
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-xs uppercase">
                  {GRADE_INFO[selectedArtifact.grade]?.title}
                </span>
                <span className="font-mono text-[11px]">
                  {selectedArtifact.drainRate} {selectedArtifact.drainUnit}
                </span>
              </div>
              <p className="text-[10px] text-bone/70 mt-1">
                {GRADE_INFO[selectedArtifact.grade]?.desc}
              </p>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Relic Overview
              </h4>
              <p className="p-2.5 rounded bg-void/60 border border-bronze/30 text-bone/80 font-serif leading-relaxed">
                {selectedArtifact.description}
              </p>
            </div>

            {/* Mystical Abilities */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Mystical Capabilities & Authorities
              </h4>
              <p className="p-2.5 rounded bg-void/60 border border-gold/30 text-gold/90 font-mono text-[11px] leading-relaxed">
                {selectedArtifact.abilities}
              </p>
            </div>

            {/* Negative Effects */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-crimson font-display mb-1">
                Negative Side-Effects & Sanity Drain
              </h4>
              <p className="p-2.5 rounded bg-crimson/10 border border-crimson/40 text-bone/90 leading-relaxed">
                {selectedArtifact.negativeEffects}
              </p>
            </div>

            {/* Containment Protocol */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Prescribed Containment Protocol
              </h4>
              <div className="p-2.5 rounded bg-void/80 border border-bronze/40 font-mono text-[11px] text-bone/80 leading-relaxed">
                {selectedArtifact.containmentProcedure}
              </div>
            </div>

            {/* Historical Discovery */}
            {selectedArtifact.discoveryRecord && (
              <div className="pt-2 border-t border-bronze/30 text-[11px] text-bone/60">
                <span className="text-gold font-display block">Discovery Record:</span>
                {selectedArtifact.discoveryRecord}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
