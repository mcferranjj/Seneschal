import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface WizardRightPanelContextValue {
  target: HTMLElement | null;
}

const WizardRightPanelContext = createContext<WizardRightPanelContextValue | null>(null);

export function WizardRightPanelProvider({
  children,
  target,
}: {
  children: ReactNode;
  target: HTMLElement | null;
}) {
  return (
    <WizardRightPanelContext.Provider value={{ target }}>
      {children}
    </WizardRightPanelContext.Provider>
  );
}

/**
 * Renders its children into the wizard's persistent right-hand column.
 * Steps can use this to project per-step detail content into the side panel.
 */
export function WizardRightPanelSlot({ children }: { children: ReactNode }) {
  const ctx = useContext(WizardRightPanelContext);
  // Track target via state so initial null (before parent ref attaches) re-renders once.
  const [target, setTarget] = useState<HTMLElement | null>(ctx?.target ?? null);
  useEffect(() => {
    setTarget(ctx?.target ?? null);
  }, [ctx?.target]);
  if (!target) return null;
  return createPortal(children, target);
}

/**
 * Hook variant: convenience wrapper that mounts a node into the right panel.
 */
export function useWizardRightPanelTarget(): HTMLElement | null {
  const ctx = useContext(WizardRightPanelContext);
  return ctx?.target ?? null;
}

/**
 * Helper to wire the DOM ref to the provider target without losing renders.
 */
export function useRightPanelTargetRef() {
  const ref = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  useEffect(() => {
    // Trigger one re-render once the ref is attached so consumers see the target.
    force(n => n + 1);
  }, []);
  return ref;
}
