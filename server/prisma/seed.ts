import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
];

const PERSONAS = [
  'The Fool', 'The World', 'Justice', 'The Hanged Man', 'The Sun',
  'The Magician', 'The Moon', 'The Star', 'The Hermit', 'Judgement'
];

interface MemberSeed {
  username: string;
  codename: string;
  pathway: string;
  sequence: number;
  region: string;
  bio: string;
  specialization: string;
  avatarCard: string;
  reputation: number;
  contributions: number;
  seatId: number;
}

const MEMBERS: MemberSeed[] = [
  {
    username: 'klein',
    codename: 'The Fool',
    pathway: 'Fool',
    sequence: 5,
    region: 'Backlund',
    bio: 'Leader of the Tarot Club, cloaked in gray fog above the Sefirah Castle. Wielder of Spirit Body Threads and seeker of transmigration mysteries.',
    specialization: 'Divination, Puppetry, Spirit Body Control',
    avatarCard: 'The Fool',
    reputation: 999,
    contributions: 750,
    seatId: 0
  },
  {
    username: 'audrey',
    codename: 'Justice',
    pathway: 'Spectator',
    sequence: 7,
    region: 'Backlund',
    bio: 'Noble daughter of Earl Hall. Observes the emotional currents of high society and heals mental fractures with soothing telepathy.',
    specialization: 'Psychological Analysis, Telepathy, Soothing',
    avatarCard: 'Justice',
    reputation: 420,
    contributions: 280,
    seatId: 11
  },
  {
    username: 'alger',
    codename: 'The Hanged Man',
    pathway: 'Sailor',
    sequence: 6,
    region: 'Rorsted Archipelago',
    bio: 'Captain of the Blue Avenger. Experienced maritime Beyonder with profound knowledge of ancient pirate lore and Church secrets.',
    specialization: 'Maritime Navigation, Weather Control, Naval Warfare',
    avatarCard: 'The Hanged Man',
    reputation: 480,
    contributions: 340,
    seatId: 12
  },
  {
    username: 'derrick',
    codename: 'The Sun',
    pathway: 'Sun',
    sequence: 7,
    region: 'City of Silver',
    bio: 'Young guardian from the cursed City of Silver surrounded by perpetual darkness. Dedicated to bringing radiant daylight back to his people.',
    specialization: 'Holy Light, Anti-Corruption, Demon Banishing',
    avatarCard: 'The Sun',
    reputation: 360,
    contributions: 220,
    seatId: 19
  },
  {
    username: 'fors',
    codename: 'The Magician',
    pathway: 'Door',
    sequence: 7,
    region: 'Backlund',
    bio: 'Acclaimed author and traveler of spirit coordinates. Excels in escaping perilous predicaments and unlocking warded spaces.',
    specialization: 'Astrology, Spatial Shifting, Lock Picking',
    avatarCard: 'The Magician',
    reputation: 310,
    contributions: 190,
    seatId: 1
  },
  {
    username: 'emlyn',
    codename: 'The Moon',
    pathway: 'Moon',
    sequence: 7,
    region: 'Backlund',
    bio: 'Noble Sanguine apothecary fond of antique ceramic dolls. Bound by destiny and the Mother Church to combat mutant abominations.',
    specialization: 'Herbal Potions, Sanguine Claws, Beast Pacification',
    avatarCard: 'The Moon',
    reputation: 290,
    contributions: 160,
    seatId: 18
  },
  {
    username: 'leonard',
    codename: 'The Star',
    pathway: 'Darkness',
    sequence: 7,
    region: 'Backlund',
    bio: 'Poetic Red Glove officer in the Church of Evernight. Walks within the dreams of suspects while harboring an ancient entity.',
    specialization: 'Dream Intrusion, Pacification, Spiritual Slumber',
    avatarCard: 'The Star',
    reputation: 330,
    contributions: 210,
    seatId: 17
  },
  {
    username: 'xio',
    codename: 'Judgement',
    pathway: 'Arbiter',
    sequence: 7,
    region: 'Backlund',
    bio: 'Bounty hunter and protector of order in East Borough. Imposes strict discipline and executes justice with decisive force.',
    specialization: 'Aura of Law, Psychic Piercing, Interrogation',
    avatarCard: 'Judgement',
    reputation: 310,
    contributions: 170,
    seatId: 20
  }
];

