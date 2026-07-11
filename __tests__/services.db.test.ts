import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateUserProfileInDB, setCachedToken } from '../services/db';

describe('updateUserProfileInDB', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorageMock);

    // Reset any cached token
    setCachedToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should call fetch with correct arguments and return true on success', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ success: true, result: true })
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

    // Set token to ensure authorization header is included
    vi.mocked(localStorage.getItem).mockReturnValueOnce('mock-token');

    const result = await updateUserProfileInDB('user-1', 'John Doe', '1234567890');

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify({
        method: 'updateUserProfileInDB',
        args: ['user-1', 'John Doe', '1234567890']
      })
    });
  });

  it('should throw an error when API returns false success', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ success: false, message: 'Update failed' })
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

    await expect(updateUserProfileInDB('user-1', 'John Doe', '1234567890'))
      .rejects
      .toThrow('Update failed');
  });

  it('should handle session expiration (401 status)', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: async () => ({})
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

    // Allow localforage removal to run without failing
    vi.mocked(localStorage.getItem).mockReturnValueOnce('mock-token'); // For token usage

    await expect(updateUserProfileInDB('user-1', 'John Doe', '1234567890'))
      .rejects
      .toThrow('Session expired. Please log in again.');

    expect(localStorage.removeItem).toHaveBeenCalledWith('al_tayyar_user_id');
  });
});
