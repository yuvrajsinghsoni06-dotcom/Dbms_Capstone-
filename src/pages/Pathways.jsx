import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FlaskConical,
  Plus,
  Search,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Flame,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

// Complete Lord of the Mysteries standard 22 pathways reference
const ALL_PATHWAYS = [
  {
    name: 'Fool',
    god: 'Lord of the Mysteries / The Fool',
    color: '#D4AF37',
    desc: 'Mastery over mystery, history, marionettes, miracles, and destiny manipulation.',
    sequences: [
      { seq: 9, name: 'Seer', desc: 'Spirit vision, pendulum divination, astrology, dream divination.' },
      { seq: 8, name: 'Clown', desc: 'Superior agility, body control, balance, and facial expression mastery.' },
      { seq: 7, name: 'Magician', desc: 'Damage transfer, illusion, air bullets, bone softening, flame teleport.' },
      { seq: 6, name: 'Faceless', desc: 'Total metamorphosis of appearance, vocal cords, aura, and height.' },
      { seq: 5, name: 'Marionettist', desc: 'Controls Spirit Body Threads, transforming living beings into obedient puppets.' },
      { seq: 4, name: 'Bizarro Sorcerer', desc: 'Demigod rank. Swaps positions with marionettes, spirit world concealment.' },
      { seq: 3, name: 'Scholar of Yore', desc: 'Summons projections of people and sealed artifacts from the Fog of History.' },
      { seq: 2, name: 'Miracle Invoker', desc: 'Brings forth miracles, fulfills wishes, revives from spirit death.' },
      { seq: 1, name: 'Attendant of Mysteries', desc: 'Conceptual grafting, realm transmutation, concealment sovereign.' },
      { seq: 0, name: 'The Fool', desc: 'True Deity. Blind stupidity authority, change and concealment.' }
    ]
  },
  {
    name: 'Door',
    god: 'Key of Stars',
    color: '#5A8DEE',
    desc: 'Spatial manipulation, sealing, astral projection, dimension traveling, and replication.',
    sequences: [
      { seq: 9, name: 'Apprentice', desc: 'Passes through solid doors and walls, slight spirit world sensory.' },
      { seq: 8, name: 'Trickmaster', desc: 'Minor spells: freezing, shock, grease, flash, tumble.' },
      { seq: 7, name: 'Astrologer', desc: 'Advanced divination, astrological navigation, reading omens in the cosmos.' },
      { seq: 6, name: 'Scribe', desc: 'Records and replicates other Beyonders abilities in a mystical notebook.' },
      { seq: 5, name: 'Traveler', desc: 'Teleports across continents and through coordinates in the spirit world.' },
      { seq: 4, name: 'Secrets Sorcerer', desc: 'Demigod rank. Spatial distortion, pocket dimensions, sealing.' },
      { seq: 3, name: 'Wanderer', desc: 'Explores alien stars and the cosmos without corruption.' },
      { seq: 2, name: 'Planeswalker', desc: 'Manipulates conceptual doors, banishing targets into void.' },
      { seq: 1, name: 'Key of Stars', desc: 'Controls stellar gates across the infinite universe.' },
      { seq: 0, name: 'The Door', desc: 'True Deity. Absolute spatial authority.' }
    ]
  },
  {
    name: 'Spectator',
    god: 'Dragon of Imagination / Visionary',
    color: '#EAE7DC',
    desc: 'Psychology, emotion reading, mental placating, mind manipulation, and daydream manifestation.',
    sequences: [
      { seq: 9, name: 'Spectator', desc: 'Observes micro-expressions, body language, emotional auras.' },
      { seq: 8, name: 'Telepathist', desc: 'Reads surface thoughts, telepathic transmission, emotional resonance.' },
      { seq: 7, name: 'Psychiatrist', desc: 'Cures mental instability, frenzy soothing, psychological cues.' },
      { seq: 6, name: 'Hypnotist', desc: 'Deep subconscious hypnosis, implanted commands, memory alteration.' },
      { seq: 5, name: 'Dreamwalker', desc: 'Enters and navigates others dreams, extracting suppressed secrets.' },
      { seq: 4, name: 'Manipulator', desc: 'Demigod rank. Manipulates societal trends, collective subconscious currents.' },
      { seq: 3, name: 'Clergy of Nightmares', desc: 'Turns dreams into lethal reality traps.' },
      { seq: 2, name: 'Discerner', desc: 'Discerns all psychological loopholes and cosmic deceptions.' },
      { seq: 1, name: 'Author', desc: 'Coins destinies into written scripts that targets naturally enact.' },
      { seq: 0, name: 'Visionary', desc: 'True Deity. Whatever is imagined materializes as concrete reality.' }
    ]
  },
  {
    name: 'Sailor',
    god: 'Lord of the Storms / Tyrant',
    color: '#2A52BE',
    desc: 'Maritime supremacy, aquatic physiology, wind mastery, thunderous lightning, and raging storms.',
    sequences: [
      { seq: 9, name: 'Sailor', desc: 'Unshakable balance, aquatic breathing, enhanced physical strength.' },
      { seq: 8, name: 'Folk of Rage', desc: 'Fury surges, devastating melee strikes, intimidation roar.' },
      { seq: 7, name: 'Seafarer', desc: 'Water manipulation, weather prediction, oceanic blessing.' },
      { seq: 6, name: 'Wind-blessed', desc: 'Flight on gale winds, air cushioning, gale blades.' },
      { seq: 5, name: 'Ocean Singer', desc: 'Sonic destruction, siren charm songs, water geysers.' },
      { seq: 4, name: 'Cataclysmic Interrer', desc: 'Demigod rank. Summons localized tsunamis and hurricanes.' },
      { seq: 3, name: 'Sea King', desc: 'Commands all marine organisms and deep oceanic trenches.' },
      { seq: 2, name: 'Calamity', desc: 'Embodiment of natural oceanic cataclysms.' },
      { seq: 1, name: 'Thunder God', desc: 'Pure elemental lightning manifestation.' },
      { seq: 0, name: 'Tyrant', desc: 'True Deity. Supreme lord of storm, wind, lightning, and sea.' }
    ]
  },
  {
    name: 'Sun',
    god: 'Eternal Blazing Sun',
    color: '#FFD700',
    desc: 'Solar radiance, purification, exorcism of corruption, notary contracts, and unyielding light.',
    sequences: [
      { seq: 9, name: 'Bard', desc: 'Spiritual hymns, inspiring bravery, soothing spiritual corruption.' },
      { seq: 8, name: 'Light Suppliant', desc: 'Illuminates darkness, casts holy light, purifies malevolent entities.' },
      { seq: 7, name: 'Solar High Priest', desc: 'Sun halo, solar holy water sanctification, cleansing flares.' },
      { seq: 6, name: 'Notary', desc: 'Notarizes promises with divine contracts, validates or bans skills.' },
      { seq: 5, name: 'Priest of Light', desc: 'Immunity to darkness and curses, radiant sun spear.' },
      { seq: 4, name: 'Unshadowed', desc: 'Demigod rank. Strips corruption and excess characteristics from Beyonders.' },
      { seq: 3, name: 'Justice Mentor', desc: 'Channels divine verdicts upon fallen heretics.' },
      { seq: 2, name: 'Lightseeker', desc: 'Brings light to god-forsaken lands and cursed realms.' },
      { seq: 1, name: 'White Angel', desc: 'Purity incarnation of celestial holy fire.' },
      { seq: 0, name: 'The Sun', desc: 'True Deity. Pure holy radiance banishing all depravity.' }
    ]
  },
  {
    name: 'Darkness',
    god: 'Evernight Goddess',
    color: '#800020',
    desc: 'Nighttime repose, slumber, dream infiltration, pacification, oblivion, and misfortune.',
    sequences: [
      { seq: 9, name: 'Sleepless', desc: 'Requires only 2 hours of rest, enhanced night vision and senses.' },
      { seq: 8, name: 'Midnight Poet', desc: 'Poetry soothing mental frenzy, induces spiritual slumber.' },
      { seq: 7, name: 'Nightmare', desc: 'Enters dreams to interrogate or induce permanent coma.' },
      { seq: 6, name: 'Soul Assurer', desc: 'Pacifies lingering wraiths, dispels curses and malevolence.' },
      { seq: 5, name: 'Spirit Warlock', desc: 'Commands nocturnal beasts and high-tier spirit helpers.' },
      { seq: 4, name: 'Nightwatcher', desc: 'Demigod rank. Envelops battlefield in night, conceptual silence.' },
      { seq: 3, name: 'Horror Bishop', desc: 'Erects sanctuaries of silent horror.' },
      { seq: 2, name: 'Servant of Concealment', desc: 'Conceals historical traces and physical existence.' },
      { seq: 1, name: 'Knight of Misfortune', desc: 'Dictates catastrophic misfortune upon enemy bloodlines.' },
      { seq: 0, name: 'Darkness', desc: 'True Deity. Serene repose, silence, and nocturnal peace.' }
    ]
  }
];

