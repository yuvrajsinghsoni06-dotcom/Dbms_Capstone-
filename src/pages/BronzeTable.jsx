import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Table2,
  Hand,
  Volume2,
  VolumeX,
  Shield,
  MessageSquare,
  Lock,
  Sparkles,
  CheckCircle,
  FileText,
  Send,
  Eye,
  UserCheck,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

const ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
];

export default function BronzeTable() {
  const { user, socket, refreshMe } = useApp();
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [activeGathering, setActiveGathering] = useState(null);
  const [minutesText, setMinutesText] = useState('');
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [whisperRecipient, setWhisperRecipient] = useState(null);
  const [whisperText, setWhisperText] = useState('');
  const [sendingWhisper, setSendingWhisper] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatScrollRef = useRef(null);

  // Load seats, messages, and gathering
  const loadData = async () => {
    try {
      const [seatsData, msgsData, gatherings] = await Promise.all([
        api.getSeats(),
        api.getTableMessages(),
        api.getGatherings()
      ]);
      setSeats(seatsData);
      setMessages(msgsData);

      const inProgress = gatherings.find((g) => g.status === 'IN_PROGRESS') || gatherings[0];
      if (inProgress) {
        setActiveGathering(inProgress);
        setMinutesText(inProgress.minutes || '');
      }
    } catch (err) {
      toast.error('Failed to align with the Sefirah Castle: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for socket events
  useEffect(() => {
    const unsubSeat = socket.on('TABLE_SEAT_UPDATED', (payload) => {
      setSeats(prev =>
        prev.map(s => {
          if (s.id === payload.id) {
            return {
              ...s,
              occupied: !!payload.occupantId,
              isSpeaking: payload.isSpeaking ?? false,
              handRaised: payload.handRaised ?? false
            };
          }
          if (payload.occupantId && s.occupant?.id === payload.occupantId && s.id !== payload.id) {
            return { ...s, occupied: false, occupant: null, isSpeaking: false, handRaised: false };
          }
          return s;
        })
      );
      // Reload seats to get full occupant profile data
      api.getSeats().then(setSeats).catch(() => {});
    });

    const unsubMsg = socket.on('TABLE_MESSAGE_CREATED', (payload) => {
      setMessages(prev => [...prev, payload]);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    const unsubGathering = socket.on('GATHERING_UPDATED', (payload) => {
      if (activeGathering && activeGathering.id === payload.id) {
        setActiveGathering((prev) => ({ ...prev, ...payload }));
        if (payload.minutes) setMinutesText(payload.minutes);
      }
    });

    return () => {
      unsubSeat();
      unsubMsg();
      unsubGathering();
    };
  }, [socket, activeGathering]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [messages]);

  const mySeat = useMemo(() => {
    return seats.find(s => s.occupant?.id === user?.id);
  }, [seats, user]);

  const isHost = useMemo(() => {
    return user?.role === 'ADMIN' || mySeat?.id === 0;
  }, [user, mySeat]);

  // Actions
  const handleTakeSeat = async (seatId) => {
    try {
      await api.takeSeat(seatId);
      toast.success(`You occupy ${ARCANA[seatId]} at the Bronze Table.`);
      setSelectedSeat(null);
      await loadData();
      refreshMe();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLeaveSeat = async () => {
    try {
      await api.leaveSeat();
      toast.success('You vacated your seat at the table.');
      setSelectedSeat(null);
      await loadData();
      refreshMe();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleSpeaking = async () => {
    if (!mySeat) return;
    try {
      const nextState = !mySeat.isSpeaking;
      await api.updateSeatStatus({ isSpeaking: nextState, handRaised: false });
      toast(nextState ? '✦ You are now addressing the assembly' : 'Silence restored.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleHand = async () => {
    if (!mySeat) return;
    try {
      const nextState = !mySeat.handRaised;
      await api.updateSeatStatus({ handRaised: nextState });
      toast(nextState ? 'Hand raised to request the floor.' : 'Hand lowered.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleModerateSeat = async (seatId, action) => {
    try {
      await api.moderateSeat({ seatId, action });
      toast.success(`Seat ${seatId} moderated: ${action}`);
      setSelectedSeat(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    try {
      await api.sendTableMessage({
        body: inputMsg.trim(),
        gatheringId: activeGathering?.id
      });
      setInputMsg('');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSendWhisper = async (e) => {
    e.preventDefault();
    if (!whisperRecipient || !whisperText.trim()) return;
    setSendingWhisper(true);
    try {
      await api.sendWhisper(whisperRecipient.id, whisperText.trim());
      toast.success(`Whisper conveyed to ${whisperRecipient.codename}`);
      setWhisperText('');
      setWhisperRecipient(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingWhisper(false);
    }
  };

  const handleSaveMinutes = async () => {
    if (!activeGathering) return;
    setSavingMinutes(true);
    try {
      await api.updateGathering(activeGathering.id, { minutes: minutesText });
      toast.success('Gathering minutes sealed into the archives.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingMinutes(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Atmosphere header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
              The Long Bronze Table
            </h1>
            <span className="text-xs px-2 py-0.5 rounded border border-gold/40 bg-gold/10 text-gold uppercase tracking-wider font-display">
              Sefirah Castle
            </span>
          </div>
          <p className="text-xs text-bone/70 mt-1">
            Above the endless gray fog where the 22 Major Arcana seats gather in mystical assembly.
          </p>
        </div>

        {/* Member Seat Status Pill & Quick Controls */}
        <div className="flex items-center gap-2">
          {mySeat ? (
            <div className="flex items-center gap-2 bg-fog/80 border border-gold/50 p-1.5 px-3 rounded text-xs">
              <span className="text-gold font-display font-semibold">{mySeat.title}</span>
              <button
                onClick={handleToggleSpeaking}
                className={`px-2 py-1 rounded text-[11px] font-display transition border ${
                  mySeat.isSpeaking
                    ? 'bg-crimson text-gold border-gold animate-pulse'
                    : 'bg-void text-bone hover:border-gold'
                }`}
              >
                {mySeat.isSpeaking ? '● Speaking' : 'Speak'}
              </button>
              <button
                onClick={handleToggleHand}
                className={`p-1 rounded text-[11px] border ${
                  mySeat.handRaised ? 'bg-amber-600/50 text-gold border-gold' : 'bg-void hover:border-gold'
                }`}
                title={mySeat.handRaised ? 'Lower Hand' : 'Raise Hand'}
              >
                <Hand size={14} />
              </button>
              <button
                onClick={handleLeaveSeat}
                className="text-[11px] text-crimson hover:underline pl-1"
              >
                Leave
              </button>
            </div>
          ) : (
            <div className="text-xs text-bone/60 italic bg-void/60 border border-bronze/40 p-2 rounded">
              Standing above the fog. Click any vacant seat to sit.
            </div>
          )}

          <button
            onClick={loadData}
            className="p-2 border border-bronze/50 hover:border-gold rounded text-gold transition"
            title="Refresh Table State"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Bronze Table Display */}
      <div className="panel p-6 relative overflow-hidden bg-gradient-to-b from-void/90 via-fog/40 to-void/90 border-bronze/70 shadow-[0_0_50px_rgba(123,90,43,0.2)]">
        {/* Decorative Gray Fog overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,#7B5A2B_0%,transparent_70%)]" />

        <div className="text-center mb-2">
          <span className="text-[11px] uppercase tracking-widest text-gold/80 font-display">
            Sacred Hall of the 22 Major Arcana
          </span>
        </div>

        {/* Circular / Oval Table Structure */}
        <div className="relative mx-auto w-full max-w-4xl aspect-[1.4/1] sm:aspect-[1.7/1] my-4 select-none">
          {/* Central Bronze Table Surface */}
          <div className="absolute inset-[18%] sm:inset-[20%] rounded-[50%] border-4 border-bronze bg-gradient-to-br from-bronze/40 via-void to-bronze/20 shadow-[0_0_80px_rgba(212,175,55,0.25)] flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-full border border-gold/40 flex items-center justify-center bg-void/80 mb-2">
              <Eye className="w-6 h-6 text-gold animate-pulse" />
            </div>
            <h3 className="font-display text-gold text-sm sm:text-base font-bold tracking-wider">
              {activeGathering?.theme || 'The Eternal Gray Fog'}
            </h3>
            <p className="text-[10px] sm:text-xs text-bone/60 max-w-xs mt-1 line-clamp-2">
              {activeGathering?.title || 'Tarot Club Convening'}
            </p>
            <div className="mt-2 text-[10px] text-gold/80 flex items-center gap-1.5 border border-bronze/50 px-2.5 py-0.5 rounded-full bg-void/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{seats.filter(s => s.occupied).length} / 22 Seats Occupied</span>
            </div>
          </div>

          {/* 22 Seats plotted around ellipse */}
          {seats.map((seat, i) => {
            const angle = (i / 22) * 2 * Math.PI - Math.PI / 2;
            const rx = 44; // horizontal radius %
            const ry = 42; // vertical radius %
            const left = 50 + rx * Math.cos(angle);
            const top = 50 + ry * Math.sin(angle);

            const isOccupied = seat.occupied;
            const isMe = seat.occupant?.id === user?.id;
            const isSpeaking = seat.isSpeaking;
            const hasHandRaised = seat.handRaised;
            const isOnline = seat.occupant?.online;

            return (
              <motion.div
                key={seat.id}
                whileHover={{ scale: 1.12 }}
                onClick={() => setSelectedSeat(seat)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center group z-20"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                {/* Seat Avatar Card */}
                <div
                  className={`relative w-8 h-10 sm:w-10 sm:h-12 rounded border transition-all flex flex-col items-center justify-center p-0.5 ${
                    isSpeaking
                      ? 'border-gold bg-crimson/80 shadow-[0_0_20px_#D4AF37] ring-2 ring-gold'
                      : isMe
                      ? 'border-gold bg-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                      : isOccupied
                      ? 'border-bronze bg-fog/90 shadow-[0_0_8px_rgba(123,90,43,0.3)]'
                      : 'border-dashed border-bronze/40 bg-void/40 hover:border-gold/60'
                  }`}
                >
                  {/* Speaking Sound Waves */}
                  {isSpeaking && (
                    <span className="absolute -top-2 inset-x-0 flex justify-center gap-0.5">
                      <span className="w-1 h-2 bg-gold rounded animate-bounce" />
                      <span className="w-1 h-3 bg-gold rounded animate-bounce [animation-delay:0.1s]" />
                      <span className="w-1 h-2 bg-gold rounded animate-bounce [animation-delay:0.2s]" />
                    </span>
                  )}

                  {/* Raised Hand indicator */}
                  {hasHandRaised && (
                    <span className="absolute -top-2.5 -right-2 bg-amber-500 text-void p-0.5 rounded-full border border-gold shadow animate-pulse">
                      <Hand size={11} />
                    </span>
                  )}

                  {/* Online status indicator */}
                  {isOccupied && (
                    <span
                      className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-void ${
                        isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-gray-600'
                      }`}
                    />
                  )}

                  {/* Seat Icon / Number */}
                  <span className="text-[9px] font-display text-gold/80 leading-none">
                    {seat.id}
                  </span>
                  <span className="text-[10px] sm:text-xs font-display text-bone font-bold truncate max-w-[90%]">
                    {isOccupied ? seat.occupant?.codename?.slice(0, 3) : '—'}
                  </span>
                </div>

                {/* Seat Title */}
                <span className="text-[8px] sm:text-[10px] font-display text-bone/70 group-hover:text-gold text-center truncate max-w-[65px] mt-0.5 leading-tight">
                  {seat.title}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Grid: Discussion & Assembly Minutes */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Live Gathering Discussion */}
        <div className="lg:col-span-2 panel flex flex-col h-[480px]">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gold" />
              <h2 className="text-gold font-display text-sm font-semibold">
                Council Deliberations
              </h2>
            </div>
            <span className="text-[11px] text-bone/60">
              {messages.length} utterances recorded
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full grid place-items-center text-bone/40 italic">
                The Long Bronze Table is quiet. The gray fog drifts undisturbed.
              </div>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded border transition-all ${
                    m.isAnnouncement
                      ? 'border-gold bg-gold/10 shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                      : m.author?.id === user?.id
                      ? 'border-bronze/70 bg-fog/80 ml-4'
                      : 'border-bronze/30 bg-void/60 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-display text-gold font-semibold flex items-center gap-1.5">
                      {m.author?.codename || m.author?.username}
                      {m.author?.sequence !== undefined && (
                        <span className="text-[9px] font-normal text-bone/60 border border-bronze/40 px-1 rounded">
                          Seq {m.author.sequence}
                        </span>
                      )}
                      {m.isAnnouncement && (
                        <span className="text-[9px] px-1 bg-crimson text-gold border border-gold/50 rounded">
                          Edict
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-bone/40">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-bone/90 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="mt-3 pt-2 border-t border-bronze/40 flex gap-2">
            <input
              className="inp text-xs flex-1"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder={
                mySeat
                  ? `Speak to the council as ${mySeat.title}...`
                  : 'Speak into the gray fog...'
              }
            />
            <button
              type="submit"
              disabled={!inputMsg.trim()}
              className="btn flex items-center gap-1 shrink-0 px-4"
            >
              <Send size={13} />
              <span>Utter</span>
            </button>
          </form>
        </div>

        {/* Gathering Agenda & Meeting Minutes */}
        <div className="panel flex flex-col h-[480px]">
          <div className="flex items-center justify-between border-b border-bronze/40 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold" />
              <h2 className="text-gold font-display text-sm font-semibold">
                Assembly Agenda & Minutes
              </h2>
            </div>
            {isHost && (
              <span className="text-[10px] text-gold border border-gold/40 px-1.5 py-0.2 rounded">
                Host Authority
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs custom-scrollbar">
            {/* Active Agenda */}
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gold/80 font-display mb-1.5">
                Current Agenda
              </h4>
              <ul className="space-y-1">
                {(activeGathering?.agenda || [
                  '1. Opening greetings and prayer transmissions',
                  '2. Exchange of potion formulas and sealed artifact lore',
                  '3. Deliberation on East Borough cult anomalies',
                  '4. Conclusion and spirit coordinate banishment'
                ]).map((item, idx) => (
                  <li
                    key={idx}
                    className="p-1.5 rounded bg-void/60 border border-bronze/30 text-bone/80 flex items-start gap-2"
                  >
                    <CheckCircle size={12} className="text-gold shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Automatically Saved Meeting Minutes */}
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[11px] uppercase tracking-wider text-gold/80 font-display">
                  Meeting Minutes
                </h4>
                {isHost && (
                  <button
                    onClick={handleSaveMinutes}
                    disabled={savingMinutes}
                    className="text-[10px] text-gold hover:underline"
                  >
                    {savingMinutes ? 'Sealing...' : 'Save Minutes'}
                  </button>
                )}
              </div>
              <textarea
                className="inp text-xs h-36 font-mono leading-relaxed"
                value={minutesText}
                onChange={e => setMinutesText(e.target.value)}
                readOnly={!isHost}
                placeholder={
                  isHost
                    ? 'Record proceedings, trades agreed, and prophecies uttered during this assembly...'
                    : 'The scribe records the minutes of this gathering above the gray fog...'
                }
              />
              <span className="text-[10px] text-bone/40 mt-1 italic">
                {isHost
                  ? 'As host, your notes will be sealed into the Tarot Club archives.'
                  : 'Meeting minutes are curated by the Host.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Inspection / Claim Modal */}
      <Modal
        open={!!selectedSeat}
        onClose={() => setSelectedSeat(null)}
        title={selectedSeat ? `${selectedSeat.id}. ${selectedSeat.title}` : ''}
      >
        {selectedSeat && (
          <div className="space-y-4 text-xs">
            {selectedSeat.occupied ? (
              <div className="space-y-3">
                <div className="p-3 rounded border border-bronze/50 bg-void/80 flex items-center gap-3">
                  <div className="w-12 h-12 rounded border border-gold/60 bg-bronze/30 flex items-center justify-center font-display text-gold text-lg">
                    {selectedSeat.occupant?.avatarCard?.slice(0, 2) || selectedSeat.occupant?.codename?.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-display text-gold font-bold">
                      {selectedSeat.occupant?.codename}
                    </h3>
                    <p className="text-bone/70 text-[11px]">
                      {selectedSeat.occupant?.pathway} Pathway · Sequence {selectedSeat.occupant?.sequence}
                    </p>
                    <p className="text-[10px] text-bone/50 italic mt-0.5">
                      {selectedSeat.occupant?.specialization || 'Mystical Scholar'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setWhisperRecipient(selectedSeat.occupant);
                      setSelectedSeat(null);
                    }}
                    className="btn flex-1 flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={13} />
                    <span>Whisper to {selectedSeat.occupant?.codename}</span>
                  </button>
                </div>

                {/* Host Moderation Controls */}
                {isHost && (
                  <div className="p-2.5 rounded border border-crimson/50 bg-crimson/10 space-y-2 mt-3">
                    <span className="font-display text-[11px] text-gold block">Host Moderation</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleModerateSeat(selectedSeat.id, 'GRANT_SPEECH')}
                        className="btn text-[10px] py-1"
                      >
                        Grant Speech
                      </button>
                      <button
                        onClick={() => handleModerateSeat(selectedSeat.id, 'CLEAR_SPEECH')}
                        className="btn text-[10px] py-1"
                      >
                        Silence
                      </button>
                      <button
                        onClick={() => handleModerateSeat(selectedSeat.id, 'LOWER_HAND')}
                        className="btn text-[10px] py-1"
                      >
                        Lower Hand
                      </button>
                      <button
                        onClick={() => handleModerateSeat(selectedSeat.id, 'VACATE')}
                        className="btn text-[10px] py-1 text-crimson hover:bg-crimson/20"
                      >
                        Vacate Seat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-bone/80 leading-relaxed">
                  The seat consecrated to <b className="text-gold">{selectedSeat.title}</b> is currently vacant above the gray fog.
                </p>
                <button
                  onClick={() => handleTakeSeat(selectedSeat.id)}
                  className="btn w-full py-2 flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} />
                  <span>Claim & Occupy {selectedSeat.title}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Private Whisper Modal */}
      <Modal
        open={!!whisperRecipient}
        onClose={() => setWhisperRecipient(null)}
        title={whisperRecipient ? `Whisper to ${whisperRecipient.codename}` : ''}
      >
        <form onSubmit={handleSendWhisper} className="space-y-3 text-xs">
          <p className="text-bone/70 italic">
            Private communications conveyed through the gray fog cannot be overheard by other members at the table.
          </p>
          <textarea
            className="inp h-28 text-xs leading-relaxed"
            value={whisperText}
            onChange={e => setWhisperText(e.target.value)}
            placeholder={`Whisper your secret thoughts to ${whisperRecipient?.codename}...`}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWhisperRecipient(null)}
              className="btn text-bone/60 hover:text-bone"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingWhisper || !whisperText.trim()}
              className="btn flex items-center gap-1.5"
            >
              <Send size={13} />
              <span>{sendingWhisper ? 'Whispering...' : 'Send Whisper'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
