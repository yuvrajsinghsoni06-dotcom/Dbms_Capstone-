import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z, ZodError } from 'zod';
import { WebSocketServer, WebSocket } from 'ws';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';

const SECRET = process.env.JWT_SECRET || 'tarot_club_above_the_gray_fog_secret_key_1349';
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const PORT = +(process.env.PORT || 4000);
const db = new PrismaClient();

class HttpErr extends Error {
  constructor(public status: number, public code: string, msg: string) {
    super(msg);
  }
}

const A = (f: (q: Request, s: Response, n: NextFunction) => Promise<unknown>) =>
  (q: Request, s: Response, n: NextFunction) => f(q, s, n).catch(n);

// Realtime Hub
const conns = new Map<string, Set<WebSocket>>();

const envl = (type: string, payload: unknown) =>
  JSON.stringify({ id: randomUUID(), type, ts: new Date().toISOString(), payload });

const toAll = (t: string, p: unknown) => {
  const m = envl(t, p);
  conns.forEach(s => s.forEach(w => w.readyState === WebSocket.OPEN && w.send(m)));
};

const toUsers = (ids: string[], t: string, p: unknown) => {
  const m = envl(t, p);
  ids.forEach(i => conns.get(i)?.forEach(w => w.readyState === WebSocket.OPEN && w.send(m)));
};

const online = () => [...conns.keys()];

const notifyUser = async (userId: string, title: string, text: string, link?: string) => {
  try {
    const notif = await db.notification.create({
      data: { userId, title, text, link }
    });
    toUsers([userId], 'NOTIFICATION_RECEIVED', notif);
  } catch (err) {
    console.error('Failed to notify user:', err);
  }
};

const unlockAchievement = async (userId: string, code: string) => {
  try {
    const ach = await db.achievement.findUnique({ where: { code } });
    if (!ach) return;
    const existing = await db.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: ach.id } }
    });
    if (!existing) {
      await db.userAchievement.create({
        data: { userId, achievementId: ach.id }
      });
      await notifyUser(userId, 'Achievement Unlocked!', `You have earned "${ach.title}": ${ach.description}`);
      toUsers([userId], 'ACHIEVEMENT_UNLOCKED', { code, title: ach.title, points: ach.points });
    }
  } catch (err) {
    console.error('Achievement check failed:', err);
  }
};

// Express App
const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }),
  cors({
    origin: ORIGIN,
    credentials: true
  }),
  express.json({ limit: '50kb' }),
  cookieParser()
);

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 864e5
};

const auth = (q: Request, s: Response, n: NextFunction) => {
  try {
    const tok = q.cookies.token;
    if (!tok) throw new Error('Missing token');
    const dec = jwt.verify(tok, SECRET) as { sub: string };
    s.locals.uid = dec.sub;
    n();
  } catch {
    n(new HttpErr(401, 'UNAUTHENTICATED', 'Sign in required'));
  }
};

const me = (s: Response): string => s.locals.uid as string;

const limit = (max: number) =>
  rateLimit({
    windowMs: 6e4,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } }
  });

const profileOf = async (id: string) => {
  const p = await db.memberProfile.findUnique({ where: { userId: id } });
  if (!p) throw new HttpErr(403, 'NO_PROFILE', 'Member profile required');
  return p;
};

// --- AUTH & PROFILE ---
app.post('/api/auth/login', limit(20), A(async (q, s) => {
  const b = z.object({
    username: z.string().trim().min(2).max(40),
    password: z.string().min(1).max(100)
  }).parse(q.body);

  const u = await db.user.findUnique({
    where: { username: b.username },
    include: { profile: true }
  });

  if (!u || !(await bcrypt.compare(b.password, u.passwordHash))) {
    throw new HttpErr(401, 'BAD_CREDENTIALS', 'Invalid username or password');
  }

  unlockAchievement(u.id, 'ABOVE_FOG');

  s.cookie('token', jwt.sign({ sub: u.id }, SECRET, { expiresIn: '7d' }), cookieOpts).json({
    id: u.id,
    username: u.username,
    role: u.role,
    profile: u.profile
  });
}));

app.post('/api/auth/logout', (_q, s) => {
  s.clearCookie('token').json({ ok: true });
});

app.get('/api/auth/me', auth, A(async (_q, s) => {
  const id = me(s);
  const [u, p, per, seat, unreadCount] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id } }),
    db.memberProfile.findUnique({ where: { userId: id } }),
    db.userPersona.findMany({ where: { userId: id }, include: { persona: true } }),
    db.tarotSeat.findFirst({ where: { occupantId: id } }),
    db.notification.count({ where: { userId: id, readAt: null } })
  ]);

  s.json({
    id,
    username: u.username,
    role: u.role,
    profile: p,
    personas: per.map(x => x.persona),
    seat: seat ? { id: seat.id, title: seat.title, isSpeaking: seat.isSpeaking, handRaised: seat.handRaised } : null,
    unreadNotifications: unreadCount
  });
}));

