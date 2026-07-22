import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@pziel/pureui";

export type PaletteCommand = {
  id: string;
  name: string;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly PaletteCommand[];
};

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No matching commands</CommandEmpty>
        {commands.map(({ id, name, run }) => (
          <CommandItem
            key={id}
            value={name}
            onSelect={() => {
              run();
              onOpenChange(false);
            }}
          >
            <span>{name}</span>
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
