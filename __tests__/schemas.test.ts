import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../server';

describe('Auth Schemas Validation', () => {
  describe('loginSchema', () => {
    it('should validate correct input', () => {
      const input = { phone: '01234567890', password: 'password123' };
      expect(() => loginSchema.parse(input)).not.toThrow();
    });

    it('should fail if phone is empty', () => {
      const input = { phone: '', password: 'password123' };
      expect(() => loginSchema.parse(input)).toThrow();
    });

    it('should fail if password is empty', () => {
      const input = { phone: '01234567890', password: '' };
      expect(() => loginSchema.parse(input)).toThrow();
    });

    it('should strip extra whitespace from phone', () => {
      const input = { phone: '  01234567890  ', password: 'password123' };
      const parsed = loginSchema.parse(input);
      expect(parsed.phone).toBe('01234567890');
    });
  });

  describe('registerSchema', () => {
    it('should validate correct input', () => {
      const input = {
        name: 'Test User',
        phone: '01234567890',
        password: 'password123',
        address: '123 Main St',
        zoneId: 'zone-1'
      };
      expect(() => registerSchema.parse(input)).not.toThrow();
    });

    it('should fail if name is too short', () => {
      const input = {
        name: 'A',
        phone: '01234567890',
        password: 'password123',
        address: '123 Main St',
        zoneId: 'zone-1'
      };
      expect(() => registerSchema.parse(input)).toThrow();
    });

    it('should fail if phone is invalid', () => {
      const input = {
        name: 'Test User',
        phone: '123',
        password: 'password123',
        address: '123 Main St',
        zoneId: 'zone-1'
      };
      expect(() => registerSchema.parse(input)).toThrow();
    });
  });
});
