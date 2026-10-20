"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ExtendedOptions } from "@/core/activity/extended-options";
import { createActivitySearchSession } from "./activity-search-session";
import { createActivityIndexedDbStorage } from "./activity-indexed-db";

export type { ActivityDataCardState } from "./activity-data-cache";

/** No request happens until search/retry; cache lifetime is one mounted editor. */
export function useActivityData(
  sources: readonly string[],
  username = "",
  options?: ExtendedOptions,
) {
  const [session] = useState(() =>
    createActivitySearchSession({ storage: createActivityIndexedDbStorage() }),
  );
  const sourceKey = JSON.stringify(sources.slice(0, 100));
  const optionsKey = JSON.stringify(options ?? {});
  useSyncExternalStore(session.subscribe, session.getRevision, session.getRevision);
  useEffect(() => {
    session.setInputs(
      JSON.parse(sourceKey) as string[],
      username,
      JSON.parse(optionsKey) as ExtendedOptions,
    );
  }, [session, sourceKey, username, optionsKey]);
  useEffect(() => {
    session.mount();
    const timer = setInterval(session.tick, 30_000);
    const save = () => {
      void session.flush();
    };
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      session.unmount();
    };
  }, [session]);
  return {
    getCard: session.getCard,
    search: () => {
      void session.search(sources, username, options ?? {});
    },
    reset: session.reset,
    retry: (source: string) => {
      void session.retry(source);
    },
    ...session.state(sources, username, options ?? {}),
  };
}
