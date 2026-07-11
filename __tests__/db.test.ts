import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerUserInDB } from '../services/db';

// Create a spy for fetch
const fetchSpy = vi.spyOn(global, 'fetch');

describe('registerUserInDB', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
        global.localStorage = localStorageMock as any;
    });

    afterEach(() => {
        delete (global as any).localStorage;
    });

    it('should successfully register a user and cache the token', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({ success: true, token: 'mock-token' })
        };
        fetchSpy.mockResolvedValue(mockResponse as any);

        const result = await registerUserInDB('John Doe', '1234567890', 'password123', '123 Main St', 'zone-1');

        expect(result).toEqual({ success: true });
        expect(fetchSpy).toHaveBeenCalledWith('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'John Doe',
                phone: '1234567890',
                password: 'password123',
                address: '123 Main St',
                zoneId: 'zone-1'
            })
        });
        expect(global.localStorage.setItem).toHaveBeenCalledWith('al_tayyar_session_token', 'mock-token');
    });

    it('should return failure if the response is not ok', async () => {
        const mockResponse = {
            ok: false,
            json: async () => ({ success: false, message: 'Phone already exists' })
        };
        fetchSpy.mockResolvedValue(mockResponse as any);

        const result = await registerUserInDB('Jane Doe', '0987654321', 'pass456', '456 Side St', 'zone-2');

        expect(result).toEqual({ success: false, message: 'Phone already exists' });
    });

    it('should return failure with default message if message is missing', async () => {
        const mockResponse = {
            ok: false,
            json: async () => ({ success: false })
        };
        fetchSpy.mockResolvedValue(mockResponse as any);

        const result = await registerUserInDB('Jane Doe', '0987654321', 'pass456', '456 Side St', 'zone-2');

        expect(result).toEqual({ success: false, message: 'Registration failed' });
    });

    it('should return failure if the data success flag is false', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({ success: false, message: 'Invalid data' })
        };
        fetchSpy.mockResolvedValue(mockResponse as any);

        const result = await registerUserInDB('Jane Doe', '0987654321', 'pass456', '456 Side St', 'zone-2');

        expect(result).toEqual({ success: false, message: 'Invalid data' });
    });

    it('should catch errors and return an error message', async () => {
        fetchSpy.mockRejectedValue(new Error('Network error'));

        const result = await registerUserInDB('Alice', '111222333', 'mypass', '789 Oak St', 'zone-3');

        expect(result).toEqual({ success: false, message: 'Error connecting to the server' });
    });
});
