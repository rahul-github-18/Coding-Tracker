"use client";

export default function DockerHelp({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal docker-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Execution Engines</h3>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ width: '2rem', height: '2rem', padding: 0 }}>
            ✕
          </button>
        </div>

        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "1.2rem" }}>
            Code Diary provides two modes to execute your programs with maximum speed, zero limitations, and full portability.
          </p>

          <h4 style={{ color: "var(--text-primary)", marginTop: "1rem", marginBottom: "0.4rem" }}>1. Client Wasm (Local Sandboxing)</h4>
          <p style={{ marginBottom: "0.75rem" }}>
            Executes code <strong>100% locally</strong> inside your web browser using WebAssembly.
          </p>
          <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
            <li>Supports: <strong>JavaScript</strong> and <strong>Python 3</strong>.</li>
            <li>Python execution uses <strong>Pyodide</strong>, a full Python distribution compiled to WebAssembly.</li>
            <li>No network requests are sent when executing code in this mode. It works entirely offline!</li>
          </ul>

          <h4 style={{ color: "var(--text-primary)", marginTop: "1.2rem", marginBottom: "0.4rem" }}>2. Wandbox Cloud (Online Engine)</h4>
          <p style={{ marginBottom: "0.75rem" }}>
            Executes code remotely on the free, open-source **Wandbox compiler platform**.
          </p>
          <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
            <li>Supports: <strong>All 11+ languages</strong> (Go, Rust, C++, Java, C#, Ruby, PHP, and more).</li>
            <li>Fully free, open-source, and does not require any whitelist tokens or API signup keys.</li>
            <li>Allows you to write standard code (e.g. using standard I/O libraries) and runs it on a cloud server instantly.</li>
          </ul>

          <h4 style={{ color: "var(--text-primary)", marginTop: "1.2rem", marginBottom: "0.4rem" }}>Self-Hosting Wandbox</h4>
          <p>
            Because Wandbox is open-source, you can run your own Wandbox compilation server inside your private network. Once hosted, open <strong>Settings</strong> (⚙️ icon) and update the <strong>Wandbox API URL</strong> to point to your self-hosted instance.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
