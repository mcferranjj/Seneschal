/**
 * Shared damage types used across dice rolling, statblock helpers, and level scaling.
 */

export interface DamageGroupInput {
  /** Dice expression to roll, e.g. "2d6+9" or "1d4" */
  expr: string;
  /** Display label, e.g. "slashing", "fire", "persistent fire" */
  label: string;
  /**
   * When true, this group is persistent damage (e.g. persistent fire) and should
   * not be rolled — it is displayed as a static expression instead.
   */
  persistent?: boolean;
}
