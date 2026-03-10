import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import type { ThemeMode } from "../../types";

const options: Array<{ mode: ThemeMode; icon: typeof Sun; label: string }> = [
  { mode: "light", icon: Sun, label: "Light" },
  { mode: "system", icon: Monitor, label: "System" },
  { mode: "dark", icon: Moon, label: "Dark" },
];

export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="theme-toggle">
      {options.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          className={`theme-btn ${mode === m ? "active" : ""}`}
          onClick={() => setMode(m)}
          title={label}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
