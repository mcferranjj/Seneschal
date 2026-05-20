import styles from './BackButton.module.css';

interface NavArrowButtonProps {
  direction: 'back' | 'forward';
  onClick: () => void;
  disabled: boolean;
  label?: string;
}

/**
 * Shared chevron button used by BackButton and ForwardButton. The only thing
 * that varies between the two is the chevron path and the default label, so
 * this component owns the SVG + accessibility wiring once.
 */
export function NavArrowButton({ direction, onClick, disabled, label }: NavArrowButtonProps) {
  const defaultLabel = direction === 'back' ? 'Back' : 'Forward';
  const resolvedLabel = label ?? defaultLabel;
  // Chevron path differs by direction; both share the same viewBox/sizing.
  const path = direction === 'back' ? 'M8 1L2 7L8 13' : 'M2 1L8 7L2 13';

  return (
    <button
      className={styles.backBtn}
      onClick={onClick}
      disabled={disabled}
      title={resolvedLabel}
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
