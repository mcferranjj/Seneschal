import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPanel } from '../../components/SearchPanel/SearchPanel';
import { DEFAULT_FILTERS } from '../../search/search';
import type { SearchFilters } from '../../search/search';

// Mock the Dexie-dependent search functions
vi.mock('../../search/search', async importOriginal => {
  const actual = await importOriginal<typeof import('../../search/search')>();
  return {
    ...actual,
    getAllTraits: vi.fn().mockResolvedValue(['dragon', 'fire', 'goblin', 'humanoid']),
    getAllPackSourcesWithMeta: vi.fn().mockResolvedValue([
      { name: 'monster-core', era: 'remaster', category: 'core' },
      { name: 'npc-gallery', era: 'legacy', category: 'core' },
      { name: 'pathfinder-bestiary', era: 'legacy', category: 'core' },
    ]),
  };
});

function renderPanel(filters: SearchFilters = DEFAULT_FILTERS, onChange = vi.fn(), disabled = false) {
  return { onChange, ...render(<SearchPanel filters={filters} onChange={onChange} disabled={disabled} />) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('SearchPanel — rendering', () => {
  it('renders name input', async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument());
  });

  it('renders level min and max inputs', () => {
    renderPanel();
    const numberInputs = screen.getAllByRole('spinbutton');
    expect(numberInputs).toHaveLength(2);
  });

  it('renders size checkboxes for all sizes', () => {
    renderPanel();
    expect(screen.getByRole('checkbox', { name: /tiny/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /gargantuan/i })).toBeInTheDocument();
  });

  it('renders rarity checkboxes', () => {
    renderPanel();
    expect(screen.getByRole('checkbox', { name: 'Common' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Unique' })).toBeInTheDocument();
  });

  it('renders era group headers after mount', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Remaster' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Legacy' })).toBeInTheDocument();
    });
  });

  it('renders source checkboxes for individual packs after mount', async () => {
    renderPanel();
    // Pack names are displayed via .replace(/-/g, ' '), so dashes become spaces
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'pathfinder bestiary' })).toBeInTheDocument();
    });
  });

  it('renders Clear filters button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('shows existing trait chips', () => {
    renderPanel({ ...DEFAULT_FILTERS, traits: ['goblin', 'humanoid'] });
    expect(screen.getByText('goblin')).toBeInTheDocument();
    expect(screen.getByText('humanoid')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Name filter
// ---------------------------------------------------------------------------
describe('SearchPanel — name filter', () => {
  it('calls onChange with updated name', async () => {
    const { onChange } = renderPanel();
    const input = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(input, 'g');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'g' }));
  });
});

// ---------------------------------------------------------------------------
// Level filter
// ---------------------------------------------------------------------------
describe('SearchPanel — level filter', () => {
  it('calls onChange when levelMin changes', () => {
    const { onChange } = renderPanel();
    const [minInput] = screen.getAllByRole('spinbutton');
    // Controlled inputs with a mock onChange don't reflect updates — use fireEvent directly
    fireEvent.change(minInput, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ levelMin: 3 }));
  });

  it('calls onChange when levelMax changes', () => {
    const { onChange } = renderPanel();
    const [, maxInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(maxInput, { target: { value: '10' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ levelMax: 10 }));
  });
});

// ---------------------------------------------------------------------------
// Trait chips
// ---------------------------------------------------------------------------
describe('SearchPanel — trait chips', () => {
  it('adds a trait when Enter is pressed in the trait input', async () => {
    const { onChange } = renderPanel();
    const traitInput = screen.getByPlaceholderText(/add trait/i);
    await userEvent.type(traitInput, 'fire{Enter}');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ traits: ['fire'] }));
  });

  it('trims and lowercases the trait before adding', async () => {
    const { onChange } = renderPanel();
    const traitInput = screen.getByPlaceholderText(/add trait/i);
    await userEvent.type(traitInput, '  DRAGON  {Enter}');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ traits: ['dragon'] }));
  });

  it('does not add a duplicate trait', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, traits: ['fire'] });
    const traitInput = screen.getByPlaceholderText(/add trait/i);
    await userEvent.type(traitInput, 'fire{Enter}');
    // onChange should not be called with 'fire' added again
    for (const call of onChange.mock.calls) {
      expect(call[0].traits.filter((t: string) => t === 'fire')).toHaveLength(1);
    }
  });

  it('removes a trait when its × button is clicked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, traits: ['goblin'] });
    const removeBtn = screen.getByRole('button', { name: /remove trait goblin/i });
    await userEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ traits: [] }));
  });
});

// ---------------------------------------------------------------------------
// Size checkboxes
// ---------------------------------------------------------------------------
describe('SearchPanel — size checkboxes', () => {
  it('calls onChange with the size added when a size checkbox is checked', async () => {
    const { onChange } = renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /huge/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sizes: ['huge'] }));
  });

  it('calls onChange with the size removed when a checked size checkbox is unchecked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, sizes: ['huge'] });
    await userEvent.click(screen.getByRole('checkbox', { name: /huge/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sizes: [] }));
  });

  it('supports multiple sizes selected simultaneously', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, sizes: ['huge'] });
    await userEvent.click(screen.getByRole('checkbox', { name: /gargantuan/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sizes: ['huge', 'grg'] }));
  });
});

