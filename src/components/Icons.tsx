export function Arrow({ className = 'arrow' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 10" fill="none" aria-hidden="true" focusable="false">
      <path d="M0 5h16.5M12.5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Close() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function Phone() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M4.2 1.5l2 3-1.3 1.6a8 8 0 004.9 4.9l1.6-1.3 3 2-1 2.3c-.3.6-1 1-1.7.9C6.4 14.2 1.8 9.6 1.1 4.3c-.1-.7.3-1.4.9-1.7l2.2-1.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
