// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginScreen from '../components/LoginScreen';

const mockLogin = vi.fn();

vi.mock('../services/AppContext', () => ({
  useApp: () => ({
    login: mockLogin,
    loginWithGoogle: vi.fn(),
    linkGoogleAccount: vi.fn(),
    completeGoogleRegistration: vi.fn(),
    register: vi.fn(),
    zones: []
  })
}));

vi.mock('../services/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => key,
    setLanguage: vi.fn()
  })
}));

describe('LoginScreen Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message on login failure (e.g. OTP verification failure)', async () => {
    mockLogin.mockResolvedValue({ success: false, message: 'Invalid OTP code' });

    render(<LoginScreen />);

    const phoneInput = screen.getAllByPlaceholderText('Phone number')[0];
    const passwordInput = screen.getAllByPlaceholderText('Password')[0];
    const loginButton = screen.getAllByRole('button', { name: 'Login' })[0];

    fireEvent.change(phoneInput, { target: { value: '01234567890' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-otp' } });

    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP code')).toBeInTheDocument();
    });

    expect(mockLogin).toHaveBeenCalledWith('01234567890', 'wrong-otp', true);
  });

  it('displays fallback error message when login throws an exception', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));

    render(<LoginScreen />);

    const phoneInput = screen.getAllByPlaceholderText('Phone number')[0];
    const passwordInput = screen.getAllByPlaceholderText('Password')[0];
    const loginButton = screen.getAllByRole('button', { name: 'Login' })[0];

    fireEvent.change(phoneInput, { target: { value: '01234567890' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-otp' } });

    fireEvent.click(loginButton);

    await waitFor(() => {
      // In LanguageContext mock, t(key) returns the key
      expect(screen.getByText('ar_all_1166')).toBeInTheDocument();
    });
  });
});
