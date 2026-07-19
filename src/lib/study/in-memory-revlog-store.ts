import type { Revlog, RevlogStore } from "@/lib/study/revlog-store";

export function createInMemoryRevlogStore(initial: Revlog = []): RevlogStore {
  let current = initial;
  return {
    load: () => Promise.resolve(current),
    save: (revlog) => {
      current = revlog;
      return Promise.resolve();
    },
  };
}
