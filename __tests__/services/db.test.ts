import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// First, mock localforage completely before importing anything else that might import it
vi.mock('localforage', () => ({
  default: {
    removeItem: vi.fn(() => ({
      catch: vi.fn(), // Provide a mock catch function to avoid the "Cannot read properties of undefined (reading 'catch')" error
    })),
  }
}));

import { deductWalletInDB, setCachedToken } from '../../services/db';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
global.localStorage = mockLocalStorage as any;

// Mock window.location.reload
const mockReload = vi.fn();
global.window = {
  ...global.window,
  location: {
    ...global.window?.location,
    reload: mockReload
  }
} as any;


describe('db.ts tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    setCachedToken('mock-token');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('deductWalletInDB', () => {
    it('should successfully deduct amount from wallet', async () => {
      // Setup successful response
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: true, result: true }),
      });

      const userId = 'user-123';
      const amount = 50;

      const result = await deductWalletInDB(userId, amount);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const fetchArgs = mockFetch.mock.calls[0];
      expect(fetchArgs[0]).toBe('/api/rpc');

      const requestOptions = fetchArgs[1];
      expect(requestOptions.method).toBe('POST');
      expect(requestOptions.headers['Content-Type']).toBe('application/json');
      expect(requestOptions.headers['Authorization']).toBe('Bearer mock-token');

      const body = JSON.parse(requestOptions.body);
      expect(body.method).toBe('deductWalletInDB');
      expect(body.args).toEqual([userId, amount]);
    });

    it('should throw error when RPC call fails (success = false)', async () => {
      // Setup failed response
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ success: false, message: 'Insufficient balance' }),
      });

      await expect(deductWalletInDB('user-123', 100)).rejects.toThrow('Insufficient balance');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when network request fails', async () => {
      // Setup network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(deductWalletInDB('user-123', 100)).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error and handle 401 Unauthorized', async () => {
      // Setup specific 401 behavior
      mockLocalStorage.getItem.mockReturnValue('old-token');

      // The rpcCall has special handling for 401
      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      await expect(deductWalletInDB('user-123', 100)).rejects.toThrow('Session expired. Please log in again.');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('al_tayyar_user_id');
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });
});
