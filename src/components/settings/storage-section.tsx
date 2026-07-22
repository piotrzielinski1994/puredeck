import { cn } from "@pziel/pureui";
import { open } from "@tauri-apps/plugin-dialog";
import { GoogleDriveSection } from "@/components/settings/google-drive-section";
import { useIsMobile } from "@/lib/responsive/use-is-mobile";
import { useSettings } from "@/lib/settings/settings-context";

export function StorageSection() {
  const { settings, saveCollectionPath } = useSettings();
  const isMobile = useIsMobile();
  const { collectionPath } = settings;

  const chooseFolder = async (): Promise<void> => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected !== "string") {
      return;
    }
    saveCollectionPath(selected);
  };

  return (
    <section className="flex flex-col gap-1 p-6">
      <h2 className="text-lg font-medium">Storage</h2>
      <p className="text-sm text-muted-foreground">
        Where your decks are stored on disk.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Folder</span>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm break-all">
            {collectionPath ?? "Default app data folder"}
          </div>
        </div>
        {isMobile ? (
          <p className="text-sm text-muted-foreground">
            Choosing a folder is desktop-only.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={chooseFolder}
              className={cn(
                "border px-4 py-1.5 text-sm hover:bg-accent",
                "bg-primary text-primary-foreground hover:brightness-90",
              )}
            >
              Choose folder
            </button>
            {collectionPath !== undefined && (
              <button
                type="button"
                onClick={() => saveCollectionPath(undefined)}
                className="border px-4 py-1.5 text-sm hover:bg-accent"
              >
                Reset to default
              </button>
            )}
          </div>
        )}
        {!isMobile && (
          <p className="text-sm text-muted-foreground">
            Decks reload from the new folder right away. An empty folder gets
            one demo deck.
          </p>
        )}
        <GoogleDriveSection />
      </div>
    </section>
  );
}
