"use client";

import MonacoEditor from "@monaco-editor/react";

export default function Editor({
  language,
  value,
  onChange,
  theme = "vs-dark",
  fontSize = 14,
  tabSize = 2
}) {
  const handleEditorChange = (val) => {
    onChange(val);
  };

  const handleEditorDidMount = (editor, monaco) => {
    // Custom editor configuration can go here
  };

  return (
    <div className="editor-container-inner">
      <MonacoEditor
        height="100%"
        width="100%"
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme}
        loading={
          <div className="editor-loading">
            <div className="spinner"></div>
            <p>Loading editor environment...</p>
          </div>
        }
        options={{
          fontSize: fontSize,
          tabSize: tabSize,
          insertSpaces: true,
          fontFamily: "var(--font-geist-mono), monospace",
          minimap: { enabled: true },
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          },
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          cursorBlinking: "blink",
          automaticLayout: true
        }}
      />
    </div>
  );
}