app.put('/api/auth/profile', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    codename: z.string().trim().min(2).max(60).optional(),
    bio: z.string().trim().max(1000).optional(),
    specialization: z.string().trim().max(160).optional(),
    avatarCard: z.string().trim().max(60).optional(),
    statusMessage: z.string().trim().max(160).optional(),
    showPathway: z.boolean().optional(),
    showSequence: z.boolean().optional(),
    showRegion: z.boolean().optional(),
    isPublic: z.boolean().optional()
  }).parse(q.body);

  const updated = await db.memberProfile.update({
    where: { userId: id },
    data: b
  });

  toAll('MEMBER_PROFILE_UPDATED', { userId: id, profile: updated });
  s.json(updated);
}));

// --- MEMBERS DIRECTORY ---
const roster = async () => {
  const profiles = await db.memberProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          seat: { select: { id: true, title: true } }
        }
      }
    },
    orderBy: { sequence: 'asc' }
  });

  const activeOnline = new Set(online());
  return profiles.map(p => ({
    id: p.userId,
    username: p.user.username,
    codename: p.codename,
    pathway: p.showPathway ? p.pathway : 'Veiled',
    sequence: p.showSequence ? p.sequence : null,
    region: p.showRegion ? p.region : 'Hidden',
    bio: p.bio,
    specialization: p.specialization,
    avatarCard: p.avatarCard,
    reputation: p.reputation,
    contributions: p.contributions,
    gatheringsAttended: p.gatheringsAttended,
    isPublic: p.isPublic,
    statusMessage: p.statusMessage,
    seat: p.user.seat,
    online: activeOnline.has(p.userId)
  }));
};

app.get('/api/members', auth, A(async (_q, s) => {
  s.json(await roster());
}));

app.get('/api/members/:id', auth, A(async (q, s) => {
  const p = await db.memberProfile.findUnique({
    where: { userId: q.params.id },
    include: {
      user: {
        include: {
          seat: true,
          achievements: { include: { achievement: true } },
          hostedGatherings: { take: 5, orderBy: { scheduledAt: 'desc' } }
        }
      }
    }
  });
  if (!p) throw new HttpErr(404, 'NOT_FOUND', 'Member not found');
  s.json({
    ...p,
    online: conns.has(p.userId),
    achievements: p.user.achievements.map(a => a.achievement),
    seat: p.user.seat
  });
}));

// --- BRONZE TABLE & SEATS ---
app.get('/api/seats', auth, A(async (_q, s) => {
  const seats = await db.tarotSeat.findMany({
    orderBy: { id: 'asc' },
    include: {
      occupant: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              codename: true,
              pathway: true,
              sequence: true,
              avatarCard: true,
              specialization: true
            }
          }
        }
      }
    }
  });

  const activeOnline = new Set(online());
  s.json(seats.map(x => ({
    id: x.id,
    title: x.title,
    occupied: !!x.occupantId,
    isSpeaking: x.isSpeaking,
    handRaised: x.handRaised,
    occupant: x.occupant ? {
      id: x.occupant.id,
      username: x.occupant.username,
      codename: x.occupant.profile?.codename || x.occupant.username,
      pathway: x.occupant.profile?.pathway,
      sequence: x.occupant.profile?.sequence,
      avatarCard: x.occupant.profile?.avatarCard,
      specialization: x.occupant.profile?.specialization,
      online: activeOnline.has(x.occupant.id)
    } : null
  })));
}));

app.post('/api/seats/:id/take', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const seatId = +q.params.id;
  if (!(seatId >= 0 && seatId <= 21)) throw new HttpErr(400, 'BAD_SEAT', 'Seat must be 0-21');

  const res = await db.$transaction(async t => {
    await t.tarotSeat.updateMany({
      where: { occupantId: id },
      data: { occupantId: null, isSpeaking: false, handRaised: false }
    });
    return t.tarotSeat.updateMany({
      where: { id: seatId, occupantId: null },
      data: { occupantId: id, isSpeaking: false, handRaised: false }
    });
  });

  if (!res.count) throw new HttpErr(409, 'SEAT_TAKEN', 'That seat is already occupied');

  unlockAchievement(id, 'TAKE_SEAT');
  await db.auditLog.create({
    data: { actorId: id, action: 'CLAIM_SEAT', target: `Seat ${seatId}` }
  });

  toAll('TABLE_SEAT_UPDATED', { id: seatId, occupantId: id, isSpeaking: false, handRaised: false });
  s.json({ ok: true, seatId });
}));

app.post('/api/seats/leave', auth, A(async (_q, s) => {
  const id = me(s);
  const current = await db.tarotSeat.findFirst({ where: { occupantId: id } });
  if (current) {
    await db.tarotSeat.update({
      where: { id: current.id },
      data: { occupantId: null, isSpeaking: false, handRaised: false }
    });
    toAll('TABLE_SEAT_UPDATED', { id: current.id, occupantId: null, isSpeaking: false, handRaised: false });
  }
  s.json({ ok: true });
}));

