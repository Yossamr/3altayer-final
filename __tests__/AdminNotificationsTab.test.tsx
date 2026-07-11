/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminNotificationsTab } from '../components/AdminNotificationsTab';
import toast from 'react-hot-toast';

vi.mock('../services/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../services/AppContext', () => ({
  useApp: () => ({
    users: [],
  }),
}));

vi.mock('../services/db', () => ({
  triggerPushNotification: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

describe('AdminNotificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show an error toast if title or body is empty', async () => {
    render(<AdminNotificationsTab />);

    // The button has the text of the translation key "ar_all_1261"
    const sendButton = screen.getByRole('button', { name: /ar_all_1261/i });

    // Click without entering title or body
    fireEvent.click(sendButton);

    // Assert the toast was called with the correct translation key
    expect(toast.error).toHaveBeenCalledWith('ar_all_1245');

    // The API mock should not have been called
    const { triggerPushNotification } = await import('../services/db');
    expect(triggerPushNotification).not.toHaveBeenCalled();
  });
});
