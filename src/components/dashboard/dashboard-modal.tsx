"use client";

import { useEffect } from "react";

export function DashboardModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Quick action</p>
            <h3>{title}</h3>
            <p className="subtle">{description}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
