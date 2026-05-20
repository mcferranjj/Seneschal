import { useNav } from './NavContext';
import styles from './BackButton.module.css';

export function BackButton() {
  const { goBack, canGoBack, topLabel } = useNav();

  return (
    <button
      className={styles.backBtn}
      onClick={goBack}
      disabled={!canGoBack}
      title={topLabel ?? 'Back'}
      aria-label={topLabel ?? 'Back'}
      type="button"
    >
      {/* Left chevron / arrow */}
      <svg
        width="10"
        height="14"
        viewBox="0 0 10 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M8 1L2 7L8 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
