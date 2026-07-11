// @vitest-environment node
import { describe, it, expect } from 'vitest';
import argon2 from 'argon2';

describe('Password Hashing', () => {
  it('should hash and verify a password correctly', async () => {
    const password = 'mySuperSecretPassword123';
    
    // Hash
    const hash = await argon2.hash(password);
    expect(hash).toContain('$argon2');
    
    // Verify valid
    const isValid = await argon2.verify(hash, password);
    expect(isValid).toBe(true);
    
    // Verify invalid
    const isInvalid = await argon2.verify(hash, 'wrongPassword');
    expect(isInvalid).toBe(false);
  });
});
