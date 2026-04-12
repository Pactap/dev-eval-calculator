import { useState } from "react";

export function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="tip">
      <span
        className="tip__trigger"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >?</span>
      {show && <span className="tip__content">{text}</span>}
    </span>
  );
}
