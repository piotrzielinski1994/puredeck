import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";
import {
  type Tab,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { cn } from "@/lib/utils";

function SortableTab({
  tab,
  isActive,
  onActivate,
  onClose,
}: {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
      className={cn(
        "group flex h-full cursor-grab touch-none items-center gap-1.5 border-r px-3 text-sm hover:bg-accent active:cursor-grabbing",
        isDragging && "opacity-50",
        isActive
          ? "-mb-px h-[calc(100%+1px)] bg-accent text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]"
          : "bg-transparent text-muted-foreground",
      )}
    >
      <span className="whitespace-nowrap">{tab.label}</span>
      <button
        type="button"
        aria-label={`Close ${tab.label}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export function ContentTabs() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    reorderTabs,
    openSettings,
  } = useWorkspace();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const ids = tabs.map((tab) => tab.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }
    reorderTabs(arrayMove(ids, from, to));
  };

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b bg-muted/30">
      <div
        role="tablist"
        aria-label="Open tabs"
        className="flex h-full min-w-0 items-stretch overflow-x-auto"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onActivate={() => setActiveTab(tab.id)}
                onClose={() => closeTab(tab.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <button
        type="button"
        aria-label="New tab"
        onClick={openSettings}
        className="shrink-0 px-2 text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
