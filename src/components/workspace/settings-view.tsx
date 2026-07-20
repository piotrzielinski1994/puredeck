import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme/theme-context";
import type { ThemeMode } from "@/lib/settings/settings";
import { ShortcutsSection } from "@/components/settings/shortcuts-section";
import { StorageSection } from "@/components/settings/storage-section";

type Section = "theme" | "shortcuts" | "storage";

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

function SubTab({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        "flex items-center border-r px-3.5 text-sm text-muted-foreground hover:bg-accent",
        isActive &&
          "bg-accent text-foreground shadow-[inset_0_-1px_0_0_var(--primary)]",
      )}
    >
      {children}
    </button>
  );
}

function ThemeSection() {
  const { mode, setMode } = useTheme();

  return (
    <section className="flex flex-col gap-1 p-6">
      <h2 className="text-lg font-medium">Theme</h2>
      <p className="text-sm text-muted-foreground">
        Choose the app appearance, or follow your OS preference.
      </p>
      <div className="mt-3 flex">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={mode === option.id}
            onClick={() => setMode(option.id)}
            className={cn(
              "border border-l-0 px-4 py-1.5 text-sm first:border-l hover:bg-accent",
              mode === option.id &&
                "bg-primary text-primary-foreground hover:brightness-90",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function SettingsView() {
  const [section, setSection] = useState<Section>("theme");

  return (
    <div className="flex h-full flex-col">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex h-10 shrink-0 items-stretch border-b bg-muted/30"
      >
        <SubTab
          isActive={section === "theme"}
          onClick={() => setSection("theme")}
        >
          Theme
        </SubTab>
        <SubTab
          isActive={section === "shortcuts"}
          onClick={() => setSection("shortcuts")}
        >
          Shortcuts
        </SubTab>
        <SubTab
          isActive={section === "storage"}
          onClick={() => setSection("storage")}
        >
          Storage
        </SubTab>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {section === "theme" && <ThemeSection />}
        {section === "shortcuts" && <ShortcutsSection />}
        {section === "storage" && <StorageSection />}
      </div>
    </div>
  );
}
