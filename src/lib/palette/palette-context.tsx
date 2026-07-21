import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type PaletteContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setOpen }), [isOpen]);
  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  const context = useContext(PaletteContext);
  if (!context) {
    throw new Error("usePalette must be used within a PaletteProvider");
  }
  return context;
}
