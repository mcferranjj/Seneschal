/**
 * useGlossaryPopup
 *
 * Encapsulates the repeated pattern of: open/close state, anchor + popup refs,
 * popup positioning, and outside-click dismissal for an ability glossary popup.
 *
 * Used by ItemBlock, CustomAbilityBlock, and StrikeAbilityLink — all of which
 * show the same AbilityPopup triggered by clicking an ability name.
 */

import { useRef, useState } from 'react';
import { usePopupPosition } from './usePopupPosition';
import { useOutsideClick } from './useOutsideClick';
import type { PopupPosition } from './usePopupPosition';

const POPUP_OPTIONS = { popupWidth: 300, popupMaxHeight: 380 } as const;

export interface GlossaryPopupState {
  popupOpen: boolean;
  togglePopup: () => void;
  closePopup: () => void;
  /** Attach to the clickable anchor element (the ability name span/strong). */
  nameRef: React.RefObject<HTMLElement | null>;
  /** Attach to the popup div element. */
  popupRef: React.RefObject<HTMLDivElement | null>;
  /** Null when popup is closed; set once open and positioned. */
  pos: PopupPosition | null;
}

export function useGlossaryPopup(): GlossaryPopupState {
  const [popupOpen, setPopupOpen] = useState(false);
  const nameRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const pos = usePopupPosition(nameRef, popupOpen, POPUP_OPTIONS, popupRef);
  useOutsideClick(popupRef, () => setPopupOpen(false), nameRef);

  return {
    popupOpen,
    togglePopup: () => setPopupOpen(o => !o),
    closePopup: () => setPopupOpen(false),
    nameRef,
    popupRef,
    pos,
  };
}
