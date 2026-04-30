import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar, formatTimestamp } from '../../components/TopBar/TopBar';

// ---------------------------------------------------------------------------
// formatTimestamp (pure function)
// ---------------------------------------------------------------------------
describe('formatTimestamp', () => {
  it('returns a non-empty string for a valid timestamp', () => {
    const ts = new Date('2026-03-15T14:30:00').getTime();
    const result = formatTimestamp(ts);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('includes the day number in the output', () => {
    const ts = new Date('2026-03-15T14:30:00').getTime();
    expect(formatTimestamp(ts)).toContain('15');
  });
});

// ---------------------------------------------------------------------------
// TopBar — brand
// ---------------------------------------------------------------------------
describe('TopBar', () => {
  it('renders brand name Seneschal', () => {
    render(<TopBar />);
    expect(screen.getByText('Seneschal')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<TopBar />);
    expect(screen.getByText('PF2E GM Assistant')).toBeInTheDocument();
  });
});
