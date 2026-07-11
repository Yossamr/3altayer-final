import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { topUpWalletInDB } from '../../services/db';

describe('db service', () => {
    beforeEach(() => {
        vi.spyOn(global, 'fetch');
        // Mock localStorage
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('topUpWalletInDB', () => {
        it('should throw an error when the RPC call fails', async () => {
            const mockErrorMsg = 'Database error top up failed';

            // Mock fetch to simulate a failed RPC call
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ success: false, message: mockErrorMsg })
            } as any);

            await expect(topUpWalletInDB('user123', 100)).rejects.toThrow(mockErrorMsg);

            // Verify fetch was called with the correct parameters
            expect(global.fetch).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    method: 'topUpWalletInDB',
                    args: ['user123', 100]
                })
            }));
        });

        it('should return successfully when the RPC call succeeds', async () => {
            // Mock fetch to simulate a successful RPC call
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true, result: true })
            } as any);

            const result = await topUpWalletInDB('user123', 100);
            expect(result).toBe(true);
        });
    });
});
