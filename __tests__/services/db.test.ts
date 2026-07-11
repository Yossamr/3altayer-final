import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminUpdateUserInDB, setCachedToken } from '../../services/db';
import { Role } from '../../types';

describe('adminUpdateUserInDB', () => {
    beforeEach(() => {
        // Mock globals first
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn()
        });
        vi.stubGlobal('window', {
            location: { reload: vi.fn() }
        });

        // Reset cached token after mocking localStorage
        setCachedToken(null);
    });

    it('should call rpcCall with correct method and arguments', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, result: true })
        });
        vi.stubGlobal('fetch', mockFetch);

        const userId = 'user-123';
        const updates = { name: 'New Name' };

        await adminUpdateUserInDB(userId, updates);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchArgs = mockFetch.mock.calls[0];
        expect(fetchArgs[0]).toBe('/api/rpc');

        const fetchOptions = fetchArgs[1];
        expect(fetchOptions.method).toBe('POST');
        expect(fetchOptions.headers).toEqual({ 'Content-Type': 'application/json' });

        const body = JSON.parse(fetchOptions.body);
        expect(body).toEqual({
            method: 'adminUpdateUserInDB',
            args: [userId, updates]
        });
    });

    it('should return true on successful execution', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, result: true })
        });
        vi.stubGlobal('fetch', mockFetch);

        const result = await adminUpdateUserInDB('user-123', { role: Role.ADMIN });
        expect(result).toBe(true);
    });

    it('should handle errors thrown by rpcCall', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ success: false, message: 'Database error' })
        });
        vi.stubGlobal('fetch', mockFetch);

        await expect(adminUpdateUserInDB('user-123', { name: 'New Name' }))
            .rejects
            .toThrow('Database error');
    });
});
