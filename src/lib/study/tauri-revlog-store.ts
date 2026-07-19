import { LazyStore } from "@tauri-apps/plugin-store";
import { mergeRevlog, type Revlog, type RevlogStore } from "@/lib/study/revlog-store";

const REVLOG_FILE = "review-log.json";
const REVLOG_KEY = "revlog";

export function createTauriRevlogStore(): RevlogStore {
  const store = new LazyStore(REVLOG_FILE);

  const load = async (): Promise<Revlog> => {
    const persisted = await store
      .get<unknown>(REVLOG_KEY)
      .catch(() => undefined);
    return mergeRevlog(persisted);
  };

  const save = async (revlog: Revlog): Promise<void> => {
    await store
      .set(REVLOG_KEY, revlog)
      .then(() => store.save())
      .catch((error) => {
        console.error("Failed to persist revlog:", error);
      });
  };

  return { load, save };
}
