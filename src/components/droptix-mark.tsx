/**
 * Droptix logomark — a stylised industrial ticket stub with a downward
 * "drop" notch. Scales from 16px to 64px; stroke-based so it inherits
 * currentColor.
 */
export function DroptixMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {/* Ticket outline */}
      <path d="M2 7 L22 7 L22 10 L20 12 L22 14 L22 17 L2 17 L2 14 L4 12 L2 10 Z" />
      {/* Drop slit */}
      <path d="M12 10 L12 14" />
    </svg>
  );
}
