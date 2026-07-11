import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOrderInDB, setCachedToken } from '../../services/db';
import { Order, OrderStatus } from '../../types';

describe('createOrderInDB', () => {
    const mockOrder: Order = {
        id: '123',
        customerId: 'user1',
        pickupLocation: 'A',
        dropoffLocation: 'B',
        status: OrderStatus.PENDING,
        createdAt: Date.now(),
        pickupCoords: { lat: 0, lng: 0 },
        dropoffCoords: { lat: 0, lng: 0 }
    };

    let localStorageMock: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();

        // Silence console.error for expected errors in tests
        vi.spyOn(console, 'error').mockImplementation(() => {});

        localStorageMock = {
            getItem: vi.fn().mockReturnValue('mock-token'),
            setItem: vi.fn(),
            removeItem: vi.fn()
        };
        (global as any).localStorage = localStorageMock;

        // Ensure cached token is cleared/reset
        setCachedToken('mock-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (global as any).localStorage;
    });

    it('should successfully create an order and return true', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({ success: true, result: true })
        };
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const result = await createOrderInDB(mockOrder);

        expect(global.fetch).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer mock-token'
            },
            body: JSON.stringify({
                method: 'createOrderInDB',
                args: [mockOrder]
            })
        }));
        expect(result).toBe(true);
    });

    it('should throw an error when API returns success: false', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({ success: false, message: 'Invalid order data' })
        };
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        await expect(createOrderInDB(mockOrder)).rejects.toThrow('Invalid order data');
        expect(console.error).toHaveBeenCalled();
    });

    it('should throw an error on network failure', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network Error'));

        await expect(createOrderInDB(mockOrder)).rejects.toThrow('Network Error');
        expect(console.error).toHaveBeenCalled();
    });
});
