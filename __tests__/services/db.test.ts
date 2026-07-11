import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPaginatedOrdersFromDB, setCachedToken } from '../../services/db';

describe('db service', () => {
  beforeEach(() => {
    // Mock localStorage
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });

    // Clear cached token
    setCachedToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getPaginatedOrdersFromDB', () => {
    it('should successfully fetch paginated orders (happy path)', async () => {
      const mockOrders = [{ id: '1', items: 'pizza' }, { id: '2', items: 'burger' }];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, result: mockOrders })
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await getPaginatedOrdersFromDB(1, 10);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          method: 'getPaginatedOrdersFromDB',
          args: [1, 10, undefined, undefined, undefined]
        })
      }));
      expect(result).toEqual(mockOrders);
    });

    it('should handle empty datasets correctly', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, result: [] })
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await getPaginatedOrdersFromDB(1, 10);

      expect(result).toEqual([]);
    });

    it('should handle datasets smaller than the limit', async () => {
      const mockOrders = [{ id: '1', items: 'pizza' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, result: mockOrders })
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await getPaginatedOrdersFromDB(1, 10);

      expect(result).toEqual(mockOrders);
      expect(result.length).toBe(1);
    });

    it('should pass all filtering parameters correctly', async () => {
      const mockOrders = [{ id: '1', items: 'pizza' }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, result: mockOrders })
      });
      vi.stubGlobal('fetch', fetchMock);

      const startDate = 1600000000;
      const endDate = 1700000000;
      const searchTerm = 'pizza';

      const result = await getPaginatedOrdersFromDB(2, 5, startDate, endDate, searchTerm);

      expect(fetchMock).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
        body: JSON.stringify({
          method: 'getPaginatedOrdersFromDB',
          args: [2, 5, startDate, endDate, searchTerm]
        })
      }));
      expect(result).toEqual(mockOrders);
    });

    it('should throw an error on API failure', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, message: 'Internal Server Error' })
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(getPaginatedOrdersFromDB(1, 10)).rejects.toThrow('Internal Server Error');
    });

    it('should handle 401 Unauthorized errors correctly', async () => {
      // Need to mock window.location.reload
      vi.stubGlobal('window', { location: { reload: vi.fn() } });

      // Need a valid token to trigger the 401 handling logic branches fully if desired,
      // but without a token it still throws the error.
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, message: 'Unauthorized' })
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(getPaginatedOrdersFromDB(1, 10)).rejects.toThrow('Session expired. Please log in again.');
    });
  });
});
