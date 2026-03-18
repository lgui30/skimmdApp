import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { Plus } from "lucide-react";

interface OpenResult {
  path: string;
  is_directory: boolean;
}

export default function WelcomeScreen() {
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addFile = useWorkspaceStore((s) => s.addFile);

  const handleOpen = async () => {
    try {
      const result = await invoke<OpenResult | null>("open_file_or_folder");
      if (!result) return;
      if (result.is_directory) {
        await addWorkspace(result.path);
      } else {
        await addFile(result.path);
      }
    } catch (err) {
      console.error("open_file_or_folder failed:", err);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo">skimmd</div>
        <p className="welcome-subtitle">
          A beautiful way to read and edit your markdown files.
        </p>
        <button className="welcome-btn" onClick={handleOpen}>
          <Plus size={20} />
          Open
        </button>
        <p className="welcome-hint">
          Choose a .md file or a folder containing markdown files
        </p>
      </div>
    </div>
  );
}
