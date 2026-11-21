"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import {
  Code2,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnMount } from "@monaco-editor/react";

// Dynamically import Monaco Editor to avoid SSR window/document issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#0B101D] text-slate-400 gap-3 border border-slate-800/80 rounded-xl">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <span className="text-xs font-medium">Initializing Monaco Code Workspace...</span>
    </div>
  ),
});

interface MonacoCodeEditorProps {
  code: string;
  language: string;
  onCodeChange: (newCode: string) => void;
  onLanguageChange: (newLanguage: string) => void;
  onResetStarter: () => void;
  onManualSave?: () => void;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  readOnly?: boolean;
}

export function MonacoCodeEditor({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onResetStarter,
  onManualSave,
  saveStatus,
  readOnly = false,
}: MonacoCodeEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define subtle dark theme complementing DevHire palette
    monaco.editor.defineTheme("devhire-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748B", fontStyle: "italic" },
        { token: "keyword", foreground: "818CF8", fontStyle: "bold" },
        { token: "string", foreground: "34D399" },
        { token: "number", foreground: "F59E0B" },
        { token: "type", foreground: "38BDF8" },
      ],
      colors: {
        "editor.background": "#0B101D",
        "editor.foreground": "#E2E8F0",
        "editor.lineHighlightBackground": "#131C31",
        "editorCursor.foreground": "#60A5FA",
        "editorWhitespace.foreground": "#334155",
        "editorIndentGuide.background": "#1E293B",
        "editorIndentGuide.activeBackground": "#3B82F6",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94A3B8",
      },
    });

    monaco.editor.setTheme("devhire-dark");

    // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onManualSave && !readOnly) {
        onManualSave();
      }
    });
  };

  const getMonacoLanguage = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "python":
      case "python3":
        return "python";
      case "typescript":
        return "typescript";
      case "javascript":
        return "javascript";
      default:
        return "typescript";
    }
  };

  const monacoLang = getMonacoLanguage(language);

  return (
    <div className="flex flex-col h-full w-full bg-[#0B101D] rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Editor Control Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0E1526] border-b border-slate-800/80 text-xs gap-3">
        {/* Left: Language Selector & Code Icon */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Code2 className="h-4 w-4 text-blue-400" />
            <span>Editor</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Language Dropdown */}
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={language}
              disabled={readOnly}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-[#080C14] border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-medium cursor-pointer disabled:opacity-50"
            >
              <option value="python">Python 3</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
        </div>

        {/* Right: Autosave Status & Reset Button */}
        <div className="flex items-center gap-3">
          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving draft...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>All changes saved</span>
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Unsaved changes</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertCircle className="h-3 w-3" />
                <span>Save failed (retry on keypress)</span>
              </span>
            )}
          </div>

          {!readOnly && (
            <>
              <div className="h-4 w-px bg-slate-800" />

              {/* Reset to Starter Code */}
              <Button
                variant="outline"
                size="sm"
                onClick={onResetStarter}
                className="h-7 px-2.5 text-[11px] border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-300 gap-1.5"
                title="Reset code to original starter template"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 min-h-[420px] relative">
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={(val) => {
            if (!readOnly && val !== undefined) {
              onCodeChange(val);
            }
          }}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize: 13.5,
            fontFamily: "var(--font-mono, 'Fira Code', 'JetBrains Mono', 'Menlo', monospace)",
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: monacoLang === "python" ? 4 : 2,
            insertSpaces: true,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "all",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
          }}
        />
      </div>

      {/* Footer Info Hint */}
      <div className="px-4 py-1.5 bg-[#080C14] border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Ctrl+S</kbd> to save immediately</span>
        <span>Auto-saves 1.5s after typing stops</span>
      </div>
    </div>
  );
}
