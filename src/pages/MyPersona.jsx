import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  UserCircle,
  Save,
  Shield,
  Eye,
  Award,
  Coins,
  MapPin,
  Lock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

const ARCANA_CARDS = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
];

export default function MyPersona() {
  const { user, refreshMe } = useApp();
  const [codename, setCodename] = useState('');
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [avatarCard, setAvatarCard] = useState('The Fool');
  const [statusMessage, setStatusMessage] = useState('');
  const [showPathway, setShowPathway] = useState(true);
  const [showSequence, setShowSequence] = useState(true);
  const [showRegion, setShowRegion] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setCodename(user.profile.codename || '');
      setBio(user.profile.bio || '');
      setSpecialization(user.profile.specialization || '');
      setAvatarCard(user.profile.avatarCard || 'The Fool');
      setStatusMessage(user.profile.statusMessage || '');
      setShowPathway(user.profile.showPathway ?? true);
      setShowSequence(user.profile.showSequence ?? true);
      setShowRegion(user.profile.showRegion ?? true);
      setIsPublic(user.profile.isPublic ?? true);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        codename,
        bio,
        specialization,
        avatarCard,
        statusMessage,
        showPathway,
        showSequence,
        showRegion,
        isPublic
      });
      toast.success('Your persona above the gray fog has been consecrated.');
      refreshMe();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const pathway = user?.profile?.pathway || 'Fool';
  const sequence = user?.profile?.sequence ?? 5;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-bronze/40 pb-3">
        <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
          My Tarot Persona
        </h1>
        <p className="text-xs text-bone/70 mt-1">
          Customize your sacred identity, mystical bio, and visibility permissions above the gray fog.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card & Avatar Selection */}
        <div className="panel p-6 bg-gradient-to-br from-fog/90 to-void border-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-32 rounded-lg border-2 border-gold bg-bronze/40 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0">
            <span className="text-[10px] text-gold/80 font-display">MAJOR ARCANA</span>
            <span className="font-display text-3xl font-bold text-gold my-1">
              {avatarCard.slice(0, 2)}
            </span>
            <span className="text-[9px] text-bone/70 text-center px-1 font-display truncate max-w-full">
              {avatarCard}
            </span>
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-display text-gold font-bold">
                {codename || user?.username}
              </h2>
              <span className="text-xs border border-bronze/50 bg-bronze/20 text-bone px-2 py-0.5 rounded">
                {pathway} Pathway · Sequence {sequence}
              </span>
            </div>

            <p className="text-xs text-bone/80 font-serif italic">
              "{statusMessage || 'Contemplating above the gray fog'}"
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs">
              <span className="text-gold font-display flex items-center gap-1">
                <Award size={13} />
                <span>{user?.profile?.reputation || 100} Reputation</span>
              </span>
              <span className="text-emerald-400 font-display flex items-center gap-1">
                <Coins size={13} />
                <span>{user?.profile?.contributions || 0} £ Contributed</span>
              </span>
              <span className="text-bone/60 flex items-center gap-1">
                <MapPin size={13} />
                <span>{user?.profile?.region || 'Backlund'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Identity Details */}
        <div className="panel space-y-4">
          <h3 className="font-display text-sm text-gold font-semibold uppercase tracking-wider border-b border-bronze/40 pb-2">
            Identity & Tarot Card
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bone/70 mb-1">Codename / Title</label>
              <input
                className="inp text-xs"
                value={codename}
                onChange={e => setCodename(e.target.value)}
                placeholder="e.g. The Fool, Justice, The Hanged Man"
              />
            </div>

            <div>
              <label className="block text-xs text-bone/70 mb-1">Avatar Major Arcana Card</label>
              <select
                className="inp text-xs"
                value={avatarCard}
                onChange={e => setAvatarCard(e.target.value)}
              >
                {ARCANA_CARDS.map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-bone/70 mb-1">Status Whispers</label>
            <input
              className="inp text-xs"
              value={statusMessage}
              onChange={e => setStatusMessage(e.target.value)}
              placeholder="e.g. Seeking Sequence 6 potion ingredients in Trier..."
            />
          </div>

          <div>
            <label className="block text-xs text-bone/70 mb-1">Occult Specialization</label>
            <input
              className="inp text-xs font-mono"
              value={specialization}
              onChange={e => setSpecialization(e.target.value)}
              placeholder="e.g. Divination, Spirit Body Threads, Astrology"
            />
          </div>

          <div>
            <label className="block text-xs text-bone/70 mb-1">Beyonder Biography</label>
            <textarea
              className="inp h-24 text-xs font-serif leading-relaxed"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Inscribe your personal history, affiliations, and sacred vows..."
            />
          </div>
        </div>

        {/* Privacy & Veil Controls */}
        <div className="panel space-y-4">
          <h3 className="font-display text-sm text-gold font-semibold uppercase tracking-wider border-b border-bronze/40 pb-2">
            Fog Privacy & Concealment Controls
          </h3>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-3 p-2.5 rounded bg-void/50 border border-bronze/30 cursor-pointer">
              <input
                type="checkbox"
                checked={showPathway}
                onChange={e => setShowPathway(e.target.checked)}
                className="rounded accent-gold w-4 h-4"
              />
              <div>
                <span className="font-display text-gold block">Display Pathway</span>
                <span className="text-[10px] text-bone/60">Allow fellow members to inspect your pathway</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded bg-void/50 border border-bronze/30 cursor-pointer">
              <input
                type="checkbox"
                checked={showSequence}
                onChange={e => setShowSequence(e.target.checked)}
                className="rounded accent-gold w-4 h-4"
              />
              <div>
                <span className="font-display text-gold block">Display Sequence Rank</span>
                <span className="text-[10px] text-bone/60">Allow members to see your current sequence</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded bg-void/50 border border-bronze/30 cursor-pointer">
              <input
                type="checkbox"
                checked={showRegion}
                onChange={e => setShowRegion(e.target.checked)}
                className="rounded accent-gold w-4 h-4"
              />
              <div>
                <span className="font-display text-gold block">Display Region</span>
                <span className="text-[10px] text-bone/60">Show your geographical field of operations</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded bg-void/50 border border-bronze/30 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="rounded accent-gold w-4 h-4"
              />
              <div>
                <span className="font-display text-gold block">Public in Roster</span>
                <span className="text-[10px] text-bone/60">Include your persona in the general member directory</span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn flex items-center gap-2 py-2 px-6 bg-gold/15 text-gold border-gold"
          >
            <Save size={14} />
            <span>{saving ? 'Consecrating...' : 'Consecrate Persona'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
