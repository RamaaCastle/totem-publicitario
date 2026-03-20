import { apiClient } from './client';

export const authApi = {
  login: (email: string, password: string, organizationSlug?: string) =>
    apiClient.post('/api/v1/auth/login', { email, password, ...(organizationSlug && { organizationSlug }) }),

  logout: () =>
    apiClient.post('/api/v1/auth/logout'),

  getProfile: () =>
    apiClient.get('/api/v1/auth/me'),

  refresh: (userId: string, refreshToken: string) =>
    apiClient.post('/api/v1/auth/refresh', { userId, refreshToken }),
};
