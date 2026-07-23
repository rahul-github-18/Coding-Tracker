"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Editor from './components/Editor';
import Settings from './components/Settings';

const STARTER_CODES = {
  javascript: `// JavaScript Playground\n// You can use standard JavaScript and console.log for output\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst num = 10;\nconsole.log(\`Fibonacci number at position \${num} is: \${fibonacci(num)}\`);\n`,
  python: `# Python 3 Playground\n# You can use standard Python print() for output\n\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nnum = 10\nprint(f"Fibonacci number at position {num} is: {fibonacci(num)}")\n`,
  cpp: `// C++ Playground\n#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) return n;\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci number at position " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}\n`,
  c: `// C Playground\n#include <stdio.h>\n\nint fibonacci(int n) {\n    if (n <= 1) return n;\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    printf("Fibonacci number at position %d is: %d\\n", num, fibonacci(num));\n    return 0;\n}\n`,
  java: `// Java Playground\npublic class Main {\n    public static int fibonacci(int n) {\n        if (n <= 1) return n;\n        return fibonacci(n - 1) + fibonacci(n - 2);\n    }\n\n    public static void main(String[] args) {\n        int num = 10;\n        System.out.println("Fibonacci number at position " + num + " is: " + fibonacci(num));\n    }\n}\n`,
  typescript: `// TypeScript Playground\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst num: number = 10;\nconsole.log(\`Fibonacci number at position \${num} is: \${fibonacci(num)}\`);\n`,
  go: `// Go Playground\npackage main\nimport "fmt"\n\nfunc fibonacci(n int) int {\n\tif n <= 1 {\n\t\treturn n\n\t}\n\treturn fibonacci(n-1) + fibonacci(n-2)\n}\n\nfunc main() {\n\tnum := 10\n\tfmt.Printf("Fibonacci number at position %d is: %d\\n", num, fibonacci(num))\n}\n`,
  rust: `// Rust Playground\nfn fibonacci(n: u32) -> u32 {\n    if n <= 1 { return n; }\n    fibonacci(n - 1) + fibonacci(n - 2)\n}\n\nfn main() {\n    let num = 10;\n    println!("Fibonacci number at position {} is: {}", num, fibonacci(num));\n}\n`,
  ruby: `# Ruby Playground\ndef fibonacci(n)\n  return n if n <= 1\n  fibonacci(n - 1) + fibonacci(n - 2)\nend\n\nnum = 10\nputs "Fibonacci number at position #{num} is: #{fibonacci(num)}"\n`,
  php: `<?php\n// PHP Playground\nfunction fibonacci($n) {\n    if ($n <= 1) return $n;\n    return fibonacci($n - 1) + fibonacci($n - 2);\n}\n\n$num = 10;\necho "Fibonacci number at position {$num} is: " . fibonacci($num) . "\\n";\n`,
  sql: `-- SQL Playground\nCREATE TABLE developers (\n  id INT PRIMARY KEY,\n  name VARCHAR(50),\n  role VARCHAR(50)\n);\n\nINSERT INTO developers VALUES (1, 'Alice', 'Frontend'), (2, 'Bob', 'Backend');\n\nSELECT * FROM developers;\n`
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
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
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
    setCode(STARTER_CODES[newLang] || `// ${newLang} snippet\n`);
    setOutput('');
    setExecutionError('');
    setExecutionTime(null);
  };

  const handleReset = () => {
    setCode(STARTER_CODES[language] || '');
    setStdin('');
    setOutput('');
    setExecutionError('');
    setExecutionTime(null);
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
      setExecutionError(`Execution Failed: ${err.message}. Please check connection.`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
        
        {/* Top Control Bar */}
        <div className="card" style={{ padding: '12px 20px', minHeight: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="select-control"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{ padding: '8px 16px', fontSize: '0.9rem', fontWeight: '700', minWidth: '160px' }}
            >
              <option value="javascript">JavaScript</option>
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

            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-xs font-semibold text-sky-600 dark:text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              Code Diary IDE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-secondary"
              title="Settings"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              ⚙️
            </button>

            <button
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '700' }}
            >
              Reset
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
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

        {/* Main Split Layout */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: 0 }}>
          
          {/* Left Side: Full Height Monaco Code Editor */}
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

          {/* Right Side: Split into STDIN (Top) and OUTPUT CONSOLE (Bottom) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            
            {/* Top Right: Standard Input (STDIN) */}
            <div className="card" style={{ flex: '0 0 40%', padding: '16px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--link-color)' }}>
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                  <line x1="6" y1="12" x2="10" y2="12"></line>
                </svg>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  STANDARD INPUT (STDIN)
                </h3>
              </div>
              <textarea
                className="form-input"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Provide arguments/input to feed into your program here..."
                style={{ flex: 1, width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none', border: 'none', background: 'transparent', padding: '4px' }}
              />
            </div>

            {/* Bottom Right: Output Console */}
            <div className="card" style={{ flex: 1, padding: '16px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--link-color)' }}>
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                  </svg>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    OUTPUT CONSOLE
                  </h3>
                  {executionTime && (
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                      {executionTime} ms
                    </span>
                  )}
                </div>
                {(output || executionError) && (
                  <button
                    onClick={() => { setOutput(''); setExecutionError(''); setExecutionTime(null); }}
                    className="btn btn-secondary"
                    style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: '600' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {output && <div style={{ color: 'var(--text-color)' }}>{output}</div>}
                {executionError && (
                  <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {executionError}
                  </div>
                )}
                {!output && !executionError && !isRunning && (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    Click "Run Code" to compile and execute.
                  </div>
                )}
              </div>
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
    </Layout>
  );
}

export default function CodeEditorPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading Code Editor...
      </div>
    }>
      <CodeEditorContent />
    </Suspense>
  );
}
