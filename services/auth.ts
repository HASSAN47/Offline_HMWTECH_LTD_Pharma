import { User } from '../types';

const STORAGE_KEYS = {
  USERS: 'pharmacore_users',
  CURRENT_USER: 'pharmacore_current_user',
};

// Seed admin user
const INITIAL_ADMIN: User = {
  id: 'admin_01',
  username: 'admin',
  passwordHash: 'admin123', // In a real app, use bcrypt. This is for offline demo.
  role: 'admin',
  name: 'System Administrator'
};

export const authService = {
  init: () => {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!users) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([INITIAL_ADMIN]));
    }
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  register: (user: Omit<User, 'id'>): boolean => {
    const users = authService.getUsers();
    if (users.find(u => u.username === user.username)) {
      return false; // User exists
    }
    const newUser: User = { ...user, id: Date.now().toString() };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return true;
  },

  login: (username: string, password: string): User | null => {
    const users = authService.getUsers();
    const user = users.find(u => u.username === username && u.passwordHash === password);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  // New: Request a password reset
  requestPasswordReset: (username: string): boolean => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.username === username);
    if (index !== -1) {
      users[index].resetRequested = true;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return true;
    }
    return false;
  },

  // New: Update user details (role, password, etc.)
  updateUser: (userId: string, updates: Partial<User>): void => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      // If password is updated, clear the reset flag
      if (updates.passwordHash) {
        users[index].resetRequested = false;
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  // Delete a user
  deleteUser: (userId: string): void => {
    const users = authService.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
};