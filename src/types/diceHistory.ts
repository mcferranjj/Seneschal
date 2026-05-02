export interface RollHistoryEntry {
  id: number;
  expression: string;
  label?: string; // e.g. "Fortitude", "Bite attack"
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: number;
}
