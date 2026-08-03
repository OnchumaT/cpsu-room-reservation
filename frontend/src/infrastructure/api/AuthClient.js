import { User } from '../../domain/entities/User.js';

export function createAuthClient({ apiClient }) {
  function toUser(json) {
    return new User(json);
  }

  async function login({ email, password }) {
    const { user, token } = await apiClient.post('/auth/login', { email, password });
    apiClient.setToken(token);
    return { user: toUser(user), managementPositions: user.managementPositions ?? [] };
  }

  async function loginWithGoogle({ idToken }) {
    const { user, token } = await apiClient.post('/auth/google', { idToken });
    apiClient.setToken(token);
    return { user: toUser(user), managementPositions: user.managementPositions ?? [] };
  }

  async function fetchMe() {
    const { user } = await apiClient.get('/auth/me');
    return { user: toUser(user), managementPositions: user.managementPositions ?? [] };
  }

  function logout() {
    apiClient.setToken(null);
  }

  return { login, loginWithGoogle, fetchMe, logout };
}