app.post('/api/seats/status', auth, limit(30), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    isSpeaking: z.boolean().optional(),
    handRaised: z.boolean().optional()
  }).parse(q.body);

  const seat = await db.tarotSeat.findFirst({ where: { occupantId: id } });
  if (!seat) throw new HttpErr(400, 'NO_SEAT', 'You do not occupy a seat at the Bronze Table');

  const updated = await db.tarotSeat.update({
    where: { id: seat.id },
    data: b
  });

  if (b.handRaised) unlockAchievement(id, 'RAISE_HAND');

  toAll('TABLE_SEAT_UPDATED', {
    id: seat.id,
    occupantId: id,
    isSpeaking: updated.isSpeaking,
    handRaised: updated.handRaised
  });

  s.json(updated);
}));

app.post('/api/seats/moderate', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const u = await db.user.findUniqueOrThrow({ where: { id } });
  const mySeat = await db.tarotSeat.findFirst({ where: { occupantId: id } });
  const isHost = u.role === 'ADMIN' || mySeat?.id === 0; // Seat 0 is The Fool
  if (!isHost) throw new HttpErr(403, 'FORBIDDEN', 'Only the Host or The Fool may moderate the table');

  const b = z.object({
    seatId: z.number().int().min(0).max(21),
    action: z.enum(['CLEAR_SPEECH', 'LOWER_HAND', 'VACATE', 'GRANT_SPEECH'])
  }).parse(q.body);

  let updateData: Prisma.TarotSeatUpdateInput = {};
  if (b.action === 'CLEAR_SPEECH') updateData = { isSpeaking: false };
  if (b.action === 'LOWER_HAND') updateData = { handRaised: false };
  if (b.action === 'GRANT_SPEECH') updateData = { isSpeaking: true, handRaised: false };
  if (b.action === 'VACATE') updateData = { occupant: { disconnect: true }, isSpeaking: false, handRaised: false };

  const updated = await db.tarotSeat.update({
    where: { id: b.seatId },
    data: updateData
  });

  toAll('TABLE_SEAT_UPDATED', {
    id: b.seatId,
    occupantId: updated.occupantId,
    isSpeaking: updated.isSpeaking,
    handRaised: updated.handRaised
  });

  s.json({ ok: true, updated });
}));

// --- TABLE MESSAGES & CONVERSATIONS ---
app.get('/api/table-messages', auth, A(async (q, s) => {
  const gid = q.query.gatheringId as string | undefined;
  const messages = await db.tableMessage.findMany({
    where: gid ? { gatheringId: gid } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { codename: true, avatarCard: true, pathway: true, sequence: true } }
        }
      }
    }
  });

  s.json(messages.reverse().map(m => ({
    id: m.id,
    body: m.body,
    isAnnouncement: m.isAnnouncement,
    createdAt: m.createdAt,
    author: {
      id: m.author.id,
      username: m.author.username,
      codename: m.author.profile?.codename || m.author.username,
      avatarCard: m.author.profile?.avatarCard,
      pathway: m.author.profile?.pathway,
      sequence: m.author.profile?.sequence
    }
  })));
}));

app.post('/api/table-messages', auth, limit(40), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    body: z.string().trim().min(1).max(2000),
    gatheringId: z.string().optional(),
    isAnnouncement: z.boolean().optional()
  }).parse(q.body);

  const author = await db.user.findUniqueOrThrow({
    where: { id },
    include: { profile: true }
  });

  const msg = await db.tableMessage.create({
    data: {
      authorId: id,
      body: b.body,
      gatheringId: b.gatheringId,
      isAnnouncement: b.isAnnouncement && author.role === 'ADMIN'
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { codename: true, avatarCard: true, pathway: true, sequence: true } }
        }
      }
    }
  });

  const payload = {
    id: msg.id,
    body: msg.body,
    isAnnouncement: msg.isAnnouncement,
    createdAt: msg.createdAt,
    author: {
      id: author.id,
      username: author.username,
      codename: author.profile?.codename || author.username,
      avatarCard: author.profile?.avatarCard,
      pathway: author.profile?.pathway,
      sequence: author.profile?.sequence
    }
  };

  toAll('TABLE_MESSAGE_CREATED', payload);
  s.status(201).json(payload);
}));

// --- WHISPERS (PRIVATE MESSAGING) ---
app.get('/api/whispers', auth, A(async (_q, s) => {
  const id = me(s);
  const recent = await db.whisperMessage.findMany({
    where: { OR: [{ fromId: id }, { toId: id }] },
    orderBy: { createdAt: 'desc' },
    distinct: ['fromId', 'toId'],
    take: 30,
    include: {
      from: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true } } } },
      to: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true } } } }
    }
  });

  const partners = new Map<string, any>();
  recent.forEach(w => {
    const partner = w.fromId === id ? w.to : w.from;
    if (!partners.has(partner.id)) {
      partners.set(partner.id, {
        partnerId: partner.id,
        codename: partner.profile?.codename || partner.username,
        avatarCard: partner.profile?.avatarCard,
        lastMessage: w.body,
        lastAt: w.createdAt,
        unread: w.toId === id && !w.readAt
      });
    }
  });

  s.json([...partners.values()]);
}));

