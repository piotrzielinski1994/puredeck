import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "@/lib/responsive/use-is-mobile";

type MediaListener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };

  window.matchMedia = ((query: string) => {
    void query;
    return mql;
  }) as unknown as typeof window.matchMedia;

  return {
    setMatches(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

afterEach(() => {
  // @ts-expect-error clean the stub so each test re-stubs from scratch.
  delete window.matchMedia;
});

describe("useIsMobile (AC-007 / TC-001)", () => {
  it("should return true if the media query matches", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("should return false if the media query does not match", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});

describe("useIsMobile reactive (AC-007 / TC-002)", () => {
  it("should re-render with the new value if a media change event fires", () => {
    const media = stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      media.setMatches(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      media.setMatches(false);
    });
    expect(result.current).toBe(false);
  });
});

describe("useIsMobile guard (AC-007 / TC-003)", () => {
  it("should return false and not throw if window.matchMedia is undefined", () => {
    // @ts-expect-error force-remove matchMedia to exercise the guard path.
    delete window.matchMedia;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
