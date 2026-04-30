import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatureRow } from '../../components/ResultsList/CreatureRow';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';

function makeRecord(overrides: Partial<CreatureRecord> = {}): CreatureRecord {
  return {
    id: 'id-1',
    name: 'Goblin Warrior',
    nameLower: 'goblin warrior',
    level: 1,
    traits: ['goblin', 'humanoid'],
    size: 'sm',
    rarity: 'common',
    packSource: 'pathfinder-bestiary',
    blobSha: 'sha',
    data: {} as PF2ECreature,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------
describe('CreatureRow', () => {
  it('renders creature name', () => {
    render(<CreatureRow creature={makeRecord()} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Goblin Warrior')).toBeInTheDocument();
  });

  it('renders level badge', () => {
    render(<CreatureRow creature={makeRecord({ level: 7 })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Lvl 7')).toBeInTheDocument();
  });

  it('renders size label', () => {
    render(<CreatureRow creature={makeRecord({ size: 'sm' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Small')).toBeInTheDocument();
  });

  it('uses raw value for unknown size codes', () => {
    render(<CreatureRow creature={makeRecord({ size: 'colossal' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('colossal')).toBeInTheDocument();
  });

  it.each([
    ['tiny', 'Tiny'],
    ['sm', 'Small'],
    ['med', 'Medium'],
    ['lg', 'Large'],
    ['huge', 'Huge'],
    ['grg', 'Gargantuan'],
  ])('maps size code "%s" to label "%s"', (size, label) => {
    render(<CreatureRow creature={makeRecord({ size })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Rarity
  // ---------------------------------------------------------------------------
  it('does not show rarity tag for common creatures', () => {
    render(<CreatureRow creature={makeRecord({ rarity: 'common' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.queryByText('common')).not.toBeInTheDocument();
  });

  it('shows rarity tag for uncommon creatures', () => {
    render(<CreatureRow creature={makeRecord({ rarity: 'uncommon' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('uncommon')).toBeInTheDocument();
  });

  it('shows rarity tag for rare creatures', () => {
    render(<CreatureRow creature={makeRecord({ rarity: 'rare' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('rare')).toBeInTheDocument();
  });

  it('shows rarity tag for unique creatures', () => {
    render(<CreatureRow creature={makeRecord({ rarity: 'unique' })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('unique')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Traits
  // ---------------------------------------------------------------------------
  it('shows up to 4 traits', () => {
    const traits = ['fire', 'dragon', 'huge', 'evil'];
    render(<CreatureRow creature={makeRecord({ traits })} isSelected={false} onClick={vi.fn()} />);
    traits.forEach(t => expect(screen.getByText(t)).toBeInTheDocument());
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('shows "+N more" badge when more than 4 traits', () => {
    const traits = ['fire', 'dragon', 'huge', 'evil', 'lawful', 'chaotic'];
    render(<CreatureRow creature={makeRecord({ traits })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows exactly the first 4 traits when overflow exists', () => {
    const traits = ['fire', 'dragon', 'huge', 'evil', 'lawful'];
    render(<CreatureRow creature={makeRecord({ traits })} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('fire')).toBeInTheDocument();
    expect(screen.getByText('dragon')).toBeInTheDocument();
    expect(screen.getByText('huge')).toBeInTheDocument();
    expect(screen.getByText('evil')).toBeInTheDocument();
    expect(screen.queryByText('lawful')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<CreatureRow creature={makeRecord()} isSelected={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('sets aria-selected to true when selected', () => {
    render(<CreatureRow creature={makeRecord()} isSelected={true} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'true');
  });

  it('sets aria-selected to false when not selected', () => {
    render(<CreatureRow creature={makeRecord()} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-selected', 'false');
  });
});