app.get('/api/whispers/:otherId', auth, A(async (q, s) => {
  const id = me(s), other = q.params.otherId;
  const msgs = await db.whisperMessage.findMany({
    where: {
      OR: [
        { fromId: id, toId: other },
        { fromId: other, toId: id }
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      from: { select: { profile: { select: { codename: true, avatarCard: true } } } }
    }
  });

  await db.whisperMessage.updateMany({
    where: { fromId: other, toId: id, readAt: null },
    data: { readAt: new Date() }
  });

  s.json(msgs);
}));

app.post('/api/whispers', auth, limit(30), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    toId: z.string(),
    body: z.string().trim().min(1).max(1000)
  }).parse(q.body);

  if (b.toId === id) throw new HttpErr(400, 'SELF', 'Cannot whisper to yourself');
  const target = await db.user.findUnique({ where: { id: b.toId } });
  if (!target) throw new HttpErr(404, 'NOT_FOUND', 'Recipient not found');

  const w = await db.whisperMessage.create({
    data: { fromId: id, toId: b.toId, body: b.body },
    include: {
      from: { select: { profile: { select: { codename: true, avatarCard: true } } } }
    }
  });

  toUsers([b.toId, id], 'WHISPER_RECEIVED', w);
  s.status(201).json(w);
}));

// --- GATHERINGS & EVENTS ---
app.get('/api/gatherings', auth, A(async (_q, s) => {
  const gatherings = await db.gathering.findMany({
    orderBy: { scheduledAt: 'desc' },
    take: 20,
    include: {
      host: { select: { id: true, username: true, profile: { select: { codename: true } } } },
      participants: {
        include: {
          user: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true } } } }
        }
      }
    }
  });

  s.json(gatherings.map(g => ({
    ...g,
    agenda: JSON.parse(g.agenda || '[]'),
    participantCount: g.participants.length
  })));
}));

app.get('/api/gatherings/:id', auth, A(async (q, s) => {
  const g = await db.gathering.findUnique({
    where: { id: q.params.id },
    include: {
      host: { select: { id: true, username: true, profile: { select: { codename: true } } } },
      participants: {
        include: {
          user: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true, pathway: true, sequence: true } } } }
        }
      }
    }
  });
  if (!g) throw new HttpErr(404, 'NOT_FOUND', 'Gathering not found');
  s.json({
    ...g,
    agenda: JSON.parse(g.agenda || '[]')
  });
}));

app.post('/api/gatherings', auth, limit(10), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().max(2000),
    theme: z.string().trim().max(100).default('Tarot Club Assembly'),
    scheduledAt: z.coerce.date(),
    agenda: z.array(z.string()).default([])
  }).parse(q.body);

  const gathering = await db.gathering.create({
    data: {
      title: b.title,
      description: b.description,
      theme: b.theme,
      scheduledAt: b.scheduledAt,
      agenda: JSON.stringify(b.agenda),
      hostId: id,
      status: 'UPCOMING'
    }
  });

  toAll('GATHERING_CREATED', gathering);
  s.status(201).json(gathering);
}));

app.put('/api/gatherings/:id', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    theme: z.string().optional(),
    description: z.string().optional(),
    agenda: z.array(z.string()).optional(),
    minutes: z.string().optional()
  }).parse(q.body);

  const gathering = await db.gathering.findUnique({ where: { id: q.params.id } });
  if (!gathering) throw new HttpErr(404, 'NOT_FOUND', 'Gathering not found');

  const u = await db.user.findUniqueOrThrow({ where: { id } });
  if (gathering.hostId !== id && u.role !== 'ADMIN') {
    throw new HttpErr(403, 'FORBIDDEN', 'Only the gathering host can edit this gathering');
  }

  const updated = await db.gathering.update({
    where: { id: q.params.id },
    data: {
      status: b.status,
      theme: b.theme,
      description: b.description,
      agenda: b.agenda ? JSON.stringify(b.agenda) : undefined,
      minutes: b.minutes,
      endedAt: b.status === 'COMPLETED' ? new Date() : undefined
    }
  });

  toAll('GATHERING_UPDATED', updated);
  s.json(updated);
}));

app.post('/api/gatherings/:id/rsvp', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    rsvpStatus: z.enum(['ATTENDING', 'TENTATIVE', 'DECLINED']),
    notes: z.string().max(200).optional()
  }).parse(q.body);

  const participant = await db.gatheringParticipant.upsert({
    where: { gatheringId_userId: { gatheringId: q.params.id, userId: id } },
    update: { rsvpStatus: b.rsvpStatus, notes: b.notes },
    create: { gatheringId: q.params.id, userId: id, rsvpStatus: b.rsvpStatus, notes: b.notes }
  });

  toAll('GATHERING_RSVP_UPDATED', participant);
  s.json(participant);
}));

// --- INTELLIGENCE EXCHANGE ---
app.get('/api/intelligence', auth, A(async (q, s) => {
  const category = q.query.category as string | undefined;
  const search = q.query.search as string | undefined;

  const posts = await db.intelligencePost.findMany({
    where: {
      category: category && category !== 'ALL' ? category : undefined,
      OR: search ? [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } }
      ] : undefined
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { codename: true, avatarCard: true, pathway: true, sequence: true } }
        }
      },
      _count: { select: { comments: true, reactions: true } },
      reactions: true
    }
  });

  s.json(posts);
}));

