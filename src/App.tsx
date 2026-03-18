import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useTabStore } from "./stores/tabStore";
import { useThemeStore } from "./stores/themeStore";
import { useZoomStore } from "./stores/zoomStore";
import { useFileWatcher } from "./hooks/useFileWatcher";
import Sidebar from "./components/Sidebar/Sidebar";
import TabBar from "./components/Tabs/TabBar";
import Editor from "./components/Editor/Editor";
import WelcomeScreen from "./components/WelcomeScreen/WelcomeScreen";
import ToastContainer, { toast } from "./components/Toast/Toast";
import QuickOpen from "./components/QuickOpen/QuickOpen";
import GlobalSearch from "./components/Search/GlobalSearch";
import { useUIStore } from "./stores/uiStore";

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_RATIO = 0.5;

export default function App() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const isLoaded = useWorkspaceStore((s) => s.isLoaded);
  const loadFromStore = useWorkspaceStore((s) => s.loadFromStore);
  const refreshFiles = useWorkspaceStore((s) => s.refreshFiles);
  const initTheme = useThemeStore((s) => s.init);
  const zoom = useZoomStore((s) => s.zoom);
  const zoomIn = useZoomStore((s) => s.zoomIn);
  const zoomOut = useZoomStore((s) => s.zoomOut);
  const resetZoom = useZoomStore((s) => s.resetZoom);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const reloadTab = useTabStore((s) => s.reloadTab);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const zenMode = useUIStore((s) => s.zenMode);
  const toggleZenMode = useUIStore((s) => s.toggleZenMode);
  const setZenMode = useUIStore((s) => s.setZenMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);
  const setFocusMode = useUIStore((s) => s.setFocusMode);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // Quick open & global search
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (me: MouseEvent) => {
      if (!isResizing.current) return;
      const maxWidth = window.innerWidth * MAX_SIDEBAR_RATIO;
      const newWidth = Math.min(maxWidth, Math.max(MIN_SIDEBAR_WIDTH, me.clientX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleSidebarDoubleClick = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  const watchPaths = useMemo(
    () => workspaces.map((w) => w.path),
    [workspaces]
  );

  useEffect(() => {
    initTheme();
    loadFromStore();
    resetZoom();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape exits zen mode / focus mode
      if (e.key === "Escape") {
        if (useUIStore.getState().focusMode) setFocusMode(false);
        if (useUIStore.getState().zenMode) setZenMode(false);
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          zoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          zoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          resetZoom();
        }
        // Cmd+Shift+Enter: zen mode
        if (e.shiftKey && e.key === "Enter") {
          e.preventDefault();
          toggleZenMode();
        }
        // Cmd+Shift+R: focus mode
        if (e.shiftKey && e.key === "R") {
          e.preventDefault();
          toggleFocusMode();
        }
        // Cmd+\: toggle sidebar
        if (e.key === "\\") {
          e.preventDefault();
          toggleSidebar();
        }
        // Cmd+P: quick open
        if (e.key === "p") {
          e.preventDefault();
          setQuickOpenVisible((v) => !v);
        }
        // Cmd+Shift+F: global search
        if (e.shiftKey && e.key === "F") {
          e.preventDefault();
          setGlobalSearchVisible((v) => !v);
        }
        // Cmd+Shift+C: copy active file path
        if (e.shiftKey && e.key === "C") {
          const tab = useTabStore.getState().tabs.find(
            (t) => t.id === useTabStore.getState().activeTabId
          );
          if (tab) {
            e.preventDefault();
            navigator.clipboard.writeText(tab.filePath);
            toast("Path copied");
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  const handleFileChange = useCallback(
    (changedPath: string) => {
      refreshFiles();
      const tab = tabs.find((t) => t.filePath === changedPath);
      if (tab) {
        reloadTab(tab.id);
      }
    },
    [tabs, refreshFiles, reloadTab]
  );

  useFileWatcher(watchPaths, handleFileChange);

  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <WelcomeScreen />;
  }

  const showSidebar = !zenMode && !sidebarCollapsed;

  return (
    <div
      className={`app${zenMode ? " zen" : ""}${sidebarCollapsed && !zenMode ? " sidebar-collapsed" : ""}`}
      style={zenMode ? undefined : showSidebar ? { gridTemplateColumns: `${sidebarWidth}px auto 1fr` } : { gridTemplateColumns: "1fr" }}
    >
      {showSidebar && (
        <>
          <Sidebar />
          <div
            className="sidebar-resize-handle"
            onMouseDown={handleSidebarMouseDown}
            onDoubleClick={handleSidebarDoubleClick}
          />
        </>
      )}
      <main className="main">
        {!zenMode && <TabBar />}
        <div className="editor-area" style={{ zoom: `${zoom}%` }}>
          {activeTab ? (
            <Editor
              key={activeTab.id}
              filePath={activeTab.filePath}
              content={activeTab.content}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-state-text">
                Select a file from the sidebar to start reading and editing.
              </div>
            </div>
          )}
        </div>
      </main>
      <QuickOpen visible={quickOpenVisible} onClose={() => setQuickOpenVisible(false)} />
      <GlobalSearch visible={globalSearchVisible} onClose={() => setGlobalSearchVisible(false)} />
      <ToastContainer />
    </div>
  );
}
