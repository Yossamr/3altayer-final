import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createZoneInDB } from '../services/db';

describe('createZoneInDB', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should call createZoneInDB and return true on success', async () => {
    const mockZone = { id: 'zone1', name: 'Zone 1', baseFee: 10, serviceFee: 5, enabled: true };

    // Mock the fetch response for success
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: true })
    });

    const result = await createZoneInDB(mockZone as any);
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/rpc', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ method: 'createZoneInDB', args: [mockZone] })
    }));
  });

  it('should throw an error if the server returns success: false', async () => {
    const mockZone = { id: 'zone1', name: 'Zone 1', baseFee: 10, serviceFee: 5, enabled: true };

    // Mock the fetch response for failure
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: 'Failed to create zone' })
    });

    await expect(createZoneInDB(mockZone as any)).rejects.toThrow('Failed to create zone');
  });

  it('should throw an error if fetch fails (e.g. network error)', async () => {
    const mockZone = { id: 'zone1', name: 'Zone 1', baseFee: 10, serviceFee: 5, enabled: true };

    // Mock a fetch rejection
    (global.fetch as any).mockRejectedValue(new Error('Network Error'));

    await expect(createZoneInDB(mockZone as any)).rejects.toThrow('Network Error');
  });
});
