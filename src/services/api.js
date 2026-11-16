const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function req(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  getMe: () => req('/api/auth/me'),
  updateProfile: profileData =>
    req('/api/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),

  // Members
  getMembers: () => req('/api/members'),
  getMember: id => req(`/api/members/${id}`),

  // Seats & Bronze Table
  getSeats: () => req('/api/seats'),
  takeSeat: id => req(`/api/seats/${id}/take`, { method: 'POST' }),
  leaveSeat: () => req('/api/seats/leave', { method: 'POST' }),
  updateSeatStatus: status =>
    req('/api/seats/status', { method: 'POST', body: JSON.stringify(status) }),
  moderateSeat: data =>
    req('/api/seats/moderate', { method: 'POST', body: JSON.stringify(data) }),

  // Table Messages & Whispers
  getTableMessages: gatheringId =>
    req(`/api/table-messages${gatheringId ? `?gatheringId=${gatheringId}` : ''}`),
  sendTableMessage: data =>
    req('/api/table-messages', { method: 'POST', body: JSON.stringify(data) }),
  getWhispers: otherId => req(`/api/whispers/${otherId}`),
  getWhisperThreads: () => req('/api/whispers'),
  sendWhisper: (toId, body) =>
    req('/api/whispers', { method: 'POST', body: JSON.stringify({ toId, body }) }),

  // Gatherings
  getGatherings: () => req('/api/gatherings'),
  getGathering: id => req(`/api/gatherings/${id}`),
  createGathering: data => req('/api/gatherings', { method: 'POST', body: JSON.stringify(data) }),
  updateGathering: (id, data) =>
    req(`/api/gatherings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  rsvpGathering: (id, data) =>
    req(`/api/gatherings/${id}/rsvp`, { method: 'POST', body: JSON.stringify(data) }),

  // Intelligence
  getIntelligence: params => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    return req(`/api/intelligence${q.toString() ? `?${q.toString()}` : ''}`);
  },
  getIntelligencePost: id => req(`/api/intelligence/${id}`),
  createIntelligence: data =>
    req('/api/intelligence', { method: 'POST', body: JSON.stringify(data) }),
  addComment: (postId, content) =>
    req(`/api/intelligence/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  toggleReaction: (postId, type) =>
    req(`/api/intelligence/${postId}/reactions`, { method: 'POST', body: JSON.stringify({ type }) }),
  verifyIntelligence: (postId, status) =>
    req(`/api/intelligence/${postId}/verify`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Commissions
  getCommissions: status =>
    req(`/api/commissions${status ? `?status=${status}` : ''}`),
  createCommission: data =>
    req('/api/commissions', { method: 'POST', body: JSON.stringify(data) }),
  claimCommission: id =>
    req(`/api/commissions/${id}/claim`, { method: 'POST' }),
  updateCommissionProgress: (id, data) =>
    req(`/api/commissions/${id}/progress`, { method: 'PUT', body: JSON.stringify(data) }),

  // Artifacts
  getArtifacts: params => {
    const q = new URLSearchParams();
    if (params?.grade !== undefined && params.grade !== null) q.set('grade', String(params.grade));
    if (params?.search) q.set('search', params.search);
    return req(`/api/artifacts${q.toString() ? `?${q.toString()}` : ''}`);
  },
  projectArtifact: () => req('/api/projections', { method: 'POST' }),
  getActiveProjections: () => req('/api/projections/active'),

  // Research
  getResearch: pathway =>
    req(`/api/research${pathway ? `?pathway=${pathway}` : ''}`),
  createResearch: data =>
    req('/api/research', { method: 'POST', body: JSON.stringify(data) }),

  // Mysteries
  getMysteries: () => req('/api/mysteries'),
  submitMystery: (id, deduction) =>
    req(`/api/mysteries/${id}/submit`, { method: 'POST', body: JSON.stringify({ deduction }) }),

  // Voting
  getVotes: () => req('/api/votes'),
  castVote: (id, optionIndex) =>
    req(`/api/votes/${id}/cast`, { method: 'POST', body: JSON.stringify({ optionIndex }) }),

  // Achievements & Notifications
  getAchievements: () => req('/api/achievements'),
  getNotifications: () => req('/api/notifications'),
  markNotificationRead: id => req(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => req('/api/notifications/read-all', { method: 'POST' }),

  // Prayers & Crimson Stars
  getPrayers: () => req('/api/prayers'),
  sendPrayer: data =>
    req('/api/prayers', { method: 'POST', body: JSON.stringify(data) }),

  // Snapshot
  getSnapshot: () => req('/api/snapshot')
};
