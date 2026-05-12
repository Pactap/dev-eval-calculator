import { useState } from "react";

export function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="tip">
      <span
        className="tip__trigger"
        tabIndex="0"
        role="button"
        aria-label="More information"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >?</span>
      {show && <span className="tip__content" role="tooltip">{text}</span>}
    </span>
  );
}
