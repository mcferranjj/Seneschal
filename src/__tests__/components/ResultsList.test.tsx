import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsList } from '../../components/ResultsList/ResultsList';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';

function makeRecord(id: string, name: string): CreatureRecord {
  return {
    id,
    name,
    nameLower: name.toLowerCase(),
    level: 1,
    traits: [],
    size: 'med',
    rarity: 'common',
    packSource: 'pathfinder-bestiary',
    blobSha: 'sha',
    data: {} as PF2ECreature,
  };
}

const defaultProps = {
  results: [],
  totalCount: 0,
  selectedId: null,
  onSelect: vi.fn(),
  loading: false,
  syncing: false,
  creatureCount: 0,
  sortBy: 'level' as const,
  onSortChange: vi.fn(),
};

// ---------------------------------------------------------------------------
// Empty / loading states
// ---------------------------------------------------------------------------
describe('ResultsList — empty states', () => {
  it('shows syncing message when syncing and no creatures exist', () => {
    render(<ResultsList {...defaultProps} syncing={true} creatureCount={0} />);
    expect(screen.getByText(/syncing creature database/i)).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(<ResultsList {...defaultProps} loading={true} />);
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('shows "No creatures yet" when no results and no creatures in DB', () => {
    render(<ResultsList {...defaultProps} results={[]} creatureCount={0} />);
    expect(screen.getByText(/no creatures yet/i)).toBeInTheDocument();
  });

  it('shows "No results" when no search results but creatures exist in DB', () => {
    render(<ResultsList {...defaultProps} results={[]} creatureCount={100} />);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('prioritises syncing state over loading', () => {
    render(<ResultsList {...defaultProps} syncing={true} loading={true} creatureCount={0} />);
    expect(screen.getByText(/syncing creature database/i)).toBeInTheDocument();
  });

  it('does not show syncing message when syncing but creatures already exist', () => {
    render(<ResultsList {...defaultProps} syncing={true} creatureCount={500} results={[makeRecord('1', 'Goblin')]} />);
    expect(screen.queryByText(/syncing creature database/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Creature list
// ---------------------------------------------------------------------------
describe('ResultsList — creature list', () => {
  const creatures = [
    makeRecord('1', 'Goblin Warrior'),
    makeRecord('2', 'Ancient Dragon'),
  ];

  it('renders a row for each result', () => {
    render(<ResultsList {...defaultProps} results={creatures} creatureCount={2} />);
    expect(screen.getByText('Goblin Warrior')).toBeInTheDocument();
    expect(screen.getByText('Ancient Dragon')).toBeInTheDocument();
  });

  it('shows result count', () => {
    render(<ResultsList {...defaultProps} results={creatures} totalCount={2} creatureCount={2} />);
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  it('shows singular "1 result" for a single result', () => {
    render(<ResultsList {...defaultProps} results={[creatures[0]]} totalCount={1} creatureCount={1} />);
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('displays the totalCount value in the header', () => {
    const many = Array.from({ length: 50 }, (_, i) => makeRecord(`id-${i}`, `Creature ${i}`));
    render(<ResultsList {...defaultProps} results={many} totalCount={50} creatureCount={5000} />);
    expect(screen.getByText('50 results')).toBeInTheDocument();
  });

  it('calls onSelect when a creature row is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <ResultsList {...defaultProps} results={[creatures[0]]} creatureCount={1} onSelect={onSelect} />,
    );
    const buttons = screen.getAllByRole('button');
    const creatureRow = buttons.find(b => b.textContent?.includes('Goblin Warrior'))!;
    await userEvent.click(creatureRow);
    expect(onSelect).toHaveBeenCalledWith(creatures[0]);
  });

  it('passes selectedId to highlight the correct row', () => {
    render(
      <ResultsList
        {...defaultProps}
        results={creatures}
        creatureCount={2}
        selectedId="1"
      />,
    );
    const buttons = screen.getAllByRole('button');
    const goblinButton = buttons.find(b => b.textContent?.includes('Goblin'));
    expect(goblinButton).toHaveAttribute('aria-selected', 'true');
  });

  it('has listbox role for accessibility', () => {
    render(<ResultsList {...defaultProps} results={creatures} creatureCount={2} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
