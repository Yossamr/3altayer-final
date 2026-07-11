/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingMapView } from '../TrackingMapView';
import { useApp } from '../../services/AppContext';

// Mock contexts and hooks
vi.mock('../../services/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key })
}));

vi.mock('../../services/AppContext', () => ({
  useApp: vi.fn()
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  Polyline: ({ positions }: any) => <div data-testid="polyline" data-positions={JSON.stringify(positions)} />,
  useMap: () => ({
    flyTo: vi.fn(),
    getZoom: vi.fn(),
    invalidateSize: vi.fn()
  })
}));

describe('TrackingMapView', () => {
  const mockSyncDriverLocation = vi.fn();
  const mockCalculateDistance = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    (useApp as any).mockReturnValue({
      syncDriverLocation: mockSyncDriverLocation,
      calculateDistance: mockCalculateDistance,
    });
  });

  const mockOrder = {
    id: '1',
    deliveryAddress: { lat: 31.0, lng: 30.0 }
  } as any;

  const mockDriver = {
    id: 'd1',
    name: 'Test Driver',
    currentLat: 31.1,
    currentLng: 30.1
  } as any;

  it('should handle routing service error gracefully', async () => {
    // Mock the fetch to simulate a network error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<TrackingMapView order={mockOrder} driver={mockDriver} onClose={() => {}} />);

    // Check that we're falling back properly - meaning it should render the map without crashing
    await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // We expect polylines to be rendered with the fallback positions: [driverPos, destPos]
    await waitFor(() => {
        const polylines = screen.getAllByTestId('polyline');
        expect(polylines.length).toBeGreaterThan(0);

        // Assert the fallback positions are passed to Polyline
        const expectedPositions = [[31.1, 30.1], [31.0, 30.0]];
        expect(polylines[0]).toHaveAttribute('data-positions', JSON.stringify(expectedPositions));
    });
  });

  it('should handle syncDriverLocation returning null (e.g. driver offline/error) gracefully', async () => {
    // Mock successful fetch for initial render
    (global.fetch as any).mockResolvedValue({
        json: async () => ({
            routes: [{ geometry: { coordinates: [[30.1, 31.1], [30.0, 31.0]] }, duration: 600 }]
        })
    });

    // Mock syncDriverLocation returning null
    mockSyncDriverLocation.mockResolvedValueOnce(null);

    render(<TrackingMapView order={mockOrder} driver={mockDriver} onClose={() => {}} />);

    await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Should still display driver name properly and not crash.
    // And it doesn't update the internal state incorrectly (maintains old marker/state).
    expect(screen.getByText(/Test Driver/i)).toBeInTheDocument();
  });
});
