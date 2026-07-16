import { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";

// App-wide action notifications. Any component under NotificationProvider calls
// useNotify() and raises a toast: notify.success/error/info/warning(message).
// Toasts stack (newest on top), auto-dismiss by type, and can be dismissed by hand.
const NotifyContext = createContext(null);

// Auto-dismiss (ms) per type. Errors are sticky (0) so a failure is never missed.
const DURATIONS = { success: 3500, info: 4000, warning: 6000, error: 0 };
const MAX_STACK = 5;
const ICONS = { success: "✓", error: "!", warning: "▲", info: "i" };

let _seq = 0;

function Toaster({ items, onDismiss }) {
  if (items.length === 0) return null;
  return (
    <div className="toaster" role="region" aria-label="Notifications">
      {items.map(n => (
        <div
          key={n.id}
          className={`toast toast--${n.type}`}
          role={n.type === "error" || n.type === "warning" ? "alert" : "status"}
          aria-live={n.type === "error" || n.type === "warning" ? "assertive" : "polite"}
        >
          <span className="toast__icon" aria-hidden="true">{ICONS[n.type] || "i"}</span>
          <span className="toast__msg">{n.message}</span>
          <button className="toast__close" aria-label="Dismiss notification" onClick={() => onDismiss(n.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setItems(list => list.filter(n => n.id !== id));
    const t = timers.current[id];
    if (t) { clearTimeout(t); delete timers.current[id]; }
  }, []);

  const notify = useCallback((type, message, opts = {}) => {
    if (!message) return null;
    const id = ++_seq;
    const duration = opts.duration ?? DURATIONS[type] ?? 4000;
    // Newest on top; cap the stack so a burst can't cover the screen.
    setItems(list => [{ id, type, message: String(message) }, ...list].slice(0, MAX_STACK));
    if (duration > 0) timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Stable API object (notify/dismiss are stable useCallbacks). useMemo, not a
  // render-time ref write, so StrictMode's double render can't capture a stale closure.
  const api = useMemo(() => ({
    notify,
    success: (msg, opts) => notify("success", msg, opts),
    error: (msg, opts) => notify("error", msg, opts),
    warning: (msg, opts) => notify("warning", msg, opts),
    info: (msg, opts) => notify("info", msg, opts),
    dismiss,
  }), [notify, dismiss]);

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <Toaster items={items} onDismiss={dismiss} />
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useNotify must be used within a NotificationProvider");
  return ctx;
}
