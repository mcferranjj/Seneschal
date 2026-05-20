import { useNav } from './NavContext';
import { NavArrowButton } from './NavArrowButton';

export function ForwardButton() {
  const { goForward, canGoForward, topForwardLabel } = useNav();

  return (
    <NavArrowButton
      direction="forward"
      onClick={goForward}
      disabled={!canGoForward}
      label={topForwardLabel}
    />
  );
}
