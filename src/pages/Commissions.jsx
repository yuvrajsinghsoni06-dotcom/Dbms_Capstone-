import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Briefcase,
  Plus,
  ShieldAlert,
  Coins,
  CheckCircle,
  Clock,
  User,
  AlertOctagon,
  FileText,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

const STATUSES = ['ALL', 'OPEN', 'ASSIGNED', 'ACTIVE', 'COMPLETED', 'FAILED'];

export default function Commissions() {
  const { user, socket } = useApp();
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formObjectives, setFormObjectives] = useState('Infiltrate target perimeter\nRecover artifact or formula\nSafely deliver via fog sacrificial gate');
  const [formReward, setFormReward] = useState(150);
  const [formDanger, setFormDanger] = useState(5);
  const [formRank, setFormRank] = useState(7);
  const [creating, setCreating] = useState(false);

  // Debrief state
  const [debriefNotes, setDebriefNotes] = useState('');
  const [submittingDebrief, setSubmittingDebrief] = useState(false);

  const loadCommissions = async () => {
    try {
      const data = await api.getCommissions(statusFilter);
      setCommissions(data);
    } catch (err) {
      toast.error('Failed to load commissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissions();
  }, [statusFilter]);

  useEffect(() => {
    const unsubCreated = socket.on('COMMISSION_CREATED', () => loadCommissions());
    const unsubUpdated = socket.on('COMMISSION_UPDATED', (payload) => {
      setCommissions(prev =>
        prev.map(c => (c.id === payload.id ? { ...c, ...payload } : c))
      );
      if (selectedCommission && selectedCommission.id === payload.id) {
        setSelectedCommission((prev) => ({ ...prev, ...payload }));
      }
      loadCommissions();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [socket, selectedCommission]);

  const handleCreateCommission = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return toast.error('Title is required');
    setCreating(true);
    try {
      const objArray = formObjectives.split('\n').map(o => o.trim()).filter(Boolean);
      await api.createCommission({
        title: formTitle.trim(),
        description: formDesc.trim(),
        objectives: objArray,
        reward: formReward,
        danger: formDanger,
        hazardRank: formRank
      });
      toast.success('Commission posted to the board.');
      setCreateModal(false);
      setFormTitle('');
      setFormDesc('');
      loadCommissions();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleClaimCommission = async (id) => {
    try {
      const updated = await api.claimCommission(id);
      setSelectedCommission(updated);
      toast.success('Commission accepted into your care.');
      loadCommissions();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAdvanceProgress = async (id, currentProgress) => {
    const next = Math.min(100, currentProgress + 25);
    try {
      const updated = await api.updateCommissionProgress(id, {
        progress: next,
        status: next >= 100 ? 'COMPLETED' : 'ACTIVE'
      });
      setSelectedCommission(updated);
      toast.success(`Progress advanced to ${next}%`);
      loadCommissions();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCompleteCommission = async (id) => {
    setSubmittingDebrief(true);
    try {
      const updated = await api.updateCommissionProgress(id, {
        progress: 100,
        status: 'COMPLETED',
        completionReport: debriefNotes || 'Commission successfully executed and verified.'
      });
      setSelectedCommission(updated);
      toast.success('Commission debrief sealed. Rewards credited!');
      setDebriefNotes('');
      loadCommissions();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingDebrief(false);
    }
  };

  const mySequence = user?.profile?.sequence ?? 9;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Tarot Commission Board
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Missions, bounties, formula retrievals, and occult investigations posted across the fog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModal(true)}
            className="btn flex items-center gap-1.5 bg-gold/15 text-gold border-gold"
          >
            <Plus size={14} />
            <span>Post Commission</span>
          </button>
          <button
            onClick={loadCommissions}
            className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition"
            title="Refresh Board"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-display transition shrink-0 border ${
              statusFilter === s
                ? 'bg-crimson/40 text-gold border-gold'
                : 'bg-void text-bone/70 border-bronze/40 hover:border-gold/60'
            }`}
          >
            {s === 'ALL' ? 'All Commissions' : s}
          </button>
        ))}
      </div>

      {/* Commissions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {commissions.map(c => {
          const isClaimedByMe = c.claimer?.id === user?.id;
          const isEligible = mySequence <= c.hazardRank;

          return (
            <motion.div
              key={c.id}
              whileHover={{ y: -3 }}
              onClick={() => setSelectedCommission(c)}
              className="panel flex flex-col justify-between cursor-pointer hover:border-gold/70 transition bg-gradient-to-br from-fog/70 to-void"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span
                    className={`px-2 py-0.5 rounded font-display uppercase tracking-wider text-[10px] font-semibold border ${
                      c.status === 'OPEN'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : c.status === 'COMPLETED'
                        ? 'bg-gold/15 text-gold border-gold'
                        : c.status === 'FAILED'
                        ? 'bg-crimson/20 text-crimson border-crimson'
                        : 'bg-spectral/20 text-spectral border-spectral/40'
                    }`}
                  >
                    {c.status}
                  </span>

                  <span className="flex items-center gap-1 text-gold font-display font-semibold">
                    <Coins size={13} />
                    <span>{c.reward} £</span>
                  </span>
                </div>

                <h3 className="font-display text-base text-gold font-bold line-clamp-1">
                  {c.title}
                </h3>

                <p className="text-xs text-bone/70 line-clamp-2 mt-1.5 leading-relaxed">
                  {c.description}
                </p>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-bone/50 mb-1">
                    <span>Execution Progress</span>
                    <span>{c.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-void rounded-full overflow-hidden border border-bronze/30">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-emerald-400 transition-all duration-500"
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                </div>

                {/* Objectives */}
                {c.objectives && c.objectives.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-bronze/20 text-[11px] text-bone/70 space-y-0.5">
                    {c.objectives.slice(0, 2).map((obj, i) => (
                      <div key={i} className="truncate flex items-center gap-1.5">
                        <CheckCircle size={10} className="text-gold shrink-0" />
                        <span className="truncate">{obj}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-bronze/40 flex items-center justify-between text-[11px] text-bone/60">
                <span className="flex items-center gap-1">
                  <ShieldAlert size={12} className={c.danger >= 7 ? 'text-crimson' : 'text-gold'} />
                  <span>Danger {c.danger}/10</span>
                </span>

                <span className="border border-bronze/40 px-1.5 py-0.5 rounded text-[10px]">
                  Seq ≤ {c.hazardRank} Req
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Commission Detail Modal */}
      <Modal
        open={!!selectedCommission}
        onClose={() => setSelectedCommission(null)}
        title={selectedCommission?.title || 'Commission Dossier'}
      >
        {selectedCommission && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* Meta header */}
            <div className="p-3 rounded bg-void/80 border border-bronze/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[9px] text-bone/50 block uppercase">Reward</span>
                <span className="text-gold font-display font-bold text-sm">
                  {selectedCommission.reward} Pounds
                </span>
              </div>
              <div>
                <span className="text-[9px] text-bone/50 block uppercase">Danger Level</span>
                <span className="text-crimson font-display font-bold text-sm">
                  {selectedCommission.danger} / 10
                </span>
              </div>
              <div>
                <span className="text-[9px] text-bone/50 block uppercase">Req Sequence</span>
                <span className="text-spectral font-display font-bold text-sm">
                  Seq {selectedCommission.hazardRank}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-bone/50 block uppercase">Status</span>
                <span className="text-bone font-display font-bold text-sm">
                  {selectedCommission.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Mission Briefing
              </h4>
              <p className="p-2.5 rounded bg-void/50 border border-bronze/30 text-bone/80 leading-relaxed font-serif">
                {selectedCommission.description}
              </p>
            </div>

            {/* Objectives */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Mission Objectives
              </h4>
              <ul className="space-y-1">
                {(selectedCommission.objectives || []).map((obj, i) => (
                  <li
                    key={i}
                    className="p-1.5 rounded bg-void/60 border border-bronze/30 text-bone/80 flex items-start gap-2"
                  >
                    <CheckCircle size={13} className="text-gold shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Completion Report / Field Notes if completed */}
            {selectedCommission.completionReport && (
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                  Field Debrief & Completion Report
                </h4>
                <div className="p-3 rounded bg-void/80 border border-gold/40 text-bone/90 font-mono text-[11px] leading-relaxed">
                  {selectedCommission.completionReport}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-bronze/40 space-y-3">
              {selectedCommission.status === 'OPEN' && (
                <div>
                  {mySequence <= selectedCommission.hazardRank ? (
                    <button
                      onClick={() => handleClaimCommission(selectedCommission.id)}
                      className="btn w-full py-2 flex items-center justify-center gap-2"
                    >
                      <Briefcase size={14} />
                      <span>Accept & Claim Commission</span>
                    </button>
                  ) : (
                    <div className="p-2 rounded bg-crimson/20 border border-crimson/50 text-crimson text-center">
                      <span className="font-semibold block">Sequence Rank Insufficient</span>
                      Your current rank is Sequence {mySequence}. This hazard requires Sequence {selectedCommission.hazardRank} or higher.
                    </div>
                  )}
                </div>
              )}

              {(selectedCommission.status === 'ASSIGNED' || selectedCommission.status === 'ACTIVE') &&
                (selectedCommission.claimer?.id === user?.id || selectedCommission.creator?.id === user?.id) && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleAdvanceProgress(selectedCommission.id, selectedCommission.progress)
                        }
                        className="btn flex-1 py-1.5"
                      >
                        Advance Progress (+25%)
                      </button>
                    </div>

                    {/* Debrief form */}
                    <div className="pt-2 border-t border-bronze/30 space-y-2">
                      <label className="block text-[11px] text-gold font-display">
                        Post-Mission Debrief & Sanity Assessment
                      </label>
                      <textarea
                        className="inp h-20 text-xs font-serif"
                        value={debriefNotes}
                        onChange={e => setDebriefNotes(e.target.value)}
                        placeholder="Inscribe observations, casualties avoided, and sanity expenditure..."
                      />
                      <button
                        onClick={() => handleCompleteCommission(selectedCommission.id)}
                        disabled={submittingDebrief}
                        className="btn w-full py-1.5 bg-gold/15 text-gold border-gold"
                      >
                        {submittingDebrief ? 'Sealing Report...' : 'Complete Commission & Claim Bounty'}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </Modal>

      {/* Post Commission Modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Commission Dispatch into the Fog"
      >
        <form onSubmit={handleCreateCommission} className="space-y-3 text-xs">
          <div>
            <label className="block text-bone/70 mb-1">Commission Title</label>
            <input
              className="inp"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Investigate haunted mausoleum in Tingen cemetery"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-bone/70 mb-1">Reward (£)</label>
              <input
                type="number"
                min={10}
                className="inp"
                value={formReward}
                onChange={e => setFormReward(+e.target.value)}
              />
            </div>
            <div>
              <label className="block text-bone/70 mb-1">Danger (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="inp"
                value={formDanger}
                onChange={e => setFormDanger(+e.target.value)}
              />
            </div>
            <div>
              <label className="block text-bone/70 mb-1">Max Sequence Req</label>
              <input
                type="number"
                min={0}
                max={9}
                className="inp"
                value={formRank}
                onChange={e => setFormRank(+e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Mission Briefing</label>
            <textarea
              className="inp h-24 font-serif"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Provide background, hazards, enemy sequence predictions, and constraints..."
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">
              Mission Objectives (One per line)
            </label>
            <textarea
              className="inp h-20 font-mono text-[11px]"
              value={formObjectives}
              onChange={e => setFormObjectives(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="btn text-bone/60 hover:text-bone"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn flex items-center gap-1.5"
            >
              <Briefcase size={13} />
              <span>{creating ? 'Dispatching...' : 'Publish Commission'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
