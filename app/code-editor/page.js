"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Editor from './components/Editor';
import Settings from './components/Settings';

const STARTER_CODES = {
  javascript: `// JavaScript Playground\n// You can use standard JavaScript and console.log for output\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst num = 10;\nconsole.log(\`Fibonacci number at position \${num} is: \${fibonacci(num)}\`);\n`,
  python: `# Python 3 Playground\na = int(input("Enter a: "))\nb = int(input("Enter b: "))\nprint(a + b)\n`,
  cpp: `// C++ Playground\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a = 0, b = 0;\n    cout << "Enter a: ";\n    if (cin >> a) {\n        cout << "Enter b: ";\n        if (cin >> b) {\n            cout << (a + b) << endl;\n        }\n    }\n    return 0;\n}\n`,
  c: `// C Playground\n#include <stdio.h>\n\nint main() {\n    int a = 0, b = 0;\n    printf("Enter a: ");\n    if (scanf("%d", &a) == 1) {\n        printf("Enter b: ");\n        if (scanf("%d", &b) == 1) {\n            printf("%d\\n", a + b);\n        }\n    }\n    return 0;\n}\n`,
  java: `// Java Playground\nimport java.util.*;\n\nclass Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n\n        System.out.print("Enter a: ");\n        int a = sc.nextInt();\n\n        System.out.print("Enter b: ");\n        int b = sc.nextInt();\n\n        System.out.println(a + b);\n    }\n}\n`,
  typescript: `// TypeScript Playground\nfunction fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst num: number = 10;\nconsole.log(\`Fibonacci number at position \${num} is: \${fibonacci(num)}\`);\n`,
  go: `// Go Playground\npackage main\nimport "fmt"\n\nfunc main() {\n\tvar a, b int\n\tfmt.Print("Enter a: ")\n\tif _, err := fmt.Scan(&a); err == nil {\n\t\tfmt.Print("Enter b: ")\n\t\tif _, err := fmt.Scan(&b); err == nil {\n\t\t\tfmt.Printf("%d\\n", a+b)\n\t\t}\n\t}\n}\n`,
  rust: `// Rust Playground\nfn main() {\n    println!("Hello from Rust!");\n}\n`,
  ruby: `# Ruby Playground\nputs "Hello from Ruby!"\n`,
  php: `<?php\n// PHP Playground\necho "Hello from PHP!\\n";\n`,
  sql: `-- SQL Playground\nCREATE TABLE developers (\n  id INT PRIMARY KEY,\n  name VARCHAR(50),\n  role VARCHAR(50)\n);\n\nINSERT INTO developers VALUES (1, 'Alice', 'Frontend'), (2, 'Bob', 'Backend');\n\nSELECT * FROM developers;\n`
};

const COMPILER_MAP = {
  cpp: "gcc-head",
  c: "gcc-head-c",
  python: "cpython-3.12.7",
  javascript: "nodejs-20.17.0",
  typescript: "typescript-5.6.2",
  java: "openjdk-jdk-22+36",
  go: "go-1.23.2",
  rust: "rust-1.82.0",
  ruby: "ruby-4.0.2",
  php: "php-8.3.12",
  sql: "sqlite-3.46.1",
  csharp: "dotnetcore-8.0.402"
};

function formatInteractiveOutput(rawOutput, inputsArray) {
  if (!rawOutput) return "";
  if (!inputsArray || inputsArray.length === 0) return rawOutput;

  let inputIdx = 0;
  let result = rawOutput;

  // Interleave user inputs after prompts (e.g. "Enter a: ", "Enter b: ")
  result = result.replace(/([^:\n]+:\s*)/g, (match) => {
    if (inputIdx < inputsArray.length) {
      const val = inputsArray[inputIdx++];
      return match + val + "\n";
    }
    return match;
  });

  return result;
}

function CodeEditorContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(STARTER_CODES.javascript);
  const [inputsList, setInputsList] = useState([]);
  const [consoleInput, setConsoleInput] = useState('');
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);

  const consoleInputRef = useRef(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    wandboxUrl: "https://wandbox.org",
    theme: "light",
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
    setConsoleInput('');
    setInputsList([]);
  };

  const handleReset = () => {
    setCode(STARTER_CODES[language] || '');
    setInputsList([]);
    setConsoleInput('');
    setOutput('');
    setExecutionError('');
    setExecutionTime(null);
  };

  const runCodeLocalJS = (currentInputs = []) => {
    const startTime = performance.now();
    let logs = [];
    const customConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args) => logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      warn: (...args) => logs.push("[WARN] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      info: (...args) => logs.push("[INFO] " + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '))
    };

    try {
      const activeStdin = currentInputs.join('\n');
      const runFn = new Function('console', 'stdin', code);
      runFn(customConsole, activeStdin);
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

  const handleRunCode = async (currentInputs = inputsList) => {
    setIsRunning(true);
    setExecutionError('');
    setExecutionTime(null);

    const activeStdin = currentInputs.join('\n');

    // If JavaScript or TypeScript local execution
    if (language === 'javascript' || language === 'typescript') {
      setTimeout(() => {
        runCodeLocalJS(currentInputs);
      }, 100);
      return;
    }

    // Wandbox API for other languages
    const startTime = performance.now();
    try {
      const compiler = COMPILER_MAP[language] || "gcc-head";
      const wandboxEndpoint = `${settings.wandboxUrl.replace(/\/$/, '')}/api/compile.json`;

      let codeToSubmit = code;
      if (language === 'java') {
        codeToSubmit = code.replace(/public\s+class\s+(\w+)/g, 'class $1');
      }

      const res = await fetch(wandboxEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: compiler,
          code: codeToSubmit,
          stdin: activeStdin
        })
      });

      if (!res.ok) {
        throw new Error(`Wandbox API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const endTime = performance.now();
      setExecutionTime((endTime - startTime).toFixed(2));

      let rawOutputText = "";
      if (data.program_output) rawOutputText += data.program_output;
      if (data.compiler_output) rawOutputText += data.compiler_output;

      const formattedOutput = formatInteractiveOutput(rawOutputText, currentInputs);

      const isInputEOFError = data.program_error && (
        data.program_error.includes("NoSuchElementException") ||
        data.program_error.includes("EOFError") ||
        data.program_error.includes("Scanner") ||
        data.program_error.includes("cin")
      );

      if (data.status === "0" || !data.status || (rawOutputText && isInputEOFError)) {
        setOutput(formattedOutput || "(Program completed with output code 0)");
        setExecutionError('');
      } else {
        setOutput(formattedOutput || data.program_output || "");
        setExecutionError(data.compiler_error || data.program_error || `Process exited with code ${data.status}`);
      }
    } catch (err) {
      console.warn("Wandbox execution error, using fallback:", err);
      const endTime = performance.now();
      setExecutionTime((endTime - startTime).toFixed(2));
      setExecutionError(`Execution Failed: ${err.message}. Please check connection.`);
    } finally {
      setIsRunning(false);
      // Automatically focus terminal input box after running
      if (consoleInputRef.current) {
        consoleInputRef.current.focus();
      }
    }
  };

  const handleConsoleInputSubmit = (e) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;

    // Parse input tokens (space or line separated)
    const newTokens = consoleInput.trim().split(/\s+/);
    const updatedInputs = [...inputsList, ...newTokens];
    setInputsList(updatedInputs);
    setConsoleInput('');
    handleRunCode(updatedInputs);
  };

  const handleInitialRunClick = () => {
    setInputsList([]);
    setOutput('');
    setExecutionError('');
    setConsoleInput('');
    handleRunCode([]);
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
              onClick={handleInitialRunClick}
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

          {/* Right Side: Full Height OUTPUT CONSOLE with Interactive Terminal Input */}
          <div className="card" style={{ height: '100%', padding: '16px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
              {(output || executionError || inputsList.length > 0) && (
                <button
                  onClick={() => { setOutput(''); setExecutionError(''); setExecutionTime(null); setConsoleInput(''); setInputsList([]); }}
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: '600' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Console Terminal Log Display */}
            <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {output && <div style={{ color: 'var(--text-color)' }}>{output}</div>}
              {executionError && (
                <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {executionError}
                </div>
              )}
              {!output && !executionError && !isRunning && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  Click "Run Code" or type input below and press Enter to execute.
                </div>
              )}
            </div>

            {/* Interactive Output Console Input Prompt */}
            <form
              onSubmit={handleConsoleInputSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid var(--card-border)'
              }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--link-color)', fontSize: '0.9rem' }}>&gt;</span>
              <input
                ref={consoleInputRef}
                type="text"
                className="form-input"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder="Type input here and press Enter..."
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  padding: '6px 12px',
                  borderRadius: '8px'
                }}
              />
              <button
                type="submit"
                disabled={isRunning}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}
              >
                Send Input
              </button>
            </form>

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
