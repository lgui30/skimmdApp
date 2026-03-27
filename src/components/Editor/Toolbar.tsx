import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  CodeSquare,
  Eye,
  Code2,
  Undo2,
  Redo2,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
  sourceMode?: boolean;
  onToggleSource?: () => void;
}

export default function Toolbar({ editor, sourceMode, onToggleSource }: ToolbarProps) {
  const btn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    isActive: boolean,
    disabled?: boolean
  ) => (
    <button
      className={`toolbar-btn${isActive ? " active" : ""}${disabled ? " disabled" : ""}`}
      onClick={action}
      title={label}
      type="button"
      disabled={disabled}
    >
      {icon}
    </button>
  );

  return (
    <div className="toolbar">
      {!sourceMode && (
        <>
          <div className="toolbar-group">
            {btn("Undo (Cmd+Z)", <Undo2 size={15} />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
            {btn("Redo (Cmd+Shift+Z)", <Redo2 size={15} />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            {btn("Bold (Cmd+B)", <Bold size={15} />, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
            {btn("Italic (Cmd+I)", <Italic size={15} />, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
            {btn("Strikethrough", <Strikethrough size={15} />, () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
            {btn("Inline Code", <Code size={15} />, () => editor.chain().focus().toggleCode().run(), editor.isActive("code"))}
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            {btn("Heading 1", <Heading1 size={15} />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}
            {btn("Heading 2", <Heading2 size={15} />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
            {btn("Heading 3", <Heading3 size={15} />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            {btn("Bullet List", <List size={15} />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
            {btn("Numbered List", <ListOrdered size={15} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
            {btn("Task List", <ListChecks size={15} />, () => editor.chain().focus().toggleTaskList().run(), editor.isActive("taskList"))}
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            {btn("Blockquote", <Quote size={15} />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
            {btn("Code Block", <CodeSquare size={15} />, () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock"))}
            {btn("Horizontal Rule", <Minus size={15} />, () => editor.chain().focus().setHorizontalRule().run(), false)}
          </div>
        </>
      )}

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        {onToggleSource &&
          btn(
            sourceMode ? "Rich Text (Cmd+/)" : "Source (Cmd+/)",
            sourceMode ? <Eye size={15} /> : <Code2 size={15} />,
            onToggleSource,
            !!sourceMode
          )}
      </div>
    </div>
  );
}
