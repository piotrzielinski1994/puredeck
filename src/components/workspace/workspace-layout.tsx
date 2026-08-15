import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useActionHotkeys,
  useIsMobile,
} from "@pziel/pureui";
import { useRef } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";
import { LogsPanel } from "@/components/workspace/logs-panel";
import { Main } from "@/components/workspace/main";
import { MobileShell } from "@/components/workspace/mobile-shell";
import { Sidebar } from "@/components/workspace/sidebar";
import { useSettings } from "@/lib/settings/settings-context";
import { useEffectiveShortcuts } from "@/lib/shortcuts/use-effective-shortcuts";
import {
  PANEL_RESIZE_STEP,
  stepSidebarLayout,
} from "@/lib/workspace/panel-resize";

function MainWithLogs() {
  const { settings, saveLogsPanelSize } = useSettings();
  const logsPanelOpen = settings.logsPanelOpen;
  return (
    <ResizablePanelGroup
      orientation="vertical"
      className="h-full"
      defaultLayout={
        logsPanelOpen
          ? { content: 100 - settings.logsPanelSize, logs: settings.logsPanelSize }
          : { content: 100 }
      }
      onLayoutChanged={(layout) => {
        if (logsPanelOpen && typeof layout.logs === "number") {
          saveLogsPanelSize(layout.logs);
        }
      }}
    >
      <ResizablePanel key="content" id="content" defaultSize="70%" minSize="30%">
        <Main />
      </ResizablePanel>
      {logsPanelOpen
        ? [
            <ResizableHandle key="handle" />,
            <ResizablePanel key="logs" id="logs" defaultSize="30%">
              <LogsPanel />
            </ResizablePanel>,
          ]
        : null}
    </ResizablePanelGroup>
  );
}

export function WorkspaceLayout() {
  const { settings, saveLayout } = useSettings();
  const isMobile = useIsMobile();
  const groupRef = useRef<GroupImperativeHandle | null>(null);

  const resizeSidebar = (deltaPct: number): void => {
    const handle = groupRef.current;
    if (handle === null) {
      return;
    }
    handle.setLayout(stepSidebarLayout(handle.getLayout(), deltaPct));
  };

  useActionHotkeys(
    {
      "panel-expand": () => resizeSidebar(PANEL_RESIZE_STEP),
      "panel-shrink": () => resizeSidebar(-PANEL_RESIZE_STEP),
    },
    useEffectiveShortcuts(),
    { preventDefault: true },
  );

  if (isMobile) {
    return <MobileShell />;
  }

  if (settings.sidebarCollapsed) {
    return (
      <div className="h-full w-full">
        <MainWithLogs />
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      groupRef={groupRef}
      orientation="horizontal"
      className="h-full w-full"
      defaultLayout={settings.layouts.workspace}
      onLayoutChanged={(layout) => saveLayout("workspace", layout)}
    >
      <ResizablePanel
        id="sidebar"
        defaultSize="20%"
        minSize="12%"
        maxSize="40%"
      >
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="main" defaultSize="80%">
        <MainWithLogs />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
