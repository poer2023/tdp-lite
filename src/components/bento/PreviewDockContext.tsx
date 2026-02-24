"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export interface PreviewDockState {
  isActive: boolean;
  currentIndex: number;
  total: number;
  canCycle: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

const noop = () => {};

export const DEFAULT_PREVIEW_DOCK_STATE: PreviewDockState = {
  isActive: false,
  currentIndex: 1,
  total: 1,
  canCycle: false,
  onPrev: noop,
  onNext: noop,
  onClose: noop,
};

interface PreviewDockContextValue {
  state: PreviewDockState;
  setState: Dispatch<SetStateAction<PreviewDockState>>;
}

const PreviewDockContext = createContext<PreviewDockContextValue | null>(null);

interface PreviewDockProviderProps {
  children: ReactNode;
}

export function PreviewDockProvider({ children }: PreviewDockProviderProps) {
  const [state, setState] = useState<PreviewDockState>(DEFAULT_PREVIEW_DOCK_STATE);
  const value = useMemo(() => ({ state, setState }), [state]);
  return (
    <PreviewDockContext.Provider value={value}>{children}</PreviewDockContext.Provider>
  );
}

export function usePreviewDockContext() {
  return useContext(PreviewDockContext);
}
