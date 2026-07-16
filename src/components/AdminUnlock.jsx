import { useState } from "react";
import { useConfig } from "../configStore.jsx";

/**
 * The single, centralized unlock/lock control for the whole Admin tab. Unlocking
 * (passkey) enables editing of every admin surface and reveals the write-only
 * panels (Bulk data, Developer usage); locking returns everything to read-only.
 */
export function AdminUnlock() {
  const { unlocked, unlock, lock } = useConfig();
  const [prompting, setPrompting] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  const submitKey = async (e) => {
    e.preventDefault();
    if (await unlock(keyInput)) {
      setPrompting(false);
      setKeyInput("");
      setKeyError("");
    } else {
      setKeyError("Incorrect passkey.");
    }
  };

  if (unlocked) {
    return <button className="btn btn--sm" onClick={lock} title="Return everything to read-only">Lock editing</button>;
  }

  return (
    <div className="admin-unlock">
      {prompting ? (
        <form className="admin-unlock__form" onSubmit={submitKey}>
          <input type="password" className="input" value={keyInput} autoFocus autoComplete="off" placeholder="Passkey"
            onChange={e => { setKeyInput(e.target.value); setKeyError(""); }} />
          <button className="btn btn--sm btn--primary" type="submit">Unlock</button>
          {keyError && <span className="settings-panel__warn admin-unlock__err">{keyError}</span>}
        </form>
      ) : (
        <button className="btn btn--sm btn--primary" onClick={() => { setPrompting(true); setKeyError(""); }}>
          Unlock to edit
        </button>
      )}
    </div>
  );
}
