'use client';
import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';

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
  const router = useRouter();
  const [pending, start] = useTransition();
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
        try {
          const r = await fetch('/api/admin/days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, blocked: !blocked }) }).catch(() => null);
          if (r?.ok) start(() => router.refresh());
        } finally {
          busy.current = false;
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
