import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loginUserFromDB } from '../services/db';
import { Role } from '../types';

describe('loginUserFromDB', () => {
  let mockFetch: any;
  let mockLocalStorage: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockLocalStorage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    global.localStorage = mockLocalStorage as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return user and set token on successful login', async () => {
    const mockUser = { id: 1, role: 'manager', name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: 'mockToken', user: mockUser }),
    });

    const result = await loginUserFromDB('01234567890', 'password');

    expect(result).toEqual({ id: '1', role: Role.ADMIN, name: 'Test' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('al_tayyar_session_token', 'mockToken');
    expect(mockFetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ phone: '01234567890', password: 'password' }),
    }));
  });

  it('should return null when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false }),
    });

    const result = await loginUserFromDB('01234567890', 'password');

    expect(result).toBeNull();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('should return null when response success is false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    });

    const result = await loginUserFromDB('01234567890', 'password');

    expect(result).toBeNull();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('should throw an error when API returns blocked message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'User is blocked' }),
    });

    await expect(loginUserFromDB('01234567890', 'password')).rejects.toThrow('User is blocked');
  });

  it('should return null when an exception is thrown that is not a block error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await loginUserFromDB('01234567890', 'password');

    expect(result).toBeNull();
  });

  it('should throw an error when fetch throws an error containing blocked message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('User is blocked'));

    await expect(loginUserFromDB('01234567890', 'password')).rejects.toThrow('User is blocked');
  });

  it('should handle successful login but missing user data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: 'mockToken' }),
    });

    const result = await loginUserFromDB('01234567890', 'password');

    expect(result).toBeNull();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('al_tayyar_session_token', 'mockToken');
  });
});