app.get('/api/intelligence/:id', auth, A(async (q, s) => {
  const post = await db.intelligencePost.findUnique({
    where: { id: q.params.id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { codename: true, avatarCard: true, pathway: true, sequence: true } }
        }
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: { select: { codename: true, avatarCard: true } }
            }
          }
        }
      },
      reactions: true
    }
  });
  if (!post) throw new HttpErr(404, 'NOT_FOUND', 'Post not found');
  s.json(post);
}));

app.post('/api/intelligence', auth, limit(15), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    title: z.string().trim().min(3).max(160),
    body: z.string().trim().min(10).max(4000),
    category: z.string().default('GENERAL'),
    sequenceRequired: z.number().int().min(0).max(9).default(9),
    tags: z.string().max(200).optional()
  }).parse(q.body);

  const post = await db.intelligencePost.create({
    data: {
      authorId: id,
      title: b.title,
      body: b.body,
      category: b.category,
      sequenceRequired: b.sequenceRequired,
      tags: b.tags
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { codename: true, avatarCard: true } }
        }
      }
    }
  });

  unlockAchievement(id, 'SHARE_INTEL');
  await db.memberProfile.update({
    where: { userId: id },
    data: { contributions: { increment: 15 }, reputation: { increment: 5 } }
  });

  toAll('INTELLIGENCE_POST_CREATED', post);
  s.status(201).json(post);
}));

app.post('/api/intelligence/:id/comments', auth, limit(30), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    content: z.string().trim().min(1).max(1000)
  }).parse(q.body);

  const comment = await db.intelligenceComment.create({
    data: {
      postId: q.params.id,
      authorId: id,
      content: b.content
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          profile: { select: { codename: true, avatarCard: true } }
        }
      }
    }
  });

  toAll('INTELLIGENCE_COMMENT_ADDED', { postId: q.params.id, comment });
  s.status(201).json(comment);
}));

app.post('/api/intelligence/:id/reactions', auth, limit(40), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    type: z.enum(['CONFIRM', 'SUSPICIOUS', 'ENLIGHTENING'])
  }).parse(q.body);

  const existing = await db.intelligenceReaction.findUnique({
    where: {
      postId_userId_type: { postId: q.params.id, userId: id, type: b.type }
    }
  });

  if (existing) {
    await db.intelligenceReaction.delete({ where: { id: existing.id } });
  } else {
    await db.intelligenceReaction.create({
      data: { postId: q.params.id, userId: id, type: b.type }
    });
  }

  const updatedReactions = await db.intelligenceReaction.findMany({
    where: { postId: q.params.id }
  });

  toAll('INTELLIGENCE_REACTION_UPDATED', { postId: q.params.id, reactions: updatedReactions });
  s.json(updatedReactions);
}));

app.put('/api/intelligence/:id/verify', auth, A(async (q, s) => {
  const id = me(s);
  const u = await db.user.findUniqueOrThrow({ where: { id } });
  if (u.role !== 'ADMIN') throw new HttpErr(403, 'FORBIDDEN', 'Only The Fool / Admin can verify intelligence');

  const b = z.object({
    status: z.enum(['UNVERIFIED', 'VERIFIED', 'DISPUTED'])
  }).parse(q.body);

  const updated = await db.intelligencePost.update({
    where: { id: q.params.id },
    data: { verificationStatus: b.status }
  });

  toAll('INTELLIGENCE_VERIFIED', updated);
  s.json(updated);
}));

// --- COMMISSIONS ---
app.get('/api/commissions', auth, A(async (q, s) => {
  const status = q.query.status as string | undefined;
  const commissions = await db.commission.findMany({
    where: status && status !== 'ALL' ? { status: status as any } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true } } } },
      claimer: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true } } } }
    }
  });

  s.json(commissions.map(c => ({
    ...c,
    objectives: JSON.parse(c.objectives || '[]'),
    collaborators: JSON.parse(c.collaborators || '[]')
  })));
}));

app.post('/api/commissions', auth, limit(15), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000),
    objectives: z.array(z.string()).min(1),
    reward: z.number().int().min(1).max(10000).default(50),
    danger: z.number().int().min(1).max(10).default(5),
    hazardRank: z.number().int().min(0).max(9).default(7),
    deadline: z.coerce.date().optional()
  }).parse(q.body);

  const c = await db.commission.create({
    data: {
      creatorId: id,
      title: b.title,
      description: b.description,
      objectives: JSON.stringify(b.objectives),
      reward: b.reward,
      danger: b.danger,
      hazardRank: b.hazardRank,
      deadline: b.deadline,
      status: 'OPEN',
      progress: 0
    },
    include: {
      creator: { select: { id: true, username: true, profile: { select: { codename: true } } } }
    }
  });

  toAll('COMMISSION_CREATED', c);
  s.status(201).json(c);
}));

app.post('/api/commissions/:id/claim', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const pr = await profileOf(id);

  const commission = await db.commission.findUnique({ where: { id: q.params.id } });
  if (!commission) throw new HttpErr(404, 'NOT_FOUND', 'Commission not found');
  if (commission.status !== 'OPEN') throw new HttpErr(409, 'ALREADY_CLAIMED', 'Commission is not open');

  if (pr.sequence > commission.hazardRank) {
    throw new HttpErr(
      403,
      'INSUFFICIENT_SEQUENCE',
      `Sequence rank insufficient! Requires Sequence ${commission.hazardRank} or higher (Current: Seq ${pr.sequence})`
    );
  }

  const updated = await db.commission.update({
    where: { id: q.params.id },
    data: {
      claimerId: id,
      status: 'ASSIGNED',
      progress: 10
    },
    include: {
      creator: { select: { id: true, profile: { select: { codename: true } } } },
      claimer: { select: { id: true, profile: { select: { codename: true } } } }
    }
  });

  unlockAchievement(id, 'CLAIM_COMMISSION');
  await notifyUser(commission.creatorId, 'Commission Claimed', `${pr.codename} has accepted your commission "${commission.title}"`);

  toAll('COMMISSION_UPDATED', updated);
  s.json(updated);
}));

app.put('/api/commissions/:id/progress', auth, limit(20), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    progress: z.number().int().min(0).max(100),
    status: z.enum(['ASSIGNED', 'ACTIVE', 'COMPLETED', 'FAILED']).optional(),
    completionReport: z.string().max(2000).optional()
  }).parse(q.body);

  const c = await db.commission.findUnique({ where: { id: q.params.id } });
  if (!c) throw new HttpErr(404, 'NOT_FOUND', 'Commission not found');
  if (c.claimerId !== id && c.creatorId !== id) throw new HttpErr(403, 'FORBIDDEN', 'Only claimer or creator can update progress');

  const newStatus = b.progress >= 100 ? 'COMPLETED' : (b.status || c.status);

  const updated = await db.commission.update({
    where: { id: q.params.id },
    data: {
      progress: b.progress,
      status: newStatus,
      completionReport: b.completionReport || c.completionReport
    },
    include: {
      claimer: { select: { id: true, profile: { select: { codename: true } } } }
    }
  });

  if (newStatus === 'COMPLETED' && c.status !== 'COMPLETED' && c.claimerId) {
    await db.memberProfile.update({
      where: { userId: c.claimerId },
      data: {
        contributions: { increment: c.reward },
        reputation: { increment: Math.round(c.reward / 10) }
      }
    });
  }

  toAll('COMMISSION_UPDATED', updated);
  s.json(updated);
}));

// --- ARTIFACTS & PROJECTIONS ---
app.get('/api/artifacts', auth, A(async (q, s) => {
  const f = z.object({
    grade: z.coerce.number().int().min(0).max(3).optional(),
    search: z.string().max(60).optional()
  }).parse(q.query);

  const artifacts = await db.artifact.findMany({
    where: {
      grade: f.grade,
      name: f.search ? { contains: f.search, mode: 'insensitive' } : undefined
    },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }]
  });

  s.json(artifacts);
}));

app.post('/api/projections', auth, limit(10), A(async (_q, s) => {
  const id = me(s);
  const n = await db.artifact.count({ where: { available: true } });
  if (!n) throw new HttpErr(503, 'NO_ARTIFACTS', 'No artifacts available to project from the fog');

  const a = await db.artifact.findFirstOrThrow({
    where: { available: true },
    skip: Math.floor(Math.random() * n)
  });

  const p = await db.projectionSession.create({
    data: {
      userId: id,
      artifactId: a.id,
      expiresAt: new Date(Date.now() + 60_000)
    },
    include: { artifact: true, user: { select: { profile: { select: { codename: true } } } } }
  });

  unlockAchievement(id, 'PROJECTION_MASTERY');
  toAll('PROJECTION_UPDATED', p);
  s.status(201).json(p);
}));

app.get('/api/projections/active', auth, A(async (_q, s) => {
  const active = await db.projectionSession.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { artifact: true, user: { select: { profile: { select: { codename: true } } } } }
  });
  s.json(active);
}));

// Sweep expired projections every 3 seconds
setInterval(async () => {
  try {
    const due = await db.projectionSession.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } }
    });
    for (const p of due) {
      const r = await db.projectionSession.updateMany({
        where: { id: p.id, status: 'ACTIVE' },
        data: { status: 'EXPIRED' }
      });
      if (r.count) toAll('PROJECTION_EXPIRED', { id: p.id });
    }
  } catch (e) {
    console.error('Projection sweep failed');
  }
}, 3000);

// --- POTION & PATHWAY RESEARCH LAB ---
app.get('/api/research', auth, A(async (q, s) => {
  const pathway = q.query.pathway as string | undefined;
  const entries = await db.potionResearch.findMany({
    where: pathway && pathway !== 'ALL' ? { pathway } : undefined,
    orderBy: [{ pathway: 'asc' }, { sequence: 'desc' }],
    include: {
      author: { select: { id: true, username: true, profile: { select: { codename: true, avatarCard: true } } } }
    }
  });
  s.json(entries);
}));

