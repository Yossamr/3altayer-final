import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cancelOrderInDB } from '../services/db';

// Mock the global fetch
const globalFetchMock = vi.fn();
global.fetch = globalFetchMock;

// Mock localStorage globally since we aren't using jsdom environment
const mockLocalStorage = {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
};

global.localStorage = mockLocalStorage as any;

describe('cancelOrderInDB', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue('mock-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should resolve successfully when fetch returns success', async () => {
        globalFetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: true, result: true })
        });

        const result = await cancelOrderInDB('test-order-id', [{ status: 'CANCELLED' }]);

        expect(result).toBe(true);
        expect(globalFetchMock).toHaveBeenCalledTimes(1);
        expect(globalFetchMock).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"method":"cancelOrderInDB"')
        }));
    });

    it('should throw an error when fetch responds with an HTTP error status', async () => {
        // Mock a proper response including json since the implementation calls res.json() before checking res.ok
        globalFetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ success: false })
        });

        await expect(cancelOrderInDB('test-order-id', [{ status: 'CANCELLED' }]))
            .rejects
            .toThrow('An error occurred while processing the request.'); // Adjusted to actual implementation default error
    });

    it('should throw an error when fetch responds with success: false in JSON payload', async () => {
        globalFetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: false, message: 'Not authorized to cancel order' })
        });

        await expect(cancelOrderInDB('test-order-id', [{ status: 'CANCELLED' }]))
            .rejects
            .toThrow('Not authorized to cancel order');
    });

    it('should throw an error with default message when fetch responds with success: false without message', async () => {
        globalFetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: false })
        });

        await expect(cancelOrderInDB('test-order-id', [{ status: 'CANCELLED' }]))
            .rejects
            .toThrow('An error occurred while processing the request.'); // Adjusted to actual implementation default error
    });
});
