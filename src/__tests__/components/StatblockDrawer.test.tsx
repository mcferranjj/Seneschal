import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatblockDrawer, traitColor } from '../../components/StatblockDrawer/StatblockDrawer';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';

// ---------------------------------------------------------------------------
// traitColor (pure function)
// ---------------------------------------------------------------------------
describe('traitColor', () => {
  it('returns rarity color when trait matches rarity', () => {
    expect(traitColor('uncommon', 'uncommon')).toBe('#c35a11');
    expect(traitColor('rare', 'rare')).toBe('#3a1fa8');
    expect(traitColor('unique', 'unique')).toBe('#5a1a8a');
  });

  it('returns alignment color for good/evil/law/chaos traits', () => {
    expect(traitColor('lg', 'common')).toBe('#2255aa');
    expect(traitColor('ce', 'common')).toBe('#aa2222');
    expect(traitColor('n', 'common')).toBe('#555');
    expect(traitColor('good', 'common')).toBe('#2255aa');
    expect(traitColor('evil', 'common')).toBe('#aa2222');
  });

  it('returns default brown color for generic traits', () => {
    expect(traitColor('goblin', 'common')).toBe('#8b4513');
    expect(traitColor('humanoid', 'common')).toBe('#8b4513');
    expect(traitColor('fire', 'common')).toBe('#8b4513');
  });

  it('compares trait lowercase against alignment map', () => {
    expect(traitColor('GOOD', 'common')).toBe('#2255aa');
    expect(traitColor('EVIL', 'common')).toBe('#aa2222');
  });

  it('does not apply rarity color when trait name does not match rarity', () => {
    // "uncommon" as a trait on a common creature → default brown
    expect(traitColor('uncommon', 'common')).toBe('#8b4513');
  });
});

// ---------------------------------------------------------------------------
// StatblockDrawer fixtures
// ---------------------------------------------------------------------------
function makeCreatureRecord(overrides: Partial<PF2ECreature> = {}): CreatureRecord {
  const data: PF2ECreature = {
    _id: 'goblin-id',
    name: 'Goblin Warrior',
    type: 'npc',
    items: [],
    system: {
      details: { level: { value: 1 } },
      traits: { size: { value: 'sm' }, value: ['goblin', 'humanoid'], rarity: 'common' },
      attributes: {
        ac: { value: 16, details: '' },
        hp: { value: 6, max: 6 },
        speed: { value: 25 },
      },
      saves: {
        fortitude: { value: 5 },
        reflex: { value: 6 },
        will: { value: 3 },
      },
      abilities: {
        str: { mod: 2 },
        dex: { mod: 3 },
        con: { mod: 0 },
        int: { mod: -1 },
        wis: { mod: 0 },
        cha: { mod: -1 },
      },
      perception: { mod: 5 },
    },
    ...overrides,
  };
  return {
    id: 'goblin-id',
    name: 'Goblin Warrior',
    nameLower: 'goblin warrior',
    level: 1,
    traits: ['goblin', 'humanoid'],
    size: 'sm',
    rarity: 'common',
    packSource: 'pathfinder-bestiary',
    blobSha: 'sha',
    data,
  };
}

// ---------------------------------------------------------------------------
// StatblockDrawer — closed state
// ---------------------------------------------------------------------------
describe('StatblockDrawer — closed', () => {
  it('renders without content when creature is null', () => {
    render(<StatblockDrawer creature={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Goblin Warrior')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// StatblockDrawer — open state
// ---------------------------------------------------------------------------
describe('StatblockDrawer — open', () => {
  it('renders creature name', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText('Goblin Warrior')).toBeInTheDocument();
  });

  it('renders creature level', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText('Creature 1')).toBeInTheDocument();
  });

  it('renders AC value', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText('16')).toBeInTheDocument();
  });

  it('renders HP max value', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders saves', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText('Fort')).toBeInTheDocument();
    expect(screen.getByText('Ref')).toBeInTheDocument();
    expect(screen.getByText('Will')).toBeInTheDocument();
  });

  it('renders trait chips', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText('goblin')).toBeInTheDocument();
    expect(screen.getByText('humanoid')).toBeInTheDocument();
  });

  it('includes rarity in traits when non-common', () => {
    const record = makeCreatureRecord();
    (record.data as PF2ECreature).system.traits!.rarity = 'rare';
    render(<StatblockDrawer creature={record} onClose={vi.fn()} />);
    expect(screen.getByText('rare')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close statblock/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders perception string', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText(/perception \+5/i)).toBeInTheDocument();
  });

  it('renders speed', () => {
    render(<StatblockDrawer creature={makeCreatureRecord()} onClose={vi.fn()} />);
    expect(screen.getByText(/25 ft\./)).toBeInTheDocument();
  });

  it('renders attack blocks', () => {
    const record = makeCreatureRecord({
      items: [
        {
          _id: 'atk-1',
          name: 'Jaws',
          type: 'melee',
          system: {
            bonus: { value: 7 },
            damageRolls: { abc: { damage: '1d6', damageType: 'piercing' } },
            traits: { value: [] },
            attackEffects: { value: [] },
          },
        },
      ],
    });
    render(<StatblockDrawer creature={record} onClose={vi.fn()} />);
    expect(screen.getByText('Jaws')).toBeInTheDocument();
    expect(screen.getByText(/1d6 piercing/)).toBeInTheDocument();
  });

  it('renders passive ability blocks', () => {
    const record = makeCreatureRecord({
      items: [
        {
          _id: 'pas-1',
          name: 'Darkvision',
          type: 'action',
          system: { actionType: { value: 'passive' }, description: { value: 'Can see in the dark.' } },
        },
      ],
    });
    render(<StatblockDrawer creature={record} onClose={vi.fn()} />);
    expect(screen.getByText('Darkvision')).toBeInTheDocument();
  });

  it('renders reaction blocks with trigger', () => {
    const record = makeCreatureRecord({
      items: [
        {
          _id: 'rea-1',
          name: 'Attack of Opportunity',
          type: 'action',
          system: {
            actionType: { value: 'reaction' },
            trigger: { value: 'A creature in reach uses a ranged attack.' },
            description: { value: '' },
            traits: { value: [] },
          },
        },
      ],
    });
    render(<StatblockDrawer creature={record} onClose={vi.fn()} />);
    expect(screen.getByText('Attack of Opportunity')).toBeInTheDocument();
    expect(screen.getByText(/a creature in reach/i)).toBeInTheDocument();
  });

  it('renders source publication when present', () => {
    const record = makeCreatureRecord({
      system: {
        details: {
          level: { value: 1 },
          publication: { title: 'Pathfinder Bestiary' },
        },
        traits: { size: { value: 'sm' }, value: [], rarity: 'common' },
      },
    });
    render(<StatblockDrawer creature={record} onClose={vi.fn()} />);
    expect(screen.getByText(/pathfinder bestiary/i)).toBeInTheDocument();
  });
});