app.post('/api/research', auth, limit(15), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    pathway: z.string().trim().min(2),
    sequence: z.number().int().min(0).max(9),
    potionName: z.string().trim().min(2).max(100),
    mainIngredients: z.string().trim().min(5),
    supplementary: z.string().trim().min(5),
    actingMethod: z.string().trim().min(10),
    advancingRitual: z.string().trim().optional()
  }).parse(q.body);

  const entry = await db.potionResearch.create({
    data: {
      authorId: id,
      pathway: b.pathway,
      sequence: b.sequence,
      potionName: b.potionName,
      mainIngredients: b.mainIngredients,
      supplementary: b.supplementary,
      actingMethod: b.actingMethod,
      advancingRitual: b.advancingRitual,
      status: 'VERIFIED'
    },
    include: {
      author: { select: { profile: { select: { codename: true } } } }
    }
  });

  unlockAchievement(id, 'POTION_SCHOLAR');
  await db.memberProfile.update({
    where: { userId: id },
    data: { contributions: { increment: 20 }, reputation: { increment: 10 } }
  });

  toAll('RESEARCH_ENTRY_CREATED', entry);
  s.status(201).json(entry);
}));

// --- WEEKLY MYSTERIES ---
app.get('/api/mysteries', auth, A(async (_q, s) => {
  const id = me(s);
  const mysteries = await db.weeklyMystery.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      submissions: {
        where: { userId: id }
      }
    }
  });

  s.json(mysteries.map(m => ({
    id: m.id,
    title: m.title,
    clueText: m.clueText,
    difficulty: m.difficulty,
    rewardReputation: m.rewardReputation,
    rewardPounds: m.rewardPounds,
    status: m.status,
    expiresAt: m.expiresAt,
    userSolved: m.submissions.some(sub => sub.isCorrect),
    userSubmission: m.submissions[0] || null,
    explanation: m.submissions.some(sub => sub.isCorrect) || m.status === 'SOLVED' ? m.explanation : null
  })));
}));

app.post('/api/mysteries/:id/submit', auth, limit(10), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    deduction: z.string().trim().min(3).max(2000)
  }).parse(q.body);

  const mystery = await db.weeklyMystery.findUnique({ where: { id: q.params.id } });
  if (!mystery) throw new HttpErr(404, 'NOT_FOUND', 'Mystery not found');

  const normalizedInput = b.deduction.toLowerCase();
  const normalizedKeyword = mystery.solutionKeyword.toLowerCase();
  const isCorrect = normalizedInput.includes(normalizedKeyword);

  const submission = await db.mysterySubmission.create({
    data: {
      mysteryId: mystery.id,
      userId: id,
      deduction: b.deduction,
      isCorrect,
      feedback: isCorrect
        ? `Magnificent deduction! You identified the presence of "${mystery.solutionKeyword}". ${mystery.explanation}`
        : 'The gray fog remains opaque. Your deduction does not pierce through the veil. Contemplate the clues again.'
    }
  });

  if (isCorrect) {
    unlockAchievement(id, 'SOLVE_MYSTERY');
    await db.memberProfile.update({
      where: { userId: id },
      data: {
        reputation: { increment: mystery.rewardReputation },
        contributions: { increment: mystery.rewardPounds }
      }
    });
    await notifyUser(id, 'Mystery Deciphered!', `You earned ${mystery.rewardPounds} Gold Pounds and ${mystery.rewardReputation} Reputation for solving "${mystery.title}".`);
  }

  s.json(submission);
}));

// --- TAROT COMMUNITY VOTES ---
app.get('/api/votes', auth, A(async (_q, s) => {
  const id = me(s);
  const votes = await db.tarotVote.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      votes: true,
      createdBy: { select: { profile: { select: { codename: true } } } }
    }
  });

  s.json(votes.map(v => {
    const options: string[] = JSON.parse(v.options || '[]');
    const tallies = options.map((_, idx) => v.votes.filter(r => r.optionIndex === idx).length);
    const userVote = v.votes.find(r => r.userId === id);
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      options,
      tallies,
      totalVotes: v.votes.length,
      userVotedOption: userVote ? userVote.optionIndex : null,
      status: v.status,
      closesAt: v.closesAt,
      createdBy: v.createdBy.profile?.codename
    };
  }));
}));

app.post('/api/votes/:id/cast', auth, limit(15), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    optionIndex: z.number().int().min(0)
  }).parse(q.body);

  const vote = await db.tarotVote.findUnique({ where: { id: q.params.id } });
  if (!vote || vote.status !== 'ACTIVE') throw new HttpErr(400, 'CLOSED', 'Vote is closed or not found');

  const rec = await db.tarotVoteRecord.upsert({
    where: { voteId_userId: { voteId: vote.id, userId: id } },
    update: { optionIndex: b.optionIndex },
    create: { voteId: vote.id, userId: id, optionIndex: b.optionIndex }
  });

  toAll('TAROT_VOTE_CAST', { voteId: vote.id, userId: id, optionIndex: b.optionIndex });
  s.json(rec);
}));

