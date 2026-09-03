const API_BASE = '/api';

export function getUserAccessToken() {
  return sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
}
export function getUserRefreshToken() {
  return sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');
}
export function getAdminAccessToken() {
  return sessionStorage.getItem('admin_access_token') || localStorage.getItem('admin_access_token');
}
export function getAdminRefreshToken() {
  return sessionStorage.getItem('admin_refresh_token') || localStorage.getItem('admin_refresh_token');
}

async function request(endpoint, options = {}) {
  const isAdmin = endpoint.startsWith('/admin/');
  const token = isAdmin ? getAdminAccessToken() : getUserAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || JSON.stringify(data) || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  signup(payload) {
    return request('/auth/signup/', { method: 'POST', body: JSON.stringify(payload) });
  },
  login(payload) {
    return request('/auth/login/', { method: 'POST', body: JSON.stringify(payload) });
  },
  socialAuth(payload) {
    return request('/auth/social/', { method: 'POST', body: JSON.stringify(payload) });
  },
  verifyEmail(email, code) {
    return request('/auth/verify-email/', { method: 'POST', body: JSON.stringify({ email, code }) });
  },
  resendVerification(email) {
    return request('/auth/resend-verification/', { method: 'POST', body: JSON.stringify({ email }) });
  },
  getProfile() {
    return request('/auth/profile/', { method: 'GET' });
  },
  getPublicProfile(publicId) {
    return request(`/auth/profiles/${encodeURIComponent(publicId)}/`, { method: 'GET' });
  },
  updateProfile(payload) {
    return request('/auth/profile/', { method: 'PATCH', body: JSON.stringify(payload) });
  },
  logout(refreshToken) {
    return request('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh: refreshToken }) });
  },
  suggestions(field, q) {
    return request(`/auth/suggestions/?field=${field}&q=${encodeURIComponent(q)}`, { method: 'GET' });
  },
  discover() {
    return request('/auth/discover/', { method: 'GET' });
  },
  getMatches() {
    return request('/auth/matches/', { method: 'GET' });
  },
  createMatch(payload) {
    return request('/auth/matches/', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateMatch(id, payload) {
    return request(`/auth/matches/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  getConversations() {
    return request('/auth/conversations/', { method: 'GET' });
  },
  getMessages(conversationId) {
    return request(`/auth/messages/?conversation=${conversationId}`, { method: 'GET' });
  },
  sendMessage(payload) {
    return request('/auth/messages/', { method: 'POST', body: JSON.stringify(payload) });
  },
  getActivities() {
    return request('/auth/activities/', { method: 'GET' });
  },
  getUnreadCount() {
    return request('/auth/activities/unread-count/', { method: 'GET' });
  },
  markRead() {
    return request('/auth/activities/mark-read/', { method: 'POST' });
  },
  getCounsellingSessions() {
    return request('/auth/counselling/', { method: 'GET' });
  },
  getPhotos() {
    return request('/auth/photos/', { method: 'GET' });
  },
  uploadPhoto(file) {
    const formData = new FormData();
    formData.append('image', file);
    const token = getUserAccessToken();
    return fetch('/api/auth/photos/upload/', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  deletePhoto(id) {
    return request(`/auth/photos/${id}/`, { method: 'DELETE' });
  },
  setPrimaryPhoto(id) {
    return request(`/auth/photos/${id}/primary/`, { method: 'POST' });
  },
  forgotPassword(email) {
    return request('/auth/forgot-password/', { method: 'POST', body: JSON.stringify({ email }) });
  },
  resetPassword(payload) {
    return request('/auth/reset-password/', { method: 'POST', body: JSON.stringify(payload) });
  },
  getRankedMatches() {
    return request('/matches/', { method: 'GET' });
  },
  getMatchScore(profileId) {
    return request(`/match-score/${profileId}/`, { method: 'GET' });
  },
  getRecommendations() {
    return request('/recommendations/', { method: 'GET' });
  },
  getProfileSuggestions() {
    return request('/profile-suggestions/', { method: 'GET' });
  },
  trackProfileView(viewedId) {
    return request('/track-profile-view/', { method: 'POST', body: JSON.stringify({ viewed_id: viewedId }) });
  },
  saveProfile(savedId) {
    return request('/save-profile/', { method: 'POST', body: JSON.stringify({ saved_id: savedId }) });
  },
  uploadCoverPhoto(file) {
    const formData = new FormData();
    formData.append('image', file);
    const token = getUserAccessToken();
    return fetch('/api/auth/cover-photo/', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },
  recentlyVerified() {
    return request('/auth/recently-verified/', { method: 'GET' });
  },
  getPlans() {
    return request('/subscriptions/plans/', { method: 'GET' });
  },
  getLegalVersions() {
    return request('/auth/legal/versions/', { method: 'GET' });
  },
  recordConsent(payload) {
    return request('/auth/consents/', { method: 'POST', body: JSON.stringify(payload) });
  },
  getConsentStatus() {
    return request('/auth/consents/status/', { method: 'GET' });
  },
  getCurrentSubscription() {
    return request('/subscriptions/current/', { method: 'GET' });
  },
  startCall(conversationId, callType = 'audio') {
    return request('/subscriptions/calls/start/', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, call_type: callType }),
    });
  },
  endCall(sessionId) {
    return request(`/subscriptions/calls/${sessionId}/end/`, { method: 'POST' });
  },
  callBalance() {
    return request('/subscriptions/calls/balance/', { method: 'GET' });
  },
  callHistory() {
    return request('/subscriptions/calls/history/', { method: 'GET' });
  },
  initPayment(payload) {
    return request('/subscriptions/subscribe/', { method: 'POST', body: JSON.stringify(payload) });
  },
  verifyPayment(payload) {
    return request('/subscriptions/verify-payment/', { method: 'POST', body: JSON.stringify(payload) });
  },
  uploadAudio(formData) {
    const token = getUserAccessToken();
    return fetch('/api/auth/audio-upload/', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    });
  },

  adminLogin(payload) {
    return request('/admin/login/', { method: 'POST', body: JSON.stringify(payload) });
  },
  adminSignup(payload) {
    return request('/admin/signup/', { method: 'POST', body: JSON.stringify(payload) });
  },

  adminDashboard() {
    return request('/admin/dashboard/', { method: 'GET' });
  },
  adminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users/${qs ? '?' + qs : ''}`, { method: 'GET' });
  },
  adminUserDetail(userId) {
    return request(`/admin/users/${userId}/`, { method: 'GET' });
  },
  adminSuspendUser(userId) {
    return request(`/admin/users/${userId}/suspend/`, { method: 'POST' });
  },
  adminBanUser(userId) {
    return request(`/admin/users/${userId}/ban/`, { method: 'POST' });
  },
  adminReinstateUser(userId) {
    return request(`/admin/users/${userId}/reinstate/`, { method: 'POST' });
  },
  adminApprovePhoto(photoId, action) {
    return request('/admin/photos/approve/', { method: 'POST', body: JSON.stringify({ photo_id: photoId, action }) });
  },
  adminModeration() {
    return request('/admin/moderation/', { method: 'GET' });
  },
  adminMatches() {
    return request('/admin/matches/', { method: 'GET' });
  },
  adminCounsellingSessions() {
    return request('/admin/counselling/', { method: 'GET' });
  },
  adminUpdateCounsellingSession(sessionId, payload) {
    return request(`/admin/counselling/${sessionId}/`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  adminPayments() {
    return request('/admin/payments/', { method: 'GET' });
  },
  adminSubscriptions() {
    return request('/admin/subscriptions/', { method: 'GET' });
  },
  adminReports() {
    return request('/admin/reports/', { method: 'GET' });
  },
  adminRoles() {
    return request('/admin/roles/', { method: 'GET' });
  },
  adminAssignRole(payload) {
    return request('/admin/roles/assign/', { method: 'POST', body: JSON.stringify(payload) });
  },
  adminRemoveRole(userId) {
    return request(`/admin/roles/${userId}/remove/`, { method: 'POST' });
  },
  adminAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/audit-log/${qs ? '?' + qs : ''}`, { method: 'GET' });
  },
  adminSettings() {
    return request('/admin/settings/', { method: 'GET' });
  },
  adminUpdateSettings(payload) {
    return request('/admin/settings/', { method: 'PATCH', body: JSON.stringify(payload) });
  },
  adminBroadcastNotification(payload) {
    return request('/admin/notifications/broadcast/', { method: 'POST', body: JSON.stringify(payload) })
  },
  adminNotificationFeed() {
    return request('/admin/notifications/feed/', { method: 'GET' })
  },
  adminInvitationLookup(token) {
    return request(`/admin/invitations/lookup/?token=${encodeURIComponent(token)}`, { method: 'GET' })
  },
  adminInvitations(payload) {
    return request('/admin/invitations/', { method: 'POST', body: JSON.stringify(payload) })
  },
  adminBlockUnblock(userId) {
    return request(`/admin/admins/${userId}/block/`, { method: 'POST' })
  },
  adminHeartbeat() {
    return request('/admin/heartbeat/', { method: 'POST' })
  },

  async getDenominations() {
    const data = await request('/auth/denominations/', { method: 'GET' })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.denominations)) return data.denominations
    return []
  },
  async getTestimonials() {
    const data = await request('/auth/testimonials/', { method: 'GET' })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.testimonials)) return data.testimonials
    return []
  },
  chatbotSend(payload) {
    return request('/chatbot/', { method: 'POST', body: JSON.stringify(payload) });
  },
  chatbotEscalate(payload) {
    return request('/chatbot/escalate/', { method: 'POST', body: JSON.stringify(payload) });
  },
  chatbotFeedback(payload) {
    return request('/chatbot/feedback/', { method: 'POST', body: JSON.stringify(payload) });
  },
  chatbotConfig() {
    return request('/chatbot/config/', { method: 'GET' });
  },
  adminChatbotTickets() {
    return request('/admin/chatbot/tickets/', { method: 'GET' });
  },
  adminChatbotTicket(id) {
    return request(`/admin/chatbot/tickets/${id}/`, { method: 'GET' });
  },
  adminChatbotUpdateTicket(id, payload) {
    return request(`/admin/chatbot/tickets/${id}/update/`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  adminChatbotStats() {
    return request('/admin/chatbot/stats/', { method: 'GET' });
  },
  adminDenominations() {
    return request('/admin/denominations/', { method: 'GET' })
  },
  adminCreateDenomination(payload) {
    return request('/admin/denominations/create/', { method: 'POST', body: JSON.stringify(payload) })
  },
  adminUpdateDenomination(id, payload) {
    return request(`/admin/denominations/${id}/update/`, { method: 'PUT', body: JSON.stringify(payload) })
  },
  adminDeleteDenomination(id) {
    return request(`/admin/denominations/${id}/delete/`, { method: 'DELETE' })
  },
  adminTestimonials() {
    return request('/admin/testimonials/', { method: 'GET' })
  },
  adminCreateTestimonial(payload) {
    return request('/admin/testimonials/create/', { method: 'POST', body: JSON.stringify(payload) })
  },
  adminUpdateTestimonial(id, payload) {
    return request(`/admin/testimonials/${id}/update/`, { method: 'PUT', body: JSON.stringify(payload) })
  },
  adminActivateTestimonial(id) {
    return request(`/admin/testimonials/${id}/activate/`, { method: 'POST' })
  },
  adminDeleteTestimonial(id) {
    return request(`/admin/testimonials/${id}/delete/`, { method: 'DELETE' })
  },
  adminPendingDenominations() {
    return request('/admin/pending-denominations/', { method: 'GET' })
  },
  adminApprovePendingDenomination(id) {
    return request(`/admin/pending-denominations/${id}/approve/`, { method: 'POST' })
  },
  adminRejectPendingDenomination(id) {
    return request(`/admin/pending-denominations/${id}/reject/`, { method: 'POST' })
  },
};
