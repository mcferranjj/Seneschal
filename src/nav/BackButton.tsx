import { useNav } from './NavContext';
import { NavArrowButton } from './NavArrowButton';

export function BackButton() {
  const { goBack, canGoBack, topLabel } = useNav();

  return (
    <NavArrowButton
      direction="back"
      onClick={goBack}
      disabled={!canGoBack}
      label={topLabel}
    />
  );
}
