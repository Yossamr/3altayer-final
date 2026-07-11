// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginScreen from '../components/LoginScreen';
import { vi } from 'vitest';
import React from 'react';

const mockUseApp = {
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  linkGoogleAccount: vi.fn(),
  completeGoogleRegistration: vi.fn(),
  register: vi.fn(),
  zones: []
};

vi.mock('../services/AppContext', () => ({
  useApp: () => mockUseApp
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

  it('should display error message on network failure during regular login', async () => {
    mockUseApp.login.mockRejectedValueOnce(new Error('Network login error'));

    render(<LoginScreen />);

    // Switch to login tab if not already
    const phoneInput = screen.getByPlaceholderText('Phone number');
    fireEvent.change(phoneInput, { target: { value: '01234567890' } });

    const passwordInput = screen.getByPlaceholderText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      // In handleLoginSubmit it sets error to t("ar_all_1166") on catch
      expect(document.body).toHaveTextContent('ar_all_1166');
    });
  });

  it('should display error message on network failure during driver registration', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Simulated Network Error'));
    global.fetch = fetchMock;

    const originalFileReader = global.FileReader;
    class MockFileReader {
      onloadend: (() => void) | null = null;
      result = 'data:image/png;base64,mock';
      readAsDataURL() {
        if (this.onloadend) {
          this.onloadend();
        }
      }
    }
    global.FileReader = MockFileReader as any;

    render(<LoginScreen />);

    fireEvent.click(screen.getByText('Join as Driver 🛵'));

    fireEvent.change(screen.getByText('Full Name').nextElementSibling as HTMLInputElement, { target: { value: 'Test Driver' } });
    fireEvent.change(screen.getByText('Phone Number').nextElementSibling as HTMLInputElement, { target: { value: '1234567890' } });
    fireEvent.change(screen.getByText('Address').nextElementSibling as HTMLInputElement, { target: { value: '123 Main St' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bicycle' }));

    const idFrontInput = screen.getByText('ID Card Front 💳').nextElementSibling as HTMLInputElement;
    const file1 = new File(['test'], 'front.png', { type: 'image/png' });
    fireEvent.change(idFrontInput, { target: { files: [file1] } });

    const idBackInput = screen.getByText('ID Card Back 💳').nextElementSibling as HTMLInputElement;
    const file2 = new File(['test'], 'back.png', { type: 'image/png' });
    fireEvent.change(idBackInput, { target: { files: [file2] } });

    await waitFor(() => {
        const imgs = screen.queryAllByRole('img');
        const driverImgs = imgs.filter(img => img.getAttribute('src') === 'data:image/png;base64,mock');
        expect(driverImgs.length).toBe(2);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
        expect(document.body).toHaveTextContent(/Simulated Network Error/i);
    });

    global.FileReader = originalFileReader;
  });
});
