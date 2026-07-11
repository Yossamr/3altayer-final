/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatModal } from '../components/ChatModal';
import React from 'react';

// Mock services
vi.mock('../services/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../services/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

// Mock icons to avoid SVG issues
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="icon-message-circle" />,
  X: () => <div data-testid="icon-x" />,
  Mic: () => <div data-testid="icon-mic" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Image: () => <div data-testid="icon-image" />,
  Send: () => <div data-testid="icon-send" />,
  Camera: () => <div data-testid="icon-camera" />,
  Play: () => <div data-testid="icon-play" />,
  Pause: () => <div data-testid="icon-pause" />,
  Square: () => <div data-testid="icon-square" />,
  ImageIcon: () => <div data-testid="icon-image-icon" />,
}));

import { useApp } from '../services/AppContext';
import toast from 'react-hot-toast';

describe('ChatModal', () => {
  const mockOrder = {
    id: 'order-123',
    items: 'Test Item',
  };

  const mockOnClose = vi.fn();
  const mockSendMessage = vi.fn();
  const mockFetchOrderMessages = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.clearAllMocks();
    (useApp as any).mockReturnValue({
      currentUser: { id: 'user-1' },
      sendMessage: mockSendMessage,
      fetchOrderMessages: mockFetchOrderMessages,
      resetUnreadCount: vi.fn(),
    });
    // Mock Element.prototype.scrollIntoView
    if (typeof window !== 'undefined' && window.HTMLElement) {
      window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  it('handles failed sendMessage promise gracefully by showing an error toast', async () => {
    mockSendMessage.mockRejectedValue(new Error('Network error'));

    render(
      <ChatModal order={mockOrder as any} onClose={mockOnClose} />
    );

    // Find the text area and type a message
    const input = screen.getByPlaceholderText('ar_all_1244');
    fireEvent.change(input, { target: { value: 'Hello' } });

    // Find the send button - when text is typed, the button changes to Send
    const sendButtonIcon = screen.getByTestId('icon-send');
    const sendButton = sendButtonIcon.closest('button');
    expect(sendButton).toBeTruthy();

    // Click send
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('order-123', 'Hello', undefined, undefined);
    });

    await waitFor(() => {
      // Ensure the error toast is shown
      expect(toast.error).toHaveBeenCalledWith('ar_all_1247');
      // Verify loading state is false (button not disabled)
      expect(sendButton).not.toBeDisabled();
    });
  });
});
