import { useNav } from './NavContext';
import styles from './NavArrowButton.module.css';

interface NavArrowButtonProps {
  direction: 'back' | 'forward';
}

/**
 * Back/forward chevron button wired directly to the nav context.
 * Renders disabled when there is nothing to navigate to in that direction,
 * and shows the action label + keyboard shortcut as a tooltip.
 */
export function NavArrowButton({ direction }: NavArrowButtonProps) {
  const { goBack, canGoBack, topLabel, goForward, canGoForward, topForwardLabel } = useNav();

  const isBack = direction === 'back';
  const onClick = isBack ? goBack : goForward;
  const disabled = isBack ? !canGoBack : !canGoForward;
  const entryLabel = isBack ? topLabel : topForwardLabel;
  const defaultLabel = isBack ? 'Back' : 'Forward';
  const shortcut = isBack ? 'Alt+←' : 'Alt+→';
  const resolvedLabel = entryLabel ?? defaultLabel;
  const title = `${resolvedLabel} (${shortcut})`;

  // Chevron path differs by direction; both share the same viewBox/sizing.
  const path = isBack ? 'M8 1L2 7L8 13' : 'M2 1L8 7L2 13';

  return (
    <button
      className={styles.backBtn}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={resolvedLabel}
      type="button"
    >
      <svg
        width="10"
        height="14"
        viewBox="0 0 10 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d={path}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
