
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dashboard from '../../pages/dashboard';
import { auth } from '../../lib/firebase';
import { useProxyData } from '../../lib/hooks/useProxyData';

// Mock Firebase and custom hooks
vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
  }
}));

vi.mock('../../lib/hooks/useProxyData', () => ({
  useProxyData: vi.fn()
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('loads and displays bandwidth data', async () => {
    const mockProxyData = {
      proxyServers: [
        { id: '1', name: 'Test Proxy', host: 'test.host', port: 8080, isActive: true }
      ],
      sessions: [
        { id: '1', bandwidthUsed: 1000, startTime: new Date(), endTime: null }
      ],
      loading: false
    };

    (useProxyData as any).mockReturnValue(mockProxyData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Proxy')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  it('maintains session after page refresh', async () => {
    const mockProxyData = {
      proxyServers: [{ id: '1', isActive: true }],
      sessions: [{ id: '1', startTime: new Date() }],
      loading: false
    };

    (useProxyData as any).mockReturnValue(mockProxyData);

    const { rerender } = render(<Dashboard />);

    // Simulate page refresh
    act(() => {
      rerender(<Dashboard />);
    });

    await waitFor(() => {
      expect(useProxyData).toHaveBeenCalledWith('test-user');
      expect(screen.getByText(/Active/i)).toBeInTheDocument();
    });
  });

  it('handles reconnection scenarios', async () => {
    const mockProxyData = {
      proxyServers: [{ id: '1', isActive: true }],
      sessions: [],
      loading: false
    };

    (useProxyData as any).mockReturnValue(mockProxyData);

    render(<Dashboard />);

    // Simulate connection loss and reconnection
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Active/i)).toBeInTheDocument();
    });
  });
});
