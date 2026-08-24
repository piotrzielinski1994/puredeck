import { cn, useIsMobile } from "@pziel/pureui";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLogLines } from "@/components/workspace/workspace-context";
import type { LogLevel, LogLine } from "@/lib/workspace/log-line";
import {
  filterLogLines,
  type HighlightSegment,
  highlightLogSearch,
} from "@/lib/workspace/log-search";

const LEVEL_LINE_CLASS: Record<LogLevel, string> = {
  error: "text-destructive",
  warn: "text-amber-600 dark:text-amber-400",
  info: "text-foreground",
  debug: "text-muted-foreground",
  trace: "text-muted-foreground",
};

const KV_KEY_CLASS = "text-muted-foreground";
const KV_VALUE_CLASS = "text-foreground";

const SEARCH_SEGMENT_CLASS: Record<HighlightSegment["kind"], string> = {
  key: "text-primary",
  value: KV_VALUE_CLASS,
  plain: "text-muted-foreground",
};

const SEARCH_BOX = "w-full px-2 text-xs whitespace-pre overflow-hidden";

function LogLineRow({ line }: { line: LogLine }) {
  const parts = line.message.split(/(\s+)/);
  return (
    <li className={cn("break-all py-0.5", LEVEL_LINE_CLASS[line.level])}>
      {line.timestamp ? (
        <span className="text-muted-foreground">{line.timestamp} </span>
      ) : null}
      {parts.map((part, index) => {
        const kv = part.match(/^([A-Za-z_]+)=(\S+)$/);
        if (!kv) {
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed split-order fragments of one message
          return <span key={index}>{part}</span>;
        }
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed split-order fragments of one message
          <span key={index}>
            <span className={KV_KEY_CLASS}>{kv[1]}=</span>
            <span className={KV_VALUE_CLASS}>{kv[2]}</span>
          </span>
        );
      })}
    </li>
  );
}

function LogSearchInput({
  value,
  onChange,
  boxClass,
}: {
  value: string;
  onChange: (next: string) => void;
  boxClass: string;
}) {
  const segments = highlightLogSearch(value);
  return (
    <div className="relative w-full bg-background">
      <div
        aria-hidden="true"
        className={cn(
          boxClass,
          "pointer-events-none absolute inset-0 flex items-center border border-transparent",
        )}
      >
        {segments.map((segment, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed split-order segments of one query
          <span key={index} className={SEARCH_SEGMENT_CLASS[segment.kind]}>
            {segment.text}
          </span>
        ))}
      </div>
      <input
        type="search"
        aria-label="Search logs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="level:error email:jane ..."
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={cn(
          boxClass,
          "relative border bg-transparent text-transparent caret-foreground placeholder:text-muted-foreground focus:outline-none",
        )}
      />
    </div>
  );
}

export function LogsPanel() {
  const { logLines, clearLogLines } = useLogLines();
  const isMobile = useIsMobile();
  const [logSearch, setLogSearch] = useState("");
  const filteredLogs = useMemo(
    () => filterLogLines(logLines, logSearch),
    [logLines, logSearch],
  );
  const listRef = useRef<HTMLUListElement>(null);
  const logsEndRef = useRef<HTMLLIElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    if (filteredLogs.length === 0) {
      return;
    }
    if (stickRef.current) {
      logsEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [filteredLogs.length]);

  const onScroll = (): void => {
    const el = listRef.current;
    if (el === null) {
      return;
    }
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  };

  const boxClass = cn(SEARCH_BOX, isMobile ? "min-h-11" : "h-8");
  const clearClass = cn(
    "shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground",
    isMobile ? "min-h-11 min-w-11" : "p-2",
  );

  return (
    <section
      aria-label="Logs"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/30 font-mono text-xs"
    >
      <div className="flex shrink-0 items-center gap-1 border-b">
        <LogSearchInput
          value={logSearch}
          onChange={setLogSearch}
          boxClass={boxClass}
        />
        {logLines.length > 0 ? (
          <button
            type="button"
            aria-label="Clear"
            title="Clear"
            onClick={clearLogLines}
            className={clearClass}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
      <ul
        ref={listRef}
        aria-label="Application logs"
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto p-2"
      >
        {logLines.length === 0 ? (
          <p className="text-muted-foreground">
            No application logs yet this session.
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-muted-foreground">No matching log lines.</p>
        ) : (
          filteredLogs.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only log lines (no reorder)
            <LogLineRow key={index} line={line} />
          ))
        )}
        <li ref={logsEndRef} aria-hidden="true" />
      </ul>
    </section>
  );
}
