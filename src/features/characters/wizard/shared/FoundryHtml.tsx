import { processFoundryHtml } from '../../../../utils/foundryMacros';
import styles from './FoundryHtml.module.css';

export interface FoundryHtmlProps {
  /** Raw Foundry-flavored HTML (may contain @UUID / @Check / @Damage macros). */
  html: string;
  /** Optional per-call HTML transform applied *after* macro stripping. */
  transform?: (cleaned: string) => string;
  className?: string;
}

/**
 * Render a Foundry PF2e description blob safely. Strips `@UUID[...]`,
 * `@Check[...]`, `@Damage[...]` and related macros, then injects the
 * resulting HTML. Centralises both the sanitization pipeline and the
 * inline-link / paragraph styling so individual detail panels don't
 * have to repeat the same `dangerouslySetInnerHTML` + CSS dance.
 */
export function FoundryHtml({ html, transform, className }: FoundryHtmlProps) {
  if (!html) return null;
  const cleaned = processFoundryHtml(html);
  const final = transform ? transform(cleaned) : cleaned;
  return (
    <div
      className={`${styles.root} ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: final }}
    />
  );
}
