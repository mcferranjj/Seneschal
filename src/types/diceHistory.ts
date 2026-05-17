export interface RollHistoryEntry {
  id: number;
  expression: string;
  label?: string; // e.g. "Fortitude", "Bite attack"
  creatureName?: string; // e.g. "Goblin Warrior"
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: number;
}