async function main() {
  console.log('--- Initializing Tarot Club Seed Data ---');
  const demoPw = process.env.DEMO_PASSWORD || 'dev-only-change-me';
  const hash = await bcrypt.hash(demoPw, 10);

  // 1. Arcana Seats
  for (let i = 0; i < 22; i++) {
    await db.tarotSeat.upsert({
      where: { id: i },
      update: { title: ARCANA[i] },
      create: { id: i, title: ARCANA[i], isSpeaking: false, handRaised: false }
    });
  }
  console.log('Created 22 Tarot Seats.');

  // 2. Personas
  for (const name of PERSONAS) {
    await db.persona.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  const allPersonas = await db.persona.findMany();

  // 3. Members & Profiles
  const userMap: Record<string, string> = {};
  for (const m of MEMBERS) {
    const user = await db.user.upsert({
      where: { username: m.username },
      update: {
        role: m.username === 'klein' ? 'ADMIN' : 'MEMBER'
      },
      create: {
        username: m.username,
        passwordHash: hash,
        role: m.username === 'klein' ? 'ADMIN' : 'MEMBER'
      }
    });
    userMap[m.username] = user.id;

    await db.memberProfile.upsert({
      where: { userId: user.id },
      update: {
        codename: m.codename,
        pathway: m.pathway,
        sequence: m.sequence,
        region: m.region,
        bio: m.bio,
        specialization: m.specialization,
        avatarCard: m.avatarCard,
        reputation: m.reputation,
        contributions: m.contributions
      },
      create: {
        userId: user.id,
        codename: m.codename,
        pathway: m.pathway,
        sequence: m.sequence,
        region: m.region,
        bio: m.bio,
        specialization: m.specialization,
        avatarCard: m.avatarCard,
        reputation: m.reputation,
        contributions: m.contributions,
        gatheringsAttended: 12
      }
    });

    // Seat allocation
    await db.tarotSeat.update({
      where: { id: m.seatId },
      data: { occupantId: user.id }
    });

    // Personas link
    for (const p of allPersonas.slice(0, 4)) {
      await db.userPersona.upsert({
        where: { userId_personaId: { userId: user.id, personaId: p.id } },
        update: {},
        create: { userId: user.id, personaId: p.id }
      });
    }
  }
  console.log('Created Members & Assigned Seats.');

  const kleinId = userMap['klein'];
  const audreyId = userMap['audrey'];
  const algerId = userMap['alger'];
  const derrickId = userMap['derrick'];
  const forsId = userMap['fors'];

  // 4. Gatherings
  const existingGatherings = await db.gathering.count();
  let currentGatheringId = '';
  if (existingGatherings === 0) {
    const g1 = await db.gathering.create({
      data: {
        title: 'The 42nd Assembly Above the Gray Fog',
        description: 'Scheduled gathering to deliberate on the King of the Five Seas movements and recent Sanguine anomalies in Trier.',
        theme: 'Maritime Warfare & Ancient Bloodlines',
        hostId: kleinId,
        status: 'COMPLETED',
        scheduledAt: new Date(Date.now() - 7 * 864e5),
        endedAt: new Date(Date.now() - 7 * 864e5 + 7200e3),
        agenda: JSON.stringify([
          'Exchange of maritime intelligence regarding Admiral Hell',
          'Miss Audrey requests psychological counseling data',
          'Mr. Sun delivers ancient giant language tablets',
          'Blessing and artifact appraisal by Mr. Fool'
        ]),
        minutes: 'All members attended in spirit projection. Mr. Hanged Man shared reports of strange sea monsters off the coast of the Bansy Harbor. Miss Justice provided mental fortifying formulas.'
      }
    });

    const g2 = await db.gathering.create({
      data: {
        title: 'The 43rd Assembly: Shadows of Backlund',
        description: 'Emergency convocation called to address the spreading corruption in East Borough and suspicious Aurora Order rituals.',
        theme: 'East Borough Investigation & Sealed Artifact Tracking',
        hostId: kleinId,
        status: 'IN_PROGRESS',
        scheduledAt: new Date(Date.now() - 1800e3),
        agenda: JSON.stringify([
          'Formal seating & prayer transmission',
          'Report on East Borough miasma and mysterious cult altars',
          'Bidding on Grade 2 Sealed Artifact "Bronze Compass of Misfortune"',
          'Discussion on Sequence 6 advancement formulas'
        ]),
        minutes: 'Assembly is currently open. The gray fog responds favorably to peaceful discussion.'
      }
    });
    currentGatheringId = g2.id;

    await db.gathering.create({
      data: {
        title: 'The 44th Assembly: Solstice Astral Mapping',
        description: 'Upcoming assembly coinciding with the blood moon to map astral projection coordinates in the spirit world.',
        theme: 'Spirit World Coordinates & Moon Anomaly',
        hostId: kleinId,
        status: 'UPCOMING',
        scheduledAt: new Date(Date.now() + 3 * 864e5),
        agenda: JSON.stringify([
          'Review of coordinates recorded by Miss Magician',
          'Verification of sun holy water reserves by Mr. Sun',
          'Exchange of Fourth Epoch historical records'
        ])
      }
    });

    // RSVPs for g2
    for (const uid of [kleinId, audreyId, algerId, derrickId, forsId]) {
      await db.gatheringParticipant.create({
        data: {
          gatheringId: g2.id,
          userId: uid,
          rsvpStatus: 'ATTENDING',
          attended: true
        }
      });
    }
  }

  // 5. Table Messages (Public gathering discussions)
  if (await db.tableMessage.count() === 0) {
    const msgs = [
      { authorId: kleinId, body: 'Welcome, members of the Tarot Club. Let us commence the discussion on recent anomalies in Backlund.', isAnnouncement: true },
      { authorId: audreyId, body: 'Good afternoon, Mr. Fool, and esteemed members! I recently overheard high nobles speaking of strange tremors beneath the Empress Borough.' },
      { authorId: algerId, body: 'The Church of the Lord of Storms has reinforced maritime escorts near Pritz Harbor. Several merchant fleets reported ghost ships with black sails.' },
      { authorId: derrickId, body: 'In the City of Silver, the exploratory team discovered an abandoned temple with upside-down cross carvings. Could this be related to the Fallen Creator?' },
      { authorId: forsId, body: 'I noticed an unusual rise in rogue Beyonders purchasing divination mirrors in the Backlund underground markets.' }
    ];
    for (const m of msgs) {
      await db.tableMessage.create({
        data: {
          ...m,
          gatheringId: currentGatheringId || undefined
        }
      });
    }
  }

  // 6. Artifacts
  if (await db.artifact.count() === 0) {
    const artifacts = [
      {
        name: '0-08: Quill of Alzuhod',
        grade: 0,
        description: 'An ancient ordinary-looking feather quill with an ivory-tinted nib. Whatever story it pens becomes inevitable reality.',
        abilities: 'Subtly alters causal lines and twists probabilities to guide individuals toward written deaths or tragedies.',
        negativeEffects: 'Plots the horrific death of its current wielder and surrounding living beings at every opportunity.',
        containmentProcedure: 'Sealed within three layers of pure silver cases submerged in consecrated holy water under high-sequence concealment.',
        drainRate: 4.8,
        discoveryRecord: 'Recovered from the ruins of the Fourth Epoch Antigonus family ancestral catacombs.'
      },
      {
        name: '0-17: Angel of Concealment',
        grade: 0,
        description: 'A dark slate statue carved into an eight-winged seraph with eyes draped in obsidian silk.',
        abilities: 'Envelops an entire city in total conceptual concealment, erasing it from divination and external memory.',
        negativeEffects: 'Gradually causes anyone within its radius to forget their own identity, names, and memories.',
        containmentProcedure: 'Housed in the deepest cathedrals of the Church of Evernight with continuous silent prayer.',
        drainRate: 5.5,
        discoveryRecord: 'Found during the Cataclysm era beneath the Hornacis mountain range.'
      },
      {
        name: '1-42: Armor of the Undying',
        grade: 1,
        description: 'Heavy obsidian plate armor adorned with blackened feather carvings that murmur death incantations.',
        abilities: 'Grants the wearer immunity to physical damage and high-tier dark spiritual assaults.',
        negativeEffects: 'Slowly petrifies the wearer’s flesh into cold corpse marrow over 45 minutes of usage.',
        containmentProcedure: 'Stored in a salt-lined sarcophagus guarded by two Sequence 5 Beyonders.',
        drainRate: 2.4,
        discoveryRecord: 'Excavated from a Fourth Epoch Balam Empire imperial tomb.'
      },
      {
        name: '2-111: Bronze Compass of Misfortune',
        grade: 2,
        description: 'A tarnished bronze navigational compass whose needle spins erratically.',
        abilities: 'Always points directly toward the nearest Beyonder currently suffering from impending loss of control.',
        negativeEffects: 'Inflicts mild bouts of bad luck upon anyone who holds it for longer than ten minutes.',
        containmentProcedure: 'Wrapped in red velvet and stored in an iron lockbox.',
        drainRate: 1.2,
        discoveryRecord: 'Acquired from a pirate captain in the Bayam archipelago.'
      },
      {
        name: '2-073: Crimson Candle of Soul-Summoning',
        grade: 2,
        description: 'A deep crimson beeswax candle that emits a smell of withered lilies.',
        abilities: 'When lit, permits direct telepathic discourse with lingering spirit remnants within 100 paces.',
        negativeEffects: 'Attracts malicious evil spirits from the spirit world who seek to extinguish the flame and take over the body.',
        containmentProcedure: 'Must remain unlit and shielded in a lead-lined pouch.',
        drainRate: 0.9,
        discoveryRecord: 'Found in the attic of a deceased Backlund medium.'
      },
      {
        name: '3-045: Silent Lantern',
        grade: 3,
        description: 'A frosted brass lantern emitting a gentle pale-green glow.',
        abilities: 'Absorbs all acoustic vibrations within a 30-foot sphere, making every step and incantation completely soundless.',
        negativeEffects: 'Causes the bearer to feel a gentle drowsiness and mild ringing in the ears after an hour.',
        containmentProcedure: 'Extinguish and cover with a dark linen cloth.',
        drainRate: 0.4,
        discoveryRecord: 'Donated by an anonymous informant in Tingen.'
      },
      {
        name: '3-128: Truth Mirror',
        grade: 3,
        description: 'A pocket silver mirror adorned with vine reliefs.',
        abilities: 'Answers three questions accurately with glowing silver script upon the glass surface.',
        negativeEffects: 'Demands the querent reveal an embarrassing personal secret before each query, or suffers a painful electric shock.',
        containmentProcedure: 'Kept face-down inside an opaque wooden case.',
        drainRate: 0.3,
        discoveryRecord: 'Purchased at an underground occult auction in Backlund.'
      }
    ];

    for (const a of artifacts) {
      await db.artifact.create({ data: a });
    }
    console.log('Created Sealed Artifacts.');
  }

  // 7. Intelligence Exchange
  if (await db.intelligencePost.count() === 0) {
    const p1 = await db.intelligencePost.create({
      data: {
        authorId: audreyId,
        title: 'Aurora Order gathering discovered in Backlund East Borough',
        body: 'Through reliable sources in charitable relief missions, multiple cloaked figures preaching the descent of the True Creator have gathered at Iron Gate Street. They are stockpiling sacrificial candles and volatile spirit components.',
        category: 'CULT',
        verificationStatus: 'VERIFIED',
        sequenceRequired: 8,
        tags: 'Aurora Order, Backlund, East Borough, True Creator'
      }
    });

    const p2 = await db.intelligencePost.create({
      data: {
        authorId: algerId,
        title: 'Complete formula & ritual for Sequence 6 Wind-blessed verified',
        body: 'Main ingredients: Pair of Windstorm Harpy wings, Eyeball of a Deep-sea Giant Eel. Supplementary ingredients: 50ml pure spring water, 5g dried sea lavender. Advancing ritual: Ingest the potion amidst a raging ocean storm while remaining anchored to the ship helm.',
        category: 'FORMULA',
        verificationStatus: 'VERIFIED',
        sequenceRequired: 7,
        tags: 'Sailor Pathway, Sequence 6, Wind-blessed, Potion Formula'
      }
    });

    const p3 = await db.intelligencePost.create({
      data: {
        authorId: derrickId,
        title: 'Ancient giant king court murals depicting the Second Epoch',
        body: 'During our vanguard patrol in the north darkness, we discovered frescoes depicting the Eight Ancient Gods. The Dragon of Imagination Ankewelt was portrayed with feathered wings extending into ethereal silver threads.',
        category: 'HISTORY',
        verificationStatus: 'VERIFIED',
        sequenceRequired: 9,
        tags: 'City of Silver, Ancient History, Second Epoch, Dragon of Imagination'
      }
    });

    // Add comments & reactions
    await db.intelligenceComment.create({
      data: {
        postId: p1.id,
        authorId: algerId,
        content: 'I have heard of their activities. They are likely seeking to conduct a blood sacrifice ritual before the next full moon.'
      }
    });

    await db.intelligenceComment.create({
      data: {
        postId: p1.id,
        authorId: forsId,
        content: 'I live nearby and will take extra precautions when traversing that neighborhood at night.'
      }
    });

    await db.intelligenceReaction.create({
      data: { postId: p1.id, userId: kleinId, type: 'CONFIRM' }
    });
    await db.intelligenceReaction.create({
      data: { postId: p1.id, userId: algerId, type: 'ENLIGHTENING' }
    });
  }

  // 8. Commissions
  if (await db.commission.count() === 0) {
    await db.commission.create({
      data: {
        creatorId: audreyId,
        claimerId: algerId,
        title: 'Investigate Corrupt Smog Traces in Backlund Factories',
        description: 'An anomalous toxic residue mixed with dark occult essence has contaminated factory districts. We need soil and atmospheric samples collected without alerting the local police or Church of the Lord of Storms.',
        objectives: JSON.stringify([
          'Collect soil samples near factory chimneys',
          'Identify the occult ritual sigils painted on drainage canals',
          'Report back findings during next Tarot Club assembly'
        ]),
        reward: 350,
        danger: 6,
        hazardRank: 7,
        status: 'ACTIVE',
        progress: 45,
        deadline: new Date(Date.now() + 5 * 864e5),
        collaborators: JSON.stringify(['Fors Wall', 'Xio Derecha'])
      }
    });

    await db.commission.create({
      data: {
        creatorId: derrickId,
        claimerId: null,
        title: 'Procure Radiant Sun Holy Water & Purification Charms',
        description: 'The exploratory team in the City of Silver faces encroaching shadow wraiths. We require high-purity solar holy water and sun amulets to reinforce the northern outpost watchtowers.',
        objectives: JSON.stringify([
          'Craft three high-grade Sun Pathway purification talismans',
          'Sanctify 200ml holy water using the Sun ritual method',
          'Transmit materials via Sefirah sacrificial gate'
        ]),
        reward: 500,
        danger: 4,
        hazardRank: 8,
        status: 'OPEN',
        progress: 0,
        deadline: new Date(Date.now() + 8 * 864e5)
      }
    });

    await db.commission.create({
      data: {
        creatorId: algerId,
        claimerId: kleinId,
        title: 'Acquire Information on Pirate Admiral Hell',
        description: 'Investigate the hidden alliances between Admiral Hell and the Rose School of Thought along the maritime shipping routes.',
        objectives: JSON.stringify([
          'Track ship manifests in Pritz Harbor',
          'Interrogate smuggler contacts in Bayam',
          'Verify if wraiths are employed as underwater scouts'
        ]),
        reward: 400,
        danger: 7,
        hazardRank: 6,
        status: 'COMPLETED',
        progress: 100,
        completionReport: 'Investigation verified Admiral Hell’s contact with the indulgence faction. Coordinates and cargo manifests delivered to Mr. Hanged Man.'
      }
    });
  }

  // 9. Weekly Mysteries
  if (await db.weeklyMystery.count() === 0) {
    await db.weeklyMystery.create({
      data: {
        title: 'The Phantom of Saint George Bridge',
        clueText: 'Every midnight in Backlund, the clocktower strikes thirteen times. A black carriage with shrouded lanterns is spotted traversing Saint George Bridge, leaving icy sulfur puddles that do not evaporate. Those who gaze upon the driver experience intense despair and a compulsion to plunge into the river. Which creature of the Abyss pathway feeds on lingering suffering in this manner?',
        difficulty: 'ADEPT',
        rewardReputation: 45,
        rewardPounds: 250,
        solutionKeyword: 'Desire Apostle',
        explanation: 'A Desire Apostle manipulates emotional triggers and dark sulfurous miasma to feed upon despair and induce self-destruction.',
        status: 'ACTIVE',
        createdById: kleinId,
        expiresAt: new Date(Date.now() + 6 * 864e5)
      }
    });

    await db.weeklyMystery.create({
      data: {
        title: 'The Vanishing Astrologer of Pritz Harbor',
        clueText: 'An astrologer was found locked inside a sealed lighthouse tower. The windows were bolted from within with iron latches, and the door was barred with an antique brass deadlock. His garments remained neatly placed upon his writing desk, yet his body was gone, leaving only crystalline silver dust across the floorboards. Which Sequence 5 power was employed?',
        difficulty: 'MASTER',
        rewardReputation: 60,
        rewardPounds: 400,
        solutionKeyword: 'Traveler',
        explanation: 'A Sequence 5 Traveler of the Door Pathway can blink across the spirit world, bypassing physical enclosures while leaving faint astral residue.',
        status: 'ACTIVE',
        createdById: kleinId,
        expiresAt: new Date(Date.now() + 10 * 864e5)
      }
    });
  }

  // 10. Tarot Community Votes
  if (await db.tarotVote.count() === 0) {
    await db.tarotVote.create({
      data: {
        title: 'Establish a Physical Emergency Safehouse in Backlund West Borough',
        description: 'Should the Tarot Club pool resources to purchase an anonymous Victorian townhouse in West Borough as an emergency refuge for members in distress?',
        options: JSON.stringify([
          'Yes, allocate 600 Gold Pounds from common fund',
          'No, keep all interactions strictly above the gray fog',
          'Delegate Miss Justice to scout a covert rental instead'
        ]),
        createdById: kleinId,
        status: 'ACTIVE',
        closesAt: new Date(Date.now() + 4 * 864e5)
      }
    });
  }

  // 11. Potion Research
  if (await db.potionResearch.count() === 0) {
    await db.potionResearch.create({
      data: {
        authorId: kleinId,
        pathway: 'Fool',
        sequence: 7,
        potionName: 'Magician',
        mainIngredients: 'Rainbow Salamander pituitary gland, Single horn of a Pure white Pegasus.',
        supplementary: '30ml pure water, 3 drops of rose essential oil, 5g black peony powder.',
        actingMethod: 'Perform on a grand stage or before an unsuspecting audience. Amaze and deceive without revealing true mystical mechanisms. Accept applause while remaining aloof.',
        advancingRitual: 'Perform a magnificent mystical illusion before no fewer than three hundred spectators without being discovered.',
        status: 'VERIFIED'
      }
    });

    await db.potionResearch.create({
      data: {
        authorId: audreyId,
        pathway: 'Spectator',
        sequence: 7,
        potionName: 'Psychiatrist',
        mainIngredients: 'Complete brain of a Multi-colored Shadow Lizard, Pituitary gland of a Hypnotic Silver Fox.',
        supplementary: '10g dried chamomile, 15ml white birch sap, 2 drops of lavender dew.',
        actingMethod: 'Listen attentively to patients’ anxieties and deepest phobias. Analyze mental patterns objectively without emotional entanglement. Soothe fractured psyches while observing human nature.',
        advancingRitual: 'Successfully treat and placate an individual on the brink of losing control.',
        status: 'VERIFIED'
      }
    });
  }

  // 12. Achievements
  const achievements = [
    { code: 'ABOVE_FOG', title: 'Above the Gray Fog', description: 'Crossed the boundary into the Sefirah Castle and entered the sacred hall.', icon: 'CloudFog', category: 'EXPLORATION', points: 15 },
    { code: 'TAKE_SEAT', title: 'Major Arcana Seat', description: 'Occupied one of the 22 consecrated seats at the Long Bronze Table.', icon: 'Armchair', category: 'SOCIAL', points: 20 },
    { code: 'RAISE_HAND', title: 'Seeker of Wisdom', description: 'Raised your hand and requested permission to address the council.', icon: 'Hand', category: 'SOCIAL', points: 10 },
    { code: 'SHARE_INTEL', title: 'Whisperer of Secrets', description: 'Published a piece of intelligence to the club repository.', icon: 'ScrollText', category: 'OCCULT', points: 25 },
    { code: 'CLAIM_COMMISSION', title: 'Operative of the Club', description: 'Accepted an active commission on behalf of a fellow member.', icon: 'ShieldAlert', category: 'OCCULT', points: 30 },
    { code: 'SOLVE_MYSTERY', title: 'Master of Deduction', description: 'Successfully deciphered a weekly mystery presented to the assembly.', icon: 'Search', category: 'MYSTERY', points: 50 },
    { code: 'PROJECTION_MASTERY', title: 'Fog of History', description: 'Reached into the gray fog and summoned an echo of an ancient artifact.', icon: 'Sparkles', category: 'EXPLORATION', points: 20 },
    { code: 'POTION_SCHOLAR', title: 'Codex Alchemist', description: 'Contributed verified potion research to the alchemical laboratory.', icon: 'FlaskConical', category: 'OCCULT', points: 35 }
  ];

  for (const a of achievements) {
    const ach = await db.achievement.upsert({
      where: { code: a.code },
      update: a,
      create: a
    });

    // grant first achievement to Klein & Audrey
    for (const uid of [kleinId, audreyId]) {
      await db.userAchievement.upsert({
        where: { userId_achievementId: { userId: uid, achievementId: ach.id } },
        update: {},
        create: { userId: uid, achievementId: ach.id }
      });
    }
  }

  console.log('--- Tarot Club Seed Complete ---');
  console.log('Demo members: klein, audrey, alger, derrick, fors, emlyn, leonard, xio');
  console.log('Password:', demoPw);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
}).finally(() => db.$disconnect());
