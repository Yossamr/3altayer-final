import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMessagesFromDB, getCachedToken, setCachedToken } from '../services/db';

describe('Database Services', () => {
  describe('getMessagesFromDB', () => {
    let originalFetch: any;

    beforeEach(() => {
      // Save original fetch
      originalFetch = global.fetch;

      // We don't want to rely on the actual localstorage in vitest for token
      // Mock localstorage to simulate logged-in state without token side effects
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
      // Set the token explicitly
      setCachedToken('mock-token');
    });

    afterEach(() => {
      // Restore fetch
      global.fetch = originalFetch;
      vi.unstubAllGlobals();
      // Clear token
      setCachedToken(null);
    });

    it('should successfully fetch messages for an order', async () => {
      // Mock the global fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          result: [
            { id: '1', orderId: 'test-order-id', senderId: 'user1', text: 'Hello', timestamp: 1234567890 },
            { id: '2', orderId: 'test-order-id', senderId: 'user2', text: 'Hi there', timestamp: 1234567891 }
          ]
        })
      });

      const orderId = 'test-order-id';
      const messages = await getMessagesFromDB(orderId);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        }),
        body: JSON.stringify({
          method: 'getMessagesFromDB',
          args: [orderId]
        })
      }));

      expect(messages).toHaveLength(2);
      expect(messages[0].text).toBe('Hello');
      expect(messages[1].text).toBe('Hi there');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Order not found'
        })
      });

      const orderId = 'invalid-order-id';

      await expect(getMessagesFromDB(orderId)).rejects.toThrow('Order not found');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network/fetch errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const orderId = 'test-order-id';

      await expect(getMessagesFromDB(orderId)).rejects.toThrow('Failed to fetch');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
