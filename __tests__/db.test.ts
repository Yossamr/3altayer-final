import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitOrderRatingInDB } from "../services/db";

// Mock localStorage on global to avoid "localStorage is not defined" error
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock
});

describe("db.ts tests", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    originalFetch = global.fetch;

    // Suppress console.error in tests for RPC Error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("submitOrderRatingInDB should throw an error when API returns an error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, message: "Rating failed" })
    }) as unknown as typeof global.fetch;

    await expect(submitOrderRatingInDB("order1", 5, "Great")).rejects.toThrow("Rating failed");
  });
});