// --- ACHIEVEMENTS & NOTIFICATIONS ---
app.get('/api/achievements', auth, A(async (_q, s) => {
  const id = me(s);
  const all = await db.achievement.findMany({
    include: {
      users: { where: { userId: id } }
    }
  });

  s.json(all.map(a => ({
    id: a.id,
    code: a.code,
    title: a.title,
    description: a.description,
    icon: a.icon,
    category: a.category,
    points: a.points,
    unlocked: a.users.length > 0,
    unlockedAt: a.users[0]?.unlockedAt || null
  })));
}));

app.get('/api/notifications', auth, A(async (_q, s) => {
  const id = me(s);
  const list = await db.notification.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  s.json(list);
}));

app.post('/api/notifications/:id/read', auth, A(async (q, s) => {
  const id = me(s);
  await db.notification.updateMany({
    where: { id: q.params.id, userId: id },
    data: { readAt: new Date() }
  });
  s.json({ ok: true });
}));

app.post('/api/notifications/read-all', auth, A(async (_q, s) => {
  const id = me(s);
  await db.notification.updateMany({
    where: { userId: id, readAt: null },
    data: { readAt: new Date() }
  });
  s.json({ ok: true });
}));

// --- CRIMSON STARS & PRAYERS ---
app.get('/api/prayers', auth, A(async (_q, s) => {
  const prayers = await db.prayer.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { persona: true, commission: true, author: { select: { profile: { select: { codename: true } } } } }
  });
  s.json(prayers);
}));

app.post('/api/prayers', auth, limit(10), A(async (q, s) => {
  const id = me(s);
  const b = z.object({
    personaId: z.number().int().optional(),
    type: z.enum(['PRAYER', 'SUPPORT', 'EMERGENCY']),
    message: z.string().trim().min(3).max(1000)
  }).parse(q.body);

  let pId = b.personaId;
  if (!pId) {
    const firstP = await db.persona.findFirst();
    pId = firstP?.id || 1;
  }

  const p = await db.prayer.create({
    data: {
      authorId: id,
      personaId: pId,
      type: b.type,
      message: b.message
    },
    include: { persona: true, author: { select: { profile: { select: { codename: true } } } } }
  });

  toAll('PRAYER_BROADCAST', p);
  s.status(201).json(p);
}));

// --- RECOVERY SNAPSHOT ---
app.get('/api/snapshot', auth, A(async (_q, s) => {
  const [members, seats, projections, gathering, prayers, unreadCount] = await Promise.all([
    roster(),
    db.tarotSeat.findMany({
      orderBy: { id: 'asc' },
      include: {
        occupant: {
          select: {
            id: true,
            username: true,
            profile: { select: { codename: true, avatarCard: true, pathway: true, sequence: true } }
          }
        }
      }
    }),
    db.projectionSession.findMany({
      where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { artifact: true }
    }),
    db.gathering.findFirst({
      where: { status: 'IN_PROGRESS' },
      orderBy: { scheduledAt: 'desc' }
    }),
    db.prayer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { persona: true }
    }),
    db.notification.count({ where: { userId: me(s), readAt: null } })
  ]);

  s.json({
    ts: new Date().toISOString(),
    members,
    seats,
    projections,
    activeGathering: gathering ? { ...gathering, agenda: JSON.parse(gathering.agenda || '[]') } : null,
    prayers,
    unreadNotifications: unreadCount
  });
}));

// Error handler
app.use((e: unknown, _q: Request, s: Response, _n: NextFunction) => {
  if (e instanceof ZodError) {
    return void s.status(400).json({
      error: { code: 'VALIDATION', message: 'Invalid input', details: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }
    });
  }
  if (e instanceof HttpErr) {
    return void s.status(e.status).json({
      error: { code: e.code, message: e.message }
    });
  }
  console.error(e instanceof Error ? e.stack : e);
  s.status(500).json({ error: { code: 'INTERNAL', message: 'The gray fog obscures the path. Something went wrong.' } });
});

// Real-Time WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, sock, head) => {
  try {
    if (!req.url?.startsWith('/ws')) throw new Error('Bad URL');
    const cookieHeader = req.headers.cookie || '';
    const tok = cookieHeader
      .split(';')
      .map(x => x.trim().split('='))
      .find(([k]) => k === 'token')?.[1];

    if (!tok) throw new Error('No token');
    const decoded = jwt.verify(decodeURIComponent(tok), SECRET) as { sub: string };
    const uid = decoded.sub;

    wss.handleUpgrade(req, sock, head, w => {
      (w as any).uid = uid;
      wss.emit('connection', w);
    });
  } catch (err) {
    sock.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    sock.destroy();
  }
});

const broadcastPresence = () => toAll('MEMBER_PRESENCE_UPDATED', { online: online() });

wss.on('connection', (w: WebSocket) => {
  const uid = (w as any).uid as string;
  if (!conns.has(uid)) conns.set(uid, new Set());
  conns.get(uid)!.add(w);
  broadcastPresence();

  w.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        w.send(envl('pong', {}));
      }
    } catch {}
  });

  w.on('close', () => {
    const userConns = conns.get(uid);
    userConns?.delete(w);
    if (!userConns?.size) conns.delete(uid);
    broadcastPresence();
  });
});

server.listen(PORT, () => {
  console.log(`Tarot Club Backend & Realtime Gateway active on http://localhost:${PORT}`);
});
