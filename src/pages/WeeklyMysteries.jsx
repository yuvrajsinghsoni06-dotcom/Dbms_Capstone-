import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HelpCircle,
  Vote,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Coins,
  Send,
  Eye,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

export default function WeeklyMysteries() {
  const { user, socket, refreshMe } = useApp();
  const [activeTab, setActiveTab] = useState('MYSTERIES');
  const [mysteries, setMysteries] = useState([]);
  const [votes, setVotes] = useState([]);
  const [selectedMystery, setSelectedMystery] = useState(null);
  const [deductionInput, setDeductionInput] = useState('');
  const [submittingDeduction, setSubmittingDeduction] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [mList, vList] = await Promise.all([
        api.getMysteries(),
        api.getVotes()
      ]);
      setMysteries(mList);
      setVotes(vList);
    } catch (err) {
      toast.error('Failed to align mystery data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubVote = socket.on('TAROT_VOTE_CAST', () => loadData());
    return () => unsubVote();
  }, [socket]);

  const handleSubmitDeduction = async (e) => {
    e.preventDefault();
    if (!deductionInput.trim() || !selectedMystery) return;
    setSubmittingDeduction(true);
    try {
      const res = await api.submitMystery(selectedMystery.id, deductionInput.trim());
      if (res.isCorrect) {
        toast.success('✦ Brilliant deduction! The fog lifts!', {
          style: { background: '#1E1E2C', color: '#D4AF37', border: '1px solid #D4AF37' }
        });
        refreshMe();
      } else {
        toast.error('The deduction does not pierce the fog. Try another angle.');
      }
      setSelectedMystery(null);
      setDeductionInput('');
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingDeduction(false);
    }
  };

  const handleCastVote = async (voteId, optionIndex) => {
    try {
      await api.castVote(voteId, optionIndex);
      toast.success('Your vote is etched upon the Tarot council tablet.');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Weekly Mysteries & Council Decisions
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Crack occult cases to earn gold pounds and vote on secret society resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded border border-bronze/50 overflow-hidden text-xs">
            <button
              onClick={() => setActiveTab('MYSTERIES')}
              className={`px-3 py-1.5 font-display transition ${
                activeTab === 'MYSTERIES'
                  ? 'bg-crimson/40 text-gold font-semibold'
                  : 'bg-void text-bone/60 hover:text-bone'
              }`}
            >
              Weekly Cases ({mysteries.length})
            </button>
            <button
              onClick={() => setActiveTab('VOTES')}
              className={`px-3 py-1.5 font-display transition ${
                activeTab === 'VOTES'
                  ? 'bg-crimson/40 text-gold font-semibold'
                  : 'bg-void text-bone/60 hover:text-bone'
              }`}
            >
              Tarot Council Votes ({votes.length})
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {activeTab === 'MYSTERIES' ? (
        /* Mysteries Grid */
        <div className="grid md:grid-cols-2 gap-4">
          {mysteries.map(m => (
            <motion.div
              key={m.id}
              whileHover={{ y: -3 }}
              className={`panel flex flex-col justify-between transition-all ${
                m.userSolved
                  ? 'border-gold bg-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'hover:border-gold/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span
                    className={`px-2 py-0.5 rounded font-display uppercase tracking-wider text-[10px] font-semibold border ${
                      m.difficulty === 'MASTER'
                        ? 'bg-crimson/20 text-crimson border-crimson'
                        : 'bg-spectral/20 text-spectral border-spectral/40'
                    }`}
                  >
                    {m.difficulty} Difficulty
                  </span>

                  <div className="flex items-center gap-3 text-gold font-display font-semibold">
                    <span className="flex items-center gap-1">
                      <Coins size={12} />
                      {m.rewardPounds} £
                    </span>
                    <span className="flex items-center gap-1">
                      <Award size={12} />
                      {m.rewardReputation} Rep
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-base text-gold font-bold">
                  {m.title}
                </h3>

                <p className="text-xs text-bone/80 font-serif line-clamp-3 mt-2 leading-relaxed">
                  {m.clueText}
                </p>

                {m.userSolved && (
                  <div className="mt-3 p-2.5 rounded bg-emerald-950/20 border border-emerald-500/40 text-[11px] text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1 font-display font-semibold">
                      <CheckCircle2 size={13} />
                      <span>Deciphered by you!</span>
                    </div>
                    {m.explanation && (
                      <p className="text-bone/80 font-serif leading-relaxed">
                        {m.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-bronze/30 flex items-center justify-between">
                <span className="text-[10px] text-bone/40">
                  Closes in {Math.max(1, Math.ceil((new Date(m.expiresAt).getTime() - Date.now()) / 864e5))} days
                </span>

                <button
                  onClick={() => setSelectedMystery(m)}
                  className={`btn text-xs py-1 px-3 ${
                    m.userSolved ? 'border-emerald-500 text-emerald-300' : ''
                  }`}
                >
                  {m.userSolved ? 'Review Case' : 'Submit Deduction'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Tarot Council Votes */
        <div className="grid md:grid-cols-2 gap-4">
          {votes.map(v => (
            <div
              key={v.id}
              className="panel flex flex-col justify-between space-y-4 border-bronze/60 bg-gradient-to-br from-fog/70 to-void"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-gold uppercase font-display tracking-wider text-[10px]">
                    Council Motion · {v.createdBy || 'The Fool'}
                  </span>
                  <span className="text-[10px] text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    {v.status}
                  </span>
                </div>

                <h3 className="font-display text-base text-gold font-bold">
                  {v.title}
                </h3>
                <p className="text-xs text-bone/80 mt-1.5 leading-relaxed font-serif">
                  {v.description}
                </p>

                {/* Vote Options & Tally Bars */}
                <div className="mt-4 space-y-2">
                  {v.options.map((opt, idx) => {
                    const count = v.tallies[idx] || 0;
                    const percent = v.totalVotes > 0 ? Math.round((count / v.totalVotes) * 100) : 0;
                    const isMyChoice = v.userVotedOption === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleCastVote(v.id, idx)}
                        className={`p-2.5 rounded border cursor-pointer transition relative overflow-hidden ${
                          isMyChoice
                            ? 'border-gold bg-gold/15'
                            : 'border-bronze/40 bg-void/60 hover:border-gold/60'
                        }`}
                      >
                        {/* Background progress fill */}
                        <div
                          className="absolute inset-y-0 left-0 bg-gold/10 pointer-events-none transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs">
                          <span className="font-medium text-bone/90 flex items-center gap-2">
                            {isMyChoice && <CheckCircle2 size={13} className="text-gold" />}
                            <span>{opt}</span>
                          </span>
                          <span className="font-mono text-gold text-[11px]">
                            {count} votes ({percent}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-bronze/30 text-[10px] text-bone/50 flex justify-between">
                <span>Total Ballots Cast: {v.totalVotes}</span>
                <span>Closes in {Math.max(1, Math.ceil((new Date(v.closesAt).getTime() - Date.now()) / 864e5))} days</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Deduction Modal */}
      <Modal
        open={!!selectedMystery}
        onClose={() => setSelectedMystery(null)}
        title={selectedMystery?.title || 'Case Deduction'}
      >
        {selectedMystery && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded bg-void/80 border border-bronze/40 font-serif leading-relaxed text-bone/90">
              {selectedMystery.clueText}
            </div>

            {selectedMystery.userSolved ? (
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 space-y-1">
                <span className="font-display font-bold block">Case Already Deciphered</span>
                <p className="text-bone/80 font-serif leading-relaxed">
                  {selectedMystery.explanation}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitDeduction} className="space-y-3">
                <div>
                  <label className="block text-bone/70 mb-1">
                    Your Deduction & Key Beyonder Pathway/Creature/Sequence
                  </label>
                  <textarea
                    className="inp h-24 text-xs font-serif leading-relaxed"
                    required
                    value={deductionInput}
                    onChange={e => setDeductionInput(e.target.value)}
                    placeholder="Inscribe your reasoning and name the creature or sequence involved (e.g. Desire Apostle, Traveler)..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMystery(null)}
                    className="btn text-bone/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDeduction || !deductionInput.trim()}
                    className="btn flex items-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    <span>{submittingDeduction ? 'Deciphering...' : 'Submit Deduction'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
