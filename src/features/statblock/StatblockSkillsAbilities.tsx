/**
 * StatblockSkillsAbilities
 *
 * Renders the Perception/Stealth line, Languages, Skills, and the six
 * ability-score modifiers (Str/Dex/Con/Int/Wis/Cha).
 * Extracted from StatblockContent.
 */
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';
import type { HazardDetails } from './hazardHelpers';
import { formatMod } from './statblockHelpers';
import { processFoundryHtml } from '../../utils/foundryMacros';
import styles from './StatblockDrawer.module.css';

function skillDisplayName(raw: string): string {
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface StatblockSkillsAbilitiesProps {
  creature: CreatureRecord;
  c: PF2ECreature;
  isHazard: boolean;
  hazard: HazardDetails | null;
  senses: string;
  langs: string;
  rawSkills: { name: string; mod: number }[];
  str?: number; dex?: number; con?: number;
  int_?: number; wis?: number; cha?: number;
  ewMod: number;
  ewStyle?: React.CSSProperties;
  debuffStyle: React.CSSProperties;
  scaledPerception?: number;
  scaledHazardStealthDC?: number;
  scaledHazardStealthMod?: number;
  pen: { perception: number };
  onRollMod: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
  onManualRollMod: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
}

export function StatblockSkillsAbilities({
  creature, c,
  isHazard, hazard,
  senses, langs, rawSkills,
  str, dex, con, int_, wis, cha,
  ewMod, ewStyle, debuffStyle,
  scaledPerception, scaledHazardStealthDC, scaledHazardStealthMod,
  pen,
  onRollMod, onManualRollMod,
}: StatblockSkillsAbilitiesProps) {
  const abilityPopupsEnabled = true;
  const abilityHtml = (raw: string) => processFoundryHtml(raw, { interactive: abilityPopupsEnabled });

  return (
    <>
      {/* Stealth (hazards) or Perception / Senses (creatures) */}
      {isHazard ? (
        hazard?.stealth != null && (() => {
          const customDC = creature.customData?.stealthDC;
          let rawDC: number | undefined;
          let rawMod: number | undefined;
          if (customDC != null) {
            rawDC = customDC; rawMod = customDC - 10;
          } else if (hazard.stealth!.value != null) {
            rawMod = hazard.stealth!.value; rawDC = rawMod + 10;
          }
          const displayDC  = scaledHazardStealthDC  ?? rawDC;
          const displayMod = scaledHazardStealthMod ?? rawMod;
          const stealthStyle = scaledHazardStealthDC != null ? { color: '#2a7a6a', fontWeight: 700 } as const : undefined;
          return (
            <p className={styles.infoLine}>
              <strong>Stealth</strong>{' '}
              {displayDC != null ? (
                <span style={stealthStyle}>
                  DC {displayDC}{displayMod != null ? ` (+${displayMod})` : ''}
                </span>
              ) : '—'}
              {hazard.stealth!.details
                ? <> <span dangerouslySetInnerHTML={{ __html: abilityHtml(hazard.stealth!.details) }} /></>
                : null}
            </p>
          );
        })()
      ) : (
        <p className={styles.infoLine}>
          {(() => {
            const percMod = scaledPerception ?? (c.system?.perception?.mod ?? c.system?.perception?.value);
            const effPercMod = percMod != null ? percMod + pen.perception + ewMod : percMod;
            const rest = senses.replace(/^Perception [+-]?\d+;?\s*/, '').replace(/^Perception [+-]?\d+$/, '');
            const percStyle = pen.perception !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
            return (
              <>
                <span
                  className={styles.rollMod}
                  title="Roll Perception (right-click to input)"
                  onClick={e => onRollMod(effPercMod, 'Perception', e)}
                  onContextMenu={e => onManualRollMod(effPercMod, 'Perception', e)}
                  style={percStyle}
                >
                  <strong>Perception</strong> {formatMod(effPercMod)}
                </span>
                {rest ? `; ${rest}` : ''}
              </>
            );
          })()}
        </p>
      )}

      {/* Languages — creatures only */}
      {!isHazard && langs && (
        <p className={styles.infoLine}>
          <strong>Languages</strong> {langs}
        </p>
      )}

      {/* Skills — creatures only */}
      {!isHazard && rawSkills.length > 0 && (
        <p className={styles.infoLine}>
          <strong>Skills</strong>{' '}
          {rawSkills.map((s, i) => {
            const effSkillMod = s.mod + ewMod;
            const displayName = skillDisplayName(s.name);
            return (
              <span key={s.name + i}>
                {i > 0 && ', '}
                <span
                  className={styles.rollMod}
                  title={`Roll ${displayName} (right-click to input)`}
                  onClick={e => onRollMod(effSkillMod, displayName, e)}
                  onContextMenu={e => onManualRollMod(effSkillMod, displayName, e)}
                  style={ewMod !== 0 ? ewStyle : undefined}
                >
                  {displayName} {formatMod(effSkillMod)}
                </span>
              </span>
            );
          })}
        </p>
      )}

      {/* Ability scores — creatures only */}
      {!isHazard && (
        <p className={styles.abilityLine}>
          {([
            { label: 'Str', mod: str },
            { label: 'Dex', mod: dex },
            { label: 'Con', mod: con },
            { label: 'Int', mod: int_ },
            { label: 'Wis', mod: wis },
            { label: 'Cha', mod: cha },
          ] as const).map(({ label, mod }, i) => (
            <span key={label}>
              {i > 0 && ', '}
              <span
                className={styles.rollMod}
                title={`Roll ${label} check (right-click to input)`}
                onClick={e => onRollMod(mod, label, e)}
                onContextMenu={e => onManualRollMod(mod, label, e)}
              >
                <strong>{label}</strong> {formatMod(mod)}
              </span>
            </span>
          ))}
        </p>
      )}
    </>
  );
}