export default function Pathways() {
  const { user, socket } = useApp();
  const [activeTab, setActiveTab] = useState('CODEX');
  const [selectedPathway, setSelectedPathway] = useState(ALL_PATHWAYS[0]);
  const [researchEntries, setResearchEntries] = useState([]);
  const [researchModal, setResearchModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formPathway, setFormPathway] = useState('Fool');
  const [formSeq, setFormSeq] = useState(7);
  const [formName, setFormName] = useState('');
  const [formMain, setFormMain] = useState('');
  const [formSupp, setFormSupp] = useState('');
  const [formActing, setFormActing] = useState('');
  const [formRitual, setFormRitual] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadResearch = async () => {
    try {
      const data = await api.getResearch();
      setResearchEntries(data);
    } catch (err) {
      toast.error('Failed to load potion research: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResearch();
  }, []);

  useEffect(() => {
    const unsub = socket.on('RESEARCH_ENTRY_CREATED', () => loadResearch());
    return () => unsub();
  }, [socket]);

  const handleCreateResearch = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formMain.trim() || !formActing.trim()) {
      return toast.error('Potion name, main ingredients, and acting method are required.');
    }
    setSubmitting(true);
    try {
      await api.createResearch({
        pathway: formPathway,
        sequence: formSeq,
        potionName: formName.trim(),
        mainIngredients: formMain.trim(),
        supplementary: formSupp.trim() || 'Pure water, regional spirit drops',
        actingMethod: formActing.trim(),
        advancingRitual: formRitual.trim() || undefined
      });
      toast.success('Potion research recorded into the Sacred Codex!');
      setResearchModal(false);
      setFormName('');
      setFormMain('');
      setFormSupp('');
      setFormActing('');
      setFormRitual('');
      loadResearch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bronze/40 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-gold font-bold">
            Pathway Codices & Potion Research
          </h1>
          <p className="text-xs text-bone/70 mt-1">
            Sequence 9 to Sequence 0 progressions, potion formulas, acting principles, and advancement rituals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded border border-bronze/50 overflow-hidden text-xs">
            <button
              onClick={() => setActiveTab('CODEX')}
              className={`px-3 py-1.5 font-display transition ${
                activeTab === 'CODEX'
                  ? 'bg-crimson/40 text-gold font-semibold'
                  : 'bg-void text-bone/60 hover:text-bone'
              }`}
            >
              22 Standard Pathways
            </button>
            <button
              onClick={() => setActiveTab('RESEARCH')}
              className={`px-3 py-1.5 font-display transition ${
                activeTab === 'RESEARCH'
                  ? 'bg-crimson/40 text-gold font-semibold'
                  : 'bg-void text-bone/60 hover:text-bone'
              }`}
            >
              Research Laboratory ({researchEntries.length})
            </button>
          </div>

          {activeTab === 'RESEARCH' && (
            <button
              onClick={() => setResearchModal(true)}
              className="btn flex items-center gap-1.5 bg-gold/15 text-gold border-gold"
            >
              <Plus size={14} />
              <span>Contribute Formula</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'CODEX' ? (
        /* Codex View */
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pathway Selector Sidebar */}
          <div className="panel p-3 space-y-1.5 h-[600px] overflow-y-auto custom-scrollbar">
            <span className="text-[10px] uppercase tracking-wider text-gold/80 font-display px-2 block mb-1">
              Select Pathway
            </span>
            {ALL_PATHWAYS.map(p => {
              const isSelected = selectedPathway.name === p.name;
              return (
                <div
                  key={p.name}
                  onClick={() => setSelectedPathway(p)}
                  className={`p-2.5 rounded cursor-pointer transition flex items-center justify-between border ${
                    isSelected
                      ? 'bg-gold/15 border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                      : 'bg-void/50 border-bronze/30 hover:border-gold/50'
                  }`}
                >
                  <div>
                    <h4 className="font-display text-xs font-bold text-gold">
                      {p.name} Pathway
                    </h4>
                    <p className="text-[10px] text-bone/50 truncate max-w-[180px]">
                      {p.god}
                    </p>
                  </div>
                  <ChevronRight size={13} className={isSelected ? 'text-gold' : 'text-bone/40'} />
                </div>
              );
            })}
          </div>

          {/* Sequences Progression Display */}
          <div className="lg:col-span-2 panel p-6 h-[600px] overflow-y-auto custom-scrollbar space-y-4">
            <div className="border-b border-bronze/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: selectedPathway.color }} />
                <h2 className="text-xl font-display text-gold font-bold">
                  {selectedPathway.name} Pathway
                </h2>
              </div>
              <p className="text-xs text-bone/70 mt-1 leading-relaxed">
                {selectedPathway.desc}
              </p>
              <span className="text-[10px] text-gold font-mono block mt-1">
                Deity: {selectedPathway.god}
              </span>
            </div>

            {/* Sequence 9 to 0 Progression List */}
            <div className="space-y-2.5">
              {selectedPathway.sequences.map((s) => (
                <div
                  key={s.seq}
                  className="p-3 rounded border border-bronze/30 bg-void/70 hover:border-gold/60 transition flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded border border-gold/50 bg-bronze/30 flex items-center justify-center font-display text-gold text-xs shrink-0 font-bold">
                    {s.seq}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-xs text-gold font-bold">
                        Sequence {s.seq}: {s.name}
                      </h4>
                      <span className="text-[9px] text-bone/40 uppercase">
                        {s.seq <= 4 ? (s.seq === 0 ? 'True God' : s.seq <= 2 ? 'Angel' : 'Demigod') : 'Mortal'}
                      </span>
                    </div>
                    <p className="text-bone/80 text-[11px] mt-1 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Research Laboratory View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {researchEntries.map(r => (
            <div
              key={r.id}
              className="panel flex flex-col justify-between bg-gradient-to-br from-fog/70 to-void border-bronze/50"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-display text-gold uppercase text-[10px] tracking-wider">
                    {r.pathway} · Sequence {r.sequence}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded border border-gold/40 text-gold bg-gold/10 uppercase">
                    {r.status}
                  </span>
                </div>

                <h3 className="font-display text-base text-gold font-bold">
                  {r.potionName} Formula
                </h3>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2 rounded bg-void/60 border border-bronze/30">
                    <span className="text-gold font-display text-[10px] block">
                      Main Ingredients:
                    </span>
                    <p className="text-bone/80 text-[11px] font-mono leading-relaxed">
                      {r.mainIngredients}
                    </p>
                  </div>

                  <div className="p-2 rounded bg-void/60 border border-bronze/30">
                    <span className="text-gold font-display text-[10px] block">
                      Acting Method Principles:
                    </span>
                    <p className="text-bone/80 text-[11px] font-serif leading-relaxed line-clamp-3">
                      {r.actingMethod}
                    </p>
                  </div>

                  {r.advancingRitual && (
                    <div className="p-2 rounded bg-void/60 border border-gold/30">
                      <span className="text-gold font-display text-[10px] block">
                        Advancing Ritual:
                      </span>
                      <p className="text-bone/80 text-[11px] font-serif leading-relaxed line-clamp-2">
                        {r.advancingRitual}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-bronze/30 text-[10px] text-bone/50 flex justify-between">
                <span>By {r.author?.profile?.codename || 'Alchemist'}</span>
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contribute Research Modal */}
      <Modal
        open={researchModal}
        onClose={() => setResearchModal(false)}
        title="Inscribe Potion Codex Formula"
      >
        <form onSubmit={handleCreateResearch} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-bone/70 mb-1">Pathway</label>
              <select
                className="inp"
                value={formPathway}
                onChange={e => setFormPathway(e.target.value)}
              >
                {ALL_PATHWAYS.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-bone/70 mb-1">Sequence (0-9)</label>
              <input
                type="number"
                min={0}
                max={9}
                className="inp"
                value={formSeq}
                onChange={e => setFormSeq(+e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Potion Sequence Name</label>
            <input
              className="inp"
              required
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Faceless"
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Main Extraordinary Ingredients</label>
            <textarea
              className="inp h-16 font-mono text-[11px]"
              required
              value={formMain}
              onChange={e => setFormMain(e.target.value)}
              placeholder="e.g. Complete facial skin of a Thousand-faced Hunter, mutated pituitary gland of a Shadow Panther."
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Acting Method Principles</label>
            <textarea
              className="inp h-20 font-serif text-xs"
              required
              value={formActing}
              onChange={e => setFormActing(e.target.value)}
              placeholder="Inscribe the core psychological acting guidelines to digest the characteristic and prevent loss of control..."
            />
          </div>

          <div>
            <label className="block text-bone/70 mb-1">Advancing Ritual (Optional)</label>
            <textarea
              className="inp h-16 font-serif text-xs"
              value={formRitual}
              onChange={e => setFormRitual(e.target.value)}
              placeholder="Detail the ritual conditions required to stabilize potion digestion during advancement..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResearchModal(false)}
              className="btn text-bone/60 hover:text-bone"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn flex items-center gap-1.5"
            >
              <FlaskConical size={13} />
              <span>{submitting ? 'Inscribing...' : 'Seal in Codex'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
