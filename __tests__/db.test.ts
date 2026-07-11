import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerZoneWaitlistInDB } from '../services/db';

describe('registerZoneWaitlistInDB', () => {
    let fetchMock: any;
    let consoleErrorMock: any;

    beforeEach(() => {
        fetchMock = vi.spyOn(global, 'fetch');
        consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should successfully register a waitlist and return response', async () => {
        const mockResponse = { success: true, message: 'Successfully registered to the waitlist!' };
        fetchMock.mockResolvedValueOnce({
            json: async () => mockResponse,
        });

        const result = await registerZoneWaitlistInDB('zone-1', '1234567890', 'test@example.com', 'Test User');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/zone-waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                zoneId: 'zone-1',
                phone: '1234567890',
                email: 'test@example.com',
                name: 'Test User'
            })
        });
        expect(result).toEqual(mockResponse);
    });

    it('should handle optional email and name fields', async () => {
        const mockResponse = { success: true, message: 'Successfully registered to the waitlist!' };
        fetchMock.mockResolvedValueOnce({
            json: async () => mockResponse,
        });

        const result = await registerZoneWaitlistInDB('zone-2', '0987654321');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/zone-waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                zoneId: 'zone-2',
                phone: '0987654321',
                email: undefined,
                name: undefined
            })
        });
        expect(result).toEqual(mockResponse);
    });

    it('should catch fetch error, log error, and return fallback response', async () => {
        const networkError = new Error('Network failed');
        fetchMock.mockRejectedValueOnce(networkError);

        const result = await registerZoneWaitlistInDB('zone-1', '1234567890');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(consoleErrorMock).toHaveBeenCalledTimes(1);
        expect(consoleErrorMock).toHaveBeenCalledWith('Failed to register waitlist:', networkError);
        expect(result).toEqual({ success: false, message: 'Network error' });
    });
});
