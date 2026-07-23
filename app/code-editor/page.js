"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Editor from './components/Editor';
import Settings from './components/Settings';
import DockerHelp from './components/DockerHelp';

const STARTER_CODES = {
  javascript: `// JavaScript Code Playground\nconsole.log("Hello from CodeDiary!");\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log("Fibonacci(10):", fibonacci(10));\n`,
  python: `# Python 3 Code Playground\nprint("Hello from CodeDiary!")\n\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint("Fibonacci(10):", fibonacci(10))\n`,
  cpp: `// C++ Code Playground\n#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) return n;\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    cout << "Hello from CodeDiary!" << endl;\n    cout << "Fibonacci(10): " << fibonacci(10) << endl;\n    return 0;\n}\n`,
  c: `// C Code Playground\n#include <stdio.h>\n\nint fibonacci(int n) {\n    if (n <= 1) return n;\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    printf("Hello from CodeDiary!\\n");\n    printf("Fibonacci(10): %d\\n", fibonacci(10));\n    return 0;\n}\n`,
  java: `// Java Code Playground\npublic class Main {\n    public static int fibonacci(int n) {\n        if (n <= 1) return n;\n        return fibonacci(n - 1) + fibonacci(n - 2);\n    }\n\n    public static void main(String[] args) {\n        System.out.println("Hello from CodeDiary!");\n        System.out.println("Fibonacci(10): " + fibonacci(10));\n    }\n}\n`,
  typescript: `// TypeScript Code Playground\nconst message: string = "Hello from CodeDiary!";\nconsole.log(message);\n\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log("Fibonacci(10):", fibonacci(10));\n`,
  go: `// Go Code Playground\npackage main\nimport "fmt"\n\nfunc fibonacci(n int) int {\n\tif n <= 1 {\n\t\treturn n\n\t}\n\treturn fibonacci(n-1) + fibonacci(n-2)\n}\n\nfunc main() {\n\tfmt.Println("Hello from CodeDiary!")\n\tfmt.Printf("Fibonacci(10): %d\\n", fibonacci(10))\n}\n`,
  rust: `// Rust Code Playground\nfn fibonacci(n: u32) -> u32 {\n    if n <= 1 { return n; }\n    fibonacci(n - 1) + fibonacci(n - 2)\n}\n\nfn main() {\n    println!("Hello from CodeDiary!");\n    println!("Fibonacci(10): {}", fibonacci(10));\n}\n`,
  ruby: `# Ruby Code Playground\ndef fibonacci(n)\n  return n if n <= 1\n  fibonacci(n - 1) + fibonacci(n - 2)\nend\n\nputs "Hello from CodeDiary!"\nputs "Fibonacci(10): #{fibonacci(10)}"\n`,
  php: `<?php\n// PHP Code Playground\necho "Hello from CodeDiary!\\n";\n\nfunction fibonacci($n) {\n    if ($n <= 1) return $n;\n    return fibonacci($n - 1) + fibonacci($n - 2);\n}\n\necho "Fibonacci(10): " . fibonacci(10) . "\\n";\n`,
  sql: `-- SQL Code Playground\nCREATE TABLE developers (\n  id INT PRIMARY KEY,\n  name VARCHAR(50),\n  role VARCHAR(50)\n);\n\nINSERT INTO developers VALUES (1, 'Alice', 'Frontend'), (2, 'Bob', 'Backend');\n\nSELECT * FROM developers;\n`
};

const COMPILER_MAP = {
  cpp: "gcc-head",
  c: "gcc-head-c",
  python: "python-head",
  javascript: "nodejs-head",
  typescript: "typescript-head",
  java: "openjdk-head",
  go: "go-head",
  rust: "rust-head",
  ruby: "ruby-head",
  php: "php-head",
  csharp: "dotnet-head"
};

function CodeEditorContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(STARTER_CODES.javascript);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showDockerHelp, setShowDockerHelp] = useState(false);
  const [settings, setSettings] = useState({
    wandboxUrl: "https://wandbox.org",
    theme: "vs-dark",
    tabSize: 2,
    fontSize: 14
  });

  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [router]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!code || Object.values(STARTER_CODES).includes(code)) {
      setCode(STARTER_CODES[newLang] || `// ${newLang} snippet\n`);
    }
  };

  const runCodeLocalJS = () => {
    const startTime = performance.now();
    let logs = [];
    const customConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args) => logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      warn: (...args) => logs.push("[WARN] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      info: (...args) => logs.push("[INFO] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '))
    };

    try {
      const runFn = new Function('console', 'stdin', code);
      runFn(customConsole, stdin);
      const endTime = performance.now();
      setOutput(logs.join('\n') || "(Program executed successfully with no output)");
      setExecutionError('');
      setExecutionTime((endTime - startTime).toFixed(2));
    } catch (err) {
      const endTime = performance.now();
      setOutput(logs.join('\n'));
      setExecutionError(err.toString());
      setExecutionTime((endTime - startTime).toFixed(2));
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('');
    setExecutionError('');
    setExecutionTime(null);

    // If JavaScript or TypeScript local execution
    if (language === 'javascript' || language === 'typescript') {
      setTimeout(() => {
        runCodeLocalJS();
      }, 100);
      return;
    }

    // Wandbox API for other languages
    const startTime = performance.now();
    try {
      const compiler = COMPILER_MAP[language] || "gcc-head";
      const wandboxEndpoint = `${settings.wandboxUrl.replace(/\/$/, '')}/api/compile.json`;

      const res = await fetch(wandboxEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: compiler,
          code: code,
          stdin: stdin
        })
      });

      if (!res.ok) {
        throw new Error(`Wandbox API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const endTime = performance.now();
      setExecutionTime((endTime - startTime).toFixed(2));

      let resultText = "";
      if (data.program_output) resultText += data.program_output;
      if (data.compiler_output) resultText += data.compiler_output;

      if (data.status === "0" || !data.status) {
        setOutput(resultText || "(Program completed with output code 0)");
      } else {
        setOutput(data.program_output || "");
        setExecutionError(data.compiler_error || data.program_error || `Process exited with code ${data.status}`);
      }
    } catch (err) {
      console.warn("Wandbox execution error, using fallback:", err);
      const endTime = performance.now();
      setExecutionTime((endTime - startTime).toFixed(2));
      setExecutionError(`Execution Failed: ${err.message}. Please check Settings API URL or connection.`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 140px)' }}>
        
        {/* Editor Toolbar Header */}
        <div className="card" style={{ padding: '12px 20px', minHeight: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="form-label" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Language:</span>
              <select
                className="select-control"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: '700' }}
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="c">C (GCC)</option>
                <option value="java">Java (OpenJDK)</option>
                <option value="typescript">TypeScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="ruby">Ruby</option>
                <option value="php">PHP</option>
                <option value="sql">SQL</option>
              </select>
            </div>

            <button
              onClick={() => setShowStdin(!showStdin)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
            >
              {showStdin ? 'Hide Stdin' : 'Add Input (stdin)'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowDockerHelp(true)}
              className="btn btn-secondary"
              title="Execution Engines Help"
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Engines</span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-secondary"
              title="Editor Settings"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              ⚙️
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="btn btn-primary"
              style={{ padding: '6px 18px', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isRunning ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>Run Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Stdin Panel */}
        {showStdin && (
          <div className="card" style={{ padding: '12px 16px', minHeight: 'auto' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard Input (stdin)</label>
            <textarea
              className="form-input"
              rows={2}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter input values for your program..."
              style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>
        )}

        {/* Main Split Layout: Monaco Editor & Output Console */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: 0 }}>
          
          {/* Editor Pane */}
          <div className="monaco-wrapper" style={{ height: '100%', borderRadius: '16px' }}>
            <Editor
              language={language}
              value={code}
              onChange={setCode}
              theme={settings.theme}
              fontSize={settings.fontSize}
              tabSize={settings.tabSize}
            />
          </div>

          {/* Console Output Pane */}
          <div className="card" style={{ height: '100%', padding: '16px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)' }}>Output Terminal</h3>
                {executionTime && (
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                    {executionTime} ms
                  </span>
                )}
              </div>
              <button
                onClick={() => { setOutput(''); setExecutionError(''); setExecutionTime(null); }}
                className="btn btn-secondary"
                style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: '600' }}
              >
                Clear
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-color)' }}>
              {output && <div style={{ color: 'var(--text-color)' }}>{output}</div>}
              {executionError && (
                <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: '8px' }}>
                  {executionError}
                </div>
              )}
              {!output && !executionError && !isRunning && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Click "Run Code" above to execute your code snippet and view terminal output.
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Docker / Execution Engine Help Modal */}
      {showDockerHelp && (
        <DockerHelp onClose={() => setShowDockerHelp(false)} />
      )}
    </Layout>
  );
}

export default function CodeEditorPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading Code Editor Environment...
      </div>
    }>
      <CodeEditorContent />
    </Suspense>
  );
}
