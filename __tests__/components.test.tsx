import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatusBadge } from '../components/StatusBadge';
import { OrderStatus } from '../types';

// Mock the LanguageContext
vi.mock('../services/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      // Return a predictable string based on the key
      const translations: Record<string, string> = {
        'ar_all_1030': 'Pending',
        'ar_all_1031': 'Accepted',
        'ar_all_1036': 'Delivered',
      };
      return translations[key] || key;
    }
  })
}));

describe('StatusBadge Component', () => {
  it('renders PENDING status correctly', () => {
    render(<StatusBadge status={OrderStatus.PENDING} />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it('renders ACCEPTED status correctly', () => {
    render(<StatusBadge status={OrderStatus.ACCEPTED} />);
    const badge = screen.getByText('Accepted');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('renders DELIVERED status correctly', () => {
    render(<StatusBadge status={OrderStatus.DELIVERED} />);
    const badge = screen.getByText('Delivered');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100');
  });
});
