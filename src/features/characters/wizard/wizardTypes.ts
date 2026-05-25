import type {
  CharacterAncestryRef, CharacterHeritageRef, CharacterBackgroundRef,
  CharacterClassRef, CharacterSubclassRef, CharacterSkills, BoostChoicesByLevel, FeatChoice,
} from '../../../db/schema';

/** Ordered list of wizard steps. Drives both the progress bar and `goNext`/`goBack`. */
export type WizardStep =
  | 'lineage'
  | 'background'
  | 'class'
  | 'abilities'
  | 'skills'
  | 'feats'
  | 'review';

export interface WizardStepMeta {
  key: WizardStep;
  label: string;
  /** True when the user has provided enough data for this step to be considered finished. */
  completed: boolean;
  /** True when this step has been reached at least once (can be jumped to). */
  reachable: boolean;
}

/** Working state of the character being built. Mirrors `CharacterRecord` but
 *  with all selections nullable until the user makes a choice. */
export interface CharacterDraft {
  name: string;
  playerName: string;
  level: number;
  ancestry: CharacterAncestryRef | null;
  heritage: CharacterHeritageRef | null;
  background: CharacterBackgroundRef | null;
  class: CharacterClassRef | null;
  subclass: CharacterSubclassRef | null;
  boostChoices: BoostChoicesByLevel;
  skills: CharacterSkills;
  feats: FeatChoice[];
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  'lineage', 'background', 'class',
  'abilities', 'skills', 'feats', 'review',
] as const;

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  lineage: 'Lineage',
  background: 'Background',
  class: 'Class',
  abilities: 'Abilities',
  skills: 'Skills',
  feats: 'Feats',
  review: 'Review',
};
