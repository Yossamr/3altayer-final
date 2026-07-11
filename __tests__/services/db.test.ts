import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllUsersFromDB, setCachedToken } from '../../services/db';
import { Role } from '../../types';

describe('db.ts tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    setCachedToken(null);
  });

  describe('getAllUsersFromDB', () => {
    it('should return a mapped list of users when API responds with success', async () => {
      const mockUsers = [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'driver' },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, result: mockUsers }),
      } as any);

      const result = await getAllUsersFromDB();

      expect(fetch).toHaveBeenCalledWith('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getAllUsersFromDB', args: [] }),
      });

      expect(result).toEqual([
        { id: '1', name: 'Alice', role: Role.ADMIN },
        { id: '2', name: 'Bob', role: Role.DRIVER },
      ]);
    });

    it('should return an empty array if result is not an array', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, result: null }),
      } as any);

      const result = await getAllUsersFromDB();

      expect(result).toEqual([]);
    });

    it('should throw an error if API responds with failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false, message: 'Server error' }),
      } as any);

      await expect(getAllUsersFromDB()).rejects.toThrow('Server error');
    });
  });
});
