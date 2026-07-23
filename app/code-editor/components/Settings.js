"use client";

export default function Settings({
  settings,
  onSave,
  onClose
}) {
  const handleChange = (key, val) => {
    onSave({ ...settings, [key]: val });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Editor Settings</h3>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ width: '2rem', height: '2rem', padding: 0 }}>
            ✕
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Wandbox API URL</label>
          <input
            type="text"
            className="form-input"
            value={settings.wandboxUrl}
            onChange={(e) => handleChange("wandboxUrl", e.target.value)}
            placeholder="e.g. https://wandbox.org"
          />
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            The default is the public <code>https://wandbox.org</code> server, providing free compilation for all languages.
          </p>
        </div>

        <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label className="form-label">Editor Theme</label>
            <select
              className="select-control"
              value={settings.theme}
              onChange={(e) => handleChange("theme", e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="vs-dark">Dark Theme</option>
              <option value="light">Light Theme</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>
          <div>
            <label className="form-label">Tab Size</label>
            <select
              className="select-control"
              value={settings.tabSize}
              onChange={(e) => handleChange("tabSize", parseInt(e.target.value))}
              style={{ width: "100%" }}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="8">8 spaces</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Font Size ({settings.fontSize}px)</label>
          <input
            type="range"
            min="12"
            max="24"
            step="1"
            value={settings.fontSize}
            onChange={(e) => handleChange("fontSize", parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-blue)" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: "0.5rem 1.5rem" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
