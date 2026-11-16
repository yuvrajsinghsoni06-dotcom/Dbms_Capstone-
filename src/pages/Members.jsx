import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  MessageSquare,
  Award,
  Shield,
  Eye,
  CheckCircle,
  Sparkles,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

export default function Members() {
  const { user, socket } = useApp();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState(null);
  const [whisperModal, setWhisperModal] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [sendingWhisper, setSendingWhisper] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (err) {
      toast.error('Failed to load council members: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    const unsubPresence = socket.on('MEMBER_PRESENCE_UPDATED', () => loadMembers());
    const unsubProfile = socket.on('MEMBER_PROFILE_UPDATED', () => loadMembers());
    return () => {
      unsubPresence();
      unsubProfile();
    };
  }, [socket]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch =
        m.codename.toLowerCase().includes(search.toLowerCase()) ||
        m.pathway.toLowerCase().includes(search.toLowerCase()) ||
        m.region.toLowerCase().includes(search.toLowerCase()) ||
        (m.specialization && m.specialization.toLowerCase().includes(search.toLowerCase()));

      const matchesPathway = pathwayFilter === 'ALL' || m.pathway === pathwayFilter;
      return matchesSearch && matchesPathway;
    });
  }, [members, search, pathwayFilter]);

  const pathwaysList = useMemo(() => {
    const set = new Set(members.map(m => m.pathway).filter(p => p !== 'Veiled'));
    return ['ALL', ...Array.from(set)];
  }, [members]);

  const handleSendWhisper = async (e) => {
    e.preventDefault();
    if (!selectedMember || !whisperText.trim()) return;
    setSendingWhisper(true);
    try {
      await api.sendWhisper(selectedMember.id, whisperText.trim());
      toast.success(`Whisper sent to ${selectedMember.codename}`);
      setWhisperText('');
      setWhisperModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingWhisper(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Tarot Council Roster
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            The consecrated Beyonders of the Tarot Club, their pathways, sequences, and reputations.
          </p>
        </div>

        <button
          onClick={loadMembers}
          className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition self-start sm:self-auto"
          title="Refresh Roster"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-bone/40" />
          <input
            className="inp pl-9 text-xs"
            placeholder="Search by codename, pathway, region, specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="inp w-full sm:w-52 text-xs"
          value={pathwayFilter}
          onChange={e => setPathwayFilter(e.target.value)}
        >
          {pathwaysList.map(p => (
            <option key={p} value={p}>
              {p === 'ALL' ? 'All Pathways' : `${p} Pathway`}
            </option>
          ))}
        </select>
      </div>

      {/* Members Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMembers.map(m => {
          const isMe = m.id === user?.id;

          return (
            <motion.div
              key={m.id}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedMember(m)}
              className={`panel p-4 flex flex-col justify-between cursor-pointer transition-all ${
                isMe
                  ? 'border-gold bg-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'hover:border-gold/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-16 rounded border-2 border-gold/70 bg-gradient-to-b from-fog to-void flex flex-col items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                    <span className="text-[8px] text-gold/60 uppercase font-display">ARCANA</span>
                    <span className="font-display text-sm font-bold text-gold">
                      {m.avatarCard?.slice(0, 2) || m.codename.slice(0, 2)}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-display uppercase tracking-wider flex items-center gap-1 ${
                        m.online
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-void text-bone/40 border border-bronze/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          m.online ? 'bg-emerald-400' : 'bg-gray-600'
                        }`}
                      />
                      {m.online ? 'Present' : 'Veiled'}
                    </span>

                    {m.seat && (
                      <span className="text-[10px] text-gold font-display truncate max-w-[100px]">
                        Seat: {m.seat.title}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-display text-base text-gold font-bold truncate">
                  {m.codename}
                </h3>
                <p className="text-xs text-bone/80 mt-0.5">
                  {m.pathway} {m.sequence !== null ? `· Seq ${m.sequence}` : ''}
                </p>

                <p className="text-[11px] text-bone/60 mt-2 line-clamp-2 leading-relaxed">
                  {m.bio || 'A secretive Beyonder.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-bronze/40 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-bone/60 truncate">
                  <MapPin size={11} className="text-gold shrink-0" />
                  <span className="truncate">{m.region}</span>
                </div>
                <div className="text-gold font-display font-semibold">
                  {m.reputation} rep
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Member Inspection Modal */}
      <Modal
        open={!!selectedMember && !whisperModal}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.codename || 'Council Dossier'}
      >
        {selectedMember && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded border border-bronze/50 bg-void/80 flex items-center gap-3">
              <div className="w-14 h-18 rounded border-2 border-gold bg-bronze/40 flex flex-col items-center justify-center font-display text-gold">
                <span className="text-[9px] text-gold/70">TAROT</span>
                <span className="text-xl font-bold">{selectedMember.avatarCard?.slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-display text-gold font-bold truncate">
                    {selectedMember.codename}
                  </h3>
                  {selectedMember.online && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                      Online in Spirit
                    </span>
                  )}
                </div>
                <p className="text-bone/80 text-xs">
                  {selectedMember.pathway} Pathway · Sequence {selectedMember.sequence ?? 'Secret'}
                </p>
                <p className="text-[11px] text-bone/50 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-gold" />
                  {selectedMember.region}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Biography & Nature
              </h4>
              <p className="p-2.5 rounded bg-void/50 border border-bronze/30 text-bone/80 leading-relaxed">
                {selectedMember.bio}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold font-display mb-1">
                Specialization & Beyonder Capabilities
              </h4>
              <p className="p-2.5 rounded bg-void/50 border border-bronze/30 text-gold/90 leading-relaxed font-mono text-[11px]">
                {selectedMember.specialization}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded bg-void/60 border border-bronze/30">
                <span className="text-[9px] text-bone/50 block uppercase">Reputation</span>
                <span className="text-gold font-display font-bold text-sm">
                  {selectedMember.reputation}
                </span>
              </div>
              <div className="p-2 rounded bg-void/60 border border-bronze/30">
                <span className="text-[9px] text-bone/50 block uppercase">Contributions</span>
                <span className="text-emerald-400 font-display font-bold text-sm">
                  {selectedMember.contributions} £
                </span>
              </div>
            </div>

            {selectedMember.id !== user?.id && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setWhisperModal(true)}
                  className="btn flex items-center gap-1.5 w-full justify-center py-2"
                >
                  <MessageSquare size={13} />
                  <span>Send Secret Whisper to {selectedMember.codename}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Whisper Modal */}
      <Modal
        open={whisperModal}
        onClose={() => setWhisperModal(false)}
        title={`Whisper to ${selectedMember?.codename}`}
      >
        <form onSubmit={handleSendWhisper} className="space-y-3 text-xs">
          <p className="text-bone/70 italic">
            This private transmission through the gray fog will be delivered directly to {selectedMember?.codename}.
          </p>
          <textarea
            className="inp h-28"
            required
            autoFocus
            value={whisperText}
            onChange={e => setWhisperText(e.target.value)}
            placeholder="Write your secret whisper..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWhisperModal(false)}
              className="btn text-bone/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingWhisper || !whisperText.trim()}
              className="btn flex items-center gap-1.5"
            >
              <span>{sendingWhisper ? 'Transmitting...' : 'Send Whisper'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
