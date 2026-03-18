import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) {
      ref.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > vh) {
      ref.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="context-menu-divider" />}
          <button
            className={`context-menu-item${item.danger ? " danger" : ""}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
