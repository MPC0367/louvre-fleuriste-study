'use client';
import { useRef, useState } from 'react';
import { adminBlock } from '@/lib/client-api';

/**
 * Blocks or reopens one day. It stays focusable while the change is saving (aria-disabled, not
 * disabled), so keyboard focus is never dropped, and its name carries the date. On phones it shows a
 * one-word label.
 */
export function BlockToggle({
  date,
  dateLabel,
  blocked,
  labels,
}: {
  date: string;
  dateLabel: string;
  blocked: boolean;
  labels: { block: string; unblock: string; blockShort: string; unblockShort: string };
}) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const full = blocked ? labels.unblock : labels.block;
  return (
    <button
      type="button"
      className="adm-block"
      aria-pressed={blocked}
      aria-disabled={pending || undefined}
      aria-label={`${full} · ${dateLabel}`}
      onClick={async () => {
        if (busy.current || pending) return;
        busy.current = true;
        setPending(true);
        try {
          await adminBlock(date, !blocked); // the capacity view reloads when the change is announced
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      <span className="adm-block__full">{full}</span>
      <span className="adm-block__short" aria-hidden="true">
        {blocked ? labels.unblockShort : labels.blockShort}
      </span>
    </button>
  );
}
