import { useEffect, useMemo, useCallback } from "react";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useTabStore } from "./stores/tabStore";
import { useThemeStore } from "./stores/themeStore";
import { useZoomStore } from "./stores/zoomStore";
import { useFileWatcher } from "./hooks/useFileWatcher";
import Sidebar from "./components/Sidebar/Sidebar";
import TabBar from "./components/Tabs/TabBar";
import Editor from "./components/Editor/Editor";
import WelcomeScreen from "./components/WelcomeScreen/WelcomeScreen";

export default function App() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const isLoaded = useWorkspaceStore((s) => s.isLoaded);
  const loadFromStore = useWorkspaceStore((s) => s.loadFromStore);
  const refreshFiles = useWorkspaceStore((s) => s.refreshFiles);
  const initTheme = useThemeStore((s) => s.init);
  const zoom = useZoomStore((s) => s.zoom);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const reloadTab = useTabStore((s) => s.reloadTab);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const watchPaths = useMemo(
    () => workspaces.map((w) => w.path),
    [workspaces]
  );

  useEffect(() => {
    initTheme();
    loadFromStore();
  }, []);

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

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TabBar />
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
    </div>
  );
}
