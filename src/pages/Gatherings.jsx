import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CalendarCheck,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Eye,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

export default function Gatherings() {
  const { user, socket } = useApp();
  const [gatherings, setGatherings] = useState([]);
  const [selectedGathering, setSelectedGathering] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formTheme, setFormTheme] = useState('Tarot Club Assembly');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formAgenda, setFormAgenda] = useState('Opening greetings\nExchange of potion formulas\nField intelligence debrief');
  const [creating, setCreating] = useState(false);

  const loadGatherings = async () => {
    try {
      const data = await api.getGatherings();
      setGatherings(data);
    } catch (err) {
      toast.error('Failed to load assemblies: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGatherings();
  }, []);

  useEffect(() => {
    const unsubCreated = socket.on('GATHERING_CREATED', () => loadGatherings());
    const unsubUpdated = socket.on('GATHERING_UPDATED', () => loadGatherings());
    const unsubRsvp = socket.on('GATHERING_RSVP_UPDATED', () => loadGatherings());

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubRsvp();
    };
  }, [socket]);

  const handleCreateGathering = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) {
      return toast.error('Please enter a title and scheduled time.');
    }
    setCreating(true);
    try {
      const agendaArray = formAgenda
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean);

      await api.createGathering({
        title: formTitle.trim(),
        theme: formTheme.trim(),
        description: formDesc.trim(),
        scheduledAt: new Date(formDate).toISOString(),
        agenda: agendaArray
      });

      toast.success('Gathering convocation declared above the gray fog.');
      setCreateModal(false);
      setFormTitle('');
      setFormDesc('');
      setFormDate('');
      loadGatherings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRsvp = async (gatheringId, status) => {
    try {
      await api.rsvpGathering(gatheringId, { rsvpStatus: status });
      toast.success(`RSVP updated to ${status}`);
      loadGatherings();
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
            Gatherings & Assembly Schedule
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Convocations of the Tarot Club above the gray fog, rituals, and preserved meeting minutes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModal(true)}
            className="btn flex items-center gap-1.5 bg-gold/15 text-gold border-gold"
          >
            <Plus size={14} />
            <span>Summon Gathering</span>
          </button>
          <button
            onClick={loadGatherings}
            className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition"
            title="Refresh Gatherings"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Gatherings Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gatherings.map(g => {
          const isUpcoming = g.status === 'UPCOMING';
          const isInProgress = g.status === 'IN_PROGRESS';
          const isCompleted = g.status === 'COMPLETED';

          const myRsvp = g.participants?.find((p) => p.userId === user?.id)?.rsvpStatus;

          return (
            <motion.div
              key={g.id}
              whileHover={{ y: -3 }}
              className={`panel flex flex-col justify-between transition-all ${
                isInProgress
                  ? 'border-gold shadow-[0_0_20px_rgba(212,175,55,0.25)] bg-gold/5'
                  : 'hover:border-gold/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span
                    className={`px-2 py-0.5 rounded font-display uppercase tracking-wider text-[10px] font-semibold ${
                      isInProgress
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : isUpcoming
                        ? 'bg-spectral/20 text-spectral border border-spectral/40'
                        : 'bg-void text-bone/50 border border-bronze/30'
                    }`}
                  >
                    {isInProgress ? '● Convocating Now' : g.status}
                  </span>
                  <span className="text-bone/50 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(g.scheduledAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <h3 className="font-display text-base text-gold font-bold line-clamp-1">
                  {g.title}
                </h3>
                <p className="text-xs text-gold/80 italic mt-0.5">{g.theme}</p>
                <p className="text-xs text-bone/70 line-clamp-2 mt-2 leading-relaxed">
                  {g.description || 'No formal briefing provided.'}
                </p>

                {/* Agenda Preview */}
                {g.agenda && g.agenda.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-bronze/30">
                    <span className="text-[10px] uppercase tracking-wider text-bone/50 block mb-1">
                      Key Agenda ({g.agenda.length})
                    </span>
                    <ul className="text-[11px] text-bone/80 space-y-0.5">
                      {g.agenda.slice(0, 2).map((item, idx) => (
                        <li key={idx} className="truncate flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Actions & RSVP */}
              <div className="mt-4 pt-3 border-t border-bronze/40 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-bone/50 mr-1">RSVP:</span>
                  <button
                    onClick={() => handleRsvp(g.id, 'ATTENDING')}
                    className={`p-1 rounded text-xs border ${
                      myRsvp === 'ATTENDING'
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                        : 'bg-void border-bronze/40 hover:border-gold'
                    }`}
                    title="Attending"
                  >
                    <CheckCircle2 size={13} />
                  </button>
                  <button
                    onClick={() => handleRsvp(g.id, 'TENTATIVE')}
                    className={`p-1 rounded text-xs border ${
                      myRsvp === 'TENTATIVE'
                        ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                        : 'bg-void border-bronze/40 hover:border-gold'
                    }`}
                    title="Tentative"
                  >
                    <HelpCircle size={13} />
                  </button>
                  <button
                    onClick={() => handleRsvp(g.id, 'DECLINED')}
                    className={`p-1 rounded text-xs border ${
                      myRsvp === 'DECLINED'
                        ? 'bg-crimson/30 text-crimson border-crimson'
                        : 'bg-void border-bronze/40 hover:border-gold'
                    }`}
                    title="Declined"
                  >
                    <XCircle size={13} />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedGathering(g)}
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  <FileText size={12} />
                  <span>Dossier</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Gathering Detail Dossier Modal */}
      <Modal
        open={!!selectedGathering}
        onClose={() => setSelectedGathering(null)}
        title={selectedGathering?.title || 'Gathering Dossier'}
      >
        {selectedGathering && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-void/80 border border-bronze/40">
              <div>
                <span className="text-[10px] text-bone/50 block uppercase">Theme</span>
                <span className="text-gold font-display font-semibold">
                  {selectedGathering.theme}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-bone/50 block uppercase">Date</span>
                <span className="text-bone">
                  {new Date(selectedGathering.scheduledAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Briefing
              </h4>
              <p className="text-bone/80 bg-void/50 p-2.5 rounded border border-bronze/30 leading-relaxed">
                {selectedGathering.description || 'No detailed briefing.'}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Agenda Items
              </h4>
              <ul className="space-y-1">
                {(selectedGathering.agenda || []).map((item, idx) => (
                  <li
                    key={idx}
                    className="p-1.5 rounded bg-void/60 border border-bronze/30 text-bone/80 flex items-start gap-2"
                  >
                    <CheckCircle2 size={13} className="text-gold shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedGathering.minutes && (
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                  Preserved Meeting Minutes
                </h4>
                <div className="p-3 rounded bg-void/80 border border-gold/30 font-mono text-[11px] text-bone/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedGathering.minutes}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Summon Gathering Modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Summon Tarot Club Gathering"
      >
        <form onSubmit={handleCreateGathering} className="space-y-3 text-xs">
          <div>
            <label className="block text-bone/70 mb-1">Assembly Title</label>
            <input
              className="inp"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. The 45th Assembly: The Great Smog Investigation"
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Theme / Focus</label>
            <input
              className="inp"
              value={formTheme}
              onChange={e => setFormTheme(e.target.value)}
              placeholder="e.g. Ancient Sacrificial Altars & Spirit Coordinates"
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              className="inp"
              required
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Briefing Description</label>
            <textarea
              className="inp h-20"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Detail the circumstances, threats, or opportunities motivating this convocation..."
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">
              Agenda Items (One per line)
            </label>
            <textarea
              className="inp h-20 font-mono"
              value={formAgenda}
              onChange={e => setFormAgenda(e.target.value)}
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
              <Sparkles size={13} />
              <span>{creating ? 'Decreeing...' : 'Declare Gathering'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
