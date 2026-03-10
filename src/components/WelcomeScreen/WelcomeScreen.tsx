import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { FolderOpen } from "lucide-react";

export default function WelcomeScreen() {
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);

  const handleAddFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      await addWorkspace(selected);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo">skimmd</div>
        <p className="welcome-subtitle">
          A beautiful way to read and edit your markdown files.
        </p>
        <button className="welcome-btn" onClick={handleAddFolder}>
          <FolderOpen size={20} />
          Add a folder to get started
        </button>
        <p className="welcome-hint">
          Choose a folder containing your .md or .txt files
        </p>
      </div>
    </div>
  );
}