// ---------------------------------------------------------------------------
// Rarity checkboxes
// ---------------------------------------------------------------------------
describe('SearchPanel — rarity checkboxes', () => {
  it('calls onChange with the rarity added when a rarity checkbox is checked', async () => {
    const { onChange } = renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /rare/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rarities: ['rare'] }));
  });

  it('calls onChange with the rarity removed when a checked rarity checkbox is unchecked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, rarities: ['rare'] });
    await userEvent.click(screen.getByRole('checkbox', { name: /rare/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rarities: [] }));
  });
});

// ---------------------------------------------------------------------------
// Source checkboxes
// ---------------------------------------------------------------------------
describe('SearchPanel — source checkboxes', () => {
  it('checks the pack checkbox for a pre-selected pack source', async () => {
    renderPanel({ ...DEFAULT_FILTERS, packSources: ['pathfinder-bestiary'] });
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'pathfinder bestiary' })).toBeChecked();
    });
  });

  it('calls onChange with source added when a pack checkbox is checked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, packSources: [] });
    await waitFor(() => screen.getByRole('checkbox', { name: 'npc gallery' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'npc gallery' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ packSources: ['npc-gallery'] }));
  });

  it('calls onChange with source removed when a checked pack checkbox is unchecked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, packSources: ['npc-gallery'] });
    await waitFor(() => screen.getByRole('checkbox', { name: 'npc gallery' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'npc gallery' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ packSources: [] }));
  });

  it('toggles all packs in an era when the era checkbox is clicked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, packSources: [] });
    await waitFor(() => screen.getByRole('checkbox', { name: 'Legacy' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Legacy' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        packSources: expect.arrayContaining(['npc-gallery', 'pathfinder-bestiary']),
      })
    );
  });

  it('toggles all packs in a category when the category checkbox is clicked', async () => {
    const { onChange } = renderPanel({ ...DEFAULT_FILTERS, packSources: [] });
    // Two "Core" checkboxes render (one per era) — wait for them with getAllByRole
    await waitFor(() => screen.getAllByRole('checkbox', { name: 'Core' }));
    // Click the first (Remaster Core)
    const [remasterCore] = screen.getAllByRole('checkbox', { name: 'Core' });
    await userEvent.click(remasterCore);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ packSources: expect.arrayContaining(['monster-core']) })
    );
  });
});

// ---------------------------------------------------------------------------
// Remaster-packs initialization
// ---------------------------------------------------------------------------
describe('SearchPanel — remaster-packs initialization', () => {
  it('pre-selects remaster packs via onChange when pack list loads and packSources is empty', async () => {
    const { onChange } = renderPanel(DEFAULT_FILTERS, vi.fn(), false);
    // Mock returns monster-core (remaster), npc-gallery and pathfinder-bestiary (legacy)
    // Only remaster packs should be auto-selected
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ packSources: ['monster-core'] })
      );
    });
  });

  it('does not override packSources when they are already set', async () => {
    const { onChange } = renderPanel(
      { ...DEFAULT_FILTERS, packSources: ['npc-gallery'] },
      vi.fn(),
      false
    );
    await waitFor(() => screen.getByRole('checkbox', { name: 'npc gallery' }));
    // onChange should not have been called to override existing packSources
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Clear filters
// ---------------------------------------------------------------------------
describe('SearchPanel — clear filters', () => {
  it('resets all filters to defaults when Clear is clicked', async () => {
    const { onChange } = renderPanel({
      name: 'dragon',
      traits: ['fire'],
      levelMin: 5,
      levelMax: 15,
      sizes: ['huge'],
      rarities: ['rare'],
      packSources: ['npc-gallery'],
    });
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onChange).toHaveBeenCalledWith({
      name: '',
      traits: [],
      levelMin: -1,
      levelMax: 25,
      sizes: [],
      rarities: [],
      packSources: [],
    });
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe('SearchPanel — disabled state', () => {
  it('disables the name input when disabled=true', () => {
    renderPanel(DEFAULT_FILTERS, vi.fn(), true);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeDisabled();
  });

  it('disables level inputs when disabled=true', () => {
    renderPanel(DEFAULT_FILTERS, vi.fn(), true);
    screen.getAllByRole('spinbutton').forEach(input => expect(input).toBeDisabled());
  });

  it('disables Clear button when disabled=true', () => {
    renderPanel(DEFAULT_FILTERS, vi.fn(), true);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeDisabled();
  });

  it('disables size checkboxes when disabled=true', () => {
    renderPanel(DEFAULT_FILTERS, vi.fn(), true);
    expect(screen.getByRole('checkbox', { name: /tiny/i })).toBeDisabled();
  });

  it('disables rarity checkboxes when disabled=true', () => {
    renderPanel(DEFAULT_FILTERS, vi.fn(), true);
    expect(screen.getByRole('checkbox', { name: 'Common' })).toBeDisabled();
  });
});
