import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { common, createLowlight } from "lowlight";
import CodeBlockView from "./CodeBlockView";
import { SearchExtension } from "./searchExtension";

const lowlight = createLowlight(common);

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

export const editorExtensions = [
  StarterKit.configure({
    codeBlock: false,
  }),
  Markdown.configure({
    html: true,
    tightLists: true,
    bulletListMarker: "-",
    transformPastedText: true,
    transformCopiedText: true,
  }),
  CustomCodeBlock.configure({ lowlight }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({
    placeholder: "Start writing...",
  }),
  Typography,
  SearchExtension,
];
