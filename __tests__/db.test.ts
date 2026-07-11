import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerPushNotification, setCachedToken } from '../services/db';

describe('triggerPushNotification', () => {
    let fetchMock: any;
    let consoleErrorMock: any;

    beforeEach(() => {
        fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        } as any);

        consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock localStorage
        const localStorageMock = (function() {
            let store: Record<string, string> = {};
            return {
                getItem: function(key: string) {
                    return store[key] || null;
                },
                setItem: function(key: string, value: string) {
                    store[key] = value.toString();
                },
                removeItem: function(key: string) {
                    delete store[key];
                },
                clear: function() {
                    store = {};
                }
            };
        })();

        vi.stubGlobal('localStorage', localStorageMock);

        setCachedToken(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should send a push notification without authorization header if no token is cached', async () => {
        await triggerPushNotification('user123', 'Test Title', 'Test Body');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUserId: 'user123',
                title: 'Test Title',
                body: 'Test Body',
                data: undefined
            })
        });
    });

    it('should send a push notification with authorization header if token is cached', async () => {
        setCachedToken('test-token');

        await triggerPushNotification('user123', 'Test Title', 'Test Body', { key: 'value' });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                targetUserId: 'user123',
                title: 'Test Title',
                body: 'Test Body',
                data: { key: 'value' }
            })
        });
    });

    it('should handle and log fetch errors', async () => {
        const error = new Error('Network error');
        fetchMock.mockRejectedValue(error);

        await triggerPushNotification('user123', 'Test Title', 'Test Body');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(consoleErrorMock).toHaveBeenCalledTimes(1);
        expect(consoleErrorMock).toHaveBeenCalledWith('Push trigger failed:', error);
    });
});
