"use client";

export function PrintReportButton() {
  return (
    <button type="button" className="button button-secondary compact-button" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
