import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { triggerPushNotification, setCachedToken } from '../services/db';

describe('triggerPushNotification', () => {
    let fetchMock: any;

    beforeEach(() => {
        fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

        const localStorageMock = (function () {
            let store: Record<string, string> = {};
            return {
                getItem: function (key: string) {
                    return store[key] || null;
                },
                setItem: function (key: string, value: string) {
                    store[key] = value.toString();
                },
                removeItem: function (key: string) {
                    delete store[key];
                },
                clear: function () {
                    store = {};
                }
            };
        })();
        vi.stubGlobal('localStorage', localStorageMock);
        setCachedToken(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should trigger push notification with correct parameters', async () => {
        setCachedToken('test-token');
        await triggerPushNotification('user-1', 'Test Title', 'Test Body', { extra: 'data' });

        expect(fetchMock).toHaveBeenCalledWith('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                targetUserId: 'user-1',
                title: 'Test Title',
                body: 'Test Body',
                data: { extra: 'data' }
            })
        });
    });

    it('should handle push notification without data', async () => {
        setCachedToken('test-token');
        await triggerPushNotification('user-1', 'Test Title', 'Test Body');

        expect(fetchMock).toHaveBeenCalledWith('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                targetUserId: 'user-1',
                title: 'Test Title',
                body: 'Test Body'
            })
        });
    });

    it('should handle push notification with empty object data', async () => {
        setCachedToken('test-token');
        await triggerPushNotification('user-1', 'Test Title', 'Test Body', {});

        expect(fetchMock).toHaveBeenCalledWith('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                targetUserId: 'user-1',
                title: 'Test Title',
                body: 'Test Body',
                data: {}
            })
        });
    });

    it('should trigger push notification without authorization header if no token is cached', async () => {
        await triggerPushNotification('user-1', 'Test Title', 'Test Body');

        expect(fetchMock).toHaveBeenCalledWith('/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                targetUserId: 'user-1',
                title: 'Test Title',
                body: 'Test Body'
            })
        });
    });

    it('should catch and log error if fetch fails', async () => {
        const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
        fetchMock.mockRejectedValue(new Error('Network error'));

        await triggerPushNotification('user-1', 'Test Title', 'Test Body');

        expect(consoleErrorMock).toHaveBeenCalledWith('Push trigger failed:', new Error('Network error'));
    });
});
