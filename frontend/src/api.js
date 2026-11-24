const API_BASE = '/api/v1';

export const getAuthToken = () => localStorage.getItem('foodrescue_token');
export const setAuthToken = (token) => localStorage.setItem('foodrescue_token', token);
export const removeAuthToken = () => localStorage.removeItem('foodrescue_token');

export const getCurrentUser = () => {
  const user = localStorage.getItem('foodrescue_user');
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user) => {
  localStorage.setItem('foodrescue_user', JSON.stringify(user));
};

export const removeCurrentUser = () => {
  localStorage.removeItem('foodrescue_user');
};

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.detail || (data.safety_error) || (typeof data === 'object' ? Object.values(data)[0] : 'Request failed');
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }
  return data;
}

export const api = {
  // Auth
  login: async (username, password) => {
    const data = await request('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.access);
    setCurrentUser(data.user);
    return data;
  },
  logout: () => {
    removeAuthToken();
    removeCurrentUser();
  },
  getProfile: () => request('/auth/profile/'),
  register: (payload) => request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Organizations
  getOrganizations: (params = '') => request(`/organizations/${params}`),
  verifyOrganization: (orgId, decision, notes) => request(`/organizations/${orgId}/verify/`, {
    method: 'POST',
    body: JSON.stringify({ decision, notes }),
  }),
  getVerificationRecords: () => request('/organizations/verifications/'),

  // Users (Admin)
  getUsers: () => request('/users/'),
  toggleSuspendUser: (userId) => request(`/users/${userId}/toggle_suspend/`, {
    method: 'POST',
  }),

  // Food Categories & Listings
  getCategories: () => request('/donations/categories/'),
  getListings: (params = '') => request(`/donations/listings/${params}`),
  getListing: (id) => request(`/donations/listings/${id}/`),
  createListing: (payload) => request('/donations/listings/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getListingMatches: (id) => request(`/donations/listings/${id}/matches/`),
  getRecommendations: () => request('/donations/listings/recommendations/'),
  reviewSafetyDeclaration: (listingId, approved, notes) => request(`/donations/listings/${listingId}/review_safety/`, {
    method: 'POST',
    body: JSON.stringify({ approved, notes }),
  }),

  // Claims & Reservations
  getReservations: () => request('/reservations/'),
  createReservation: (listingId, quantity) => request('/reservations/', {
    method: 'POST',
    body: JSON.stringify({ food_listing: listingId, quantity_reserved: quantity }),
  }),
  cancelReservation: (reservationId, reason) => request(`/reservations/${reservationId}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  // Logistics / Deliveries
  getDeliveries: (params = '') => request(`/deliveries/${params}`),
  claimDeliveryTask: (pickupId) => request(`/deliveries/${pickupId}/claim_task/`, {
    method: 'POST',
  }),
  verifyDonorPickup: (pickupId, otp, qrToken) => request(`/deliveries/${pickupId}/verify_donor_pickup/`, {
    method: 'POST',
    body: JSON.stringify({ otp, qr_token: qrToken }),
  }),
  verifyRecipientDelivery: (pickupId, otp, qrToken) => request(`/deliveries/${pickupId}/verify_recipient_delivery/`, {
    method: 'POST',
    body: JSON.stringify({ otp, qr_token: qrToken }),
  }),

  // Notifications
  getNotifications: () => request('/notifications/'),
  getUnreadCount: () => request('/notifications/unread_count/'),
  markNotificationRead: (id) => request(`/notifications/${id}/mark_read/`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/mark_all_read/', { method: 'POST' }),

  // Feedback & Disputes
  getFeedbacks: () => request('/feedback/'),
  submitFeedback: (payload) => request('/feedback/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  resolveFeedback: (feedbackId, notes) => request(`/feedback/${feedbackId}/resolve/`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }),

  // Simulation & Benchmarking
  runSimulation: (params = {}) => request('/simulation/run/', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  getSimulationHistory: () => request('/simulation/'),

  // Analytics & Forecast
  getAnalytics: () => request('/analytics/dashboard/'),
  getDemandForecast: () => request('/analytics/demand-forecast/'),

  // Seed Demo
  seedDemoData: () => request('/seed-demo/', { method: 'POST' }),
};
