'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Lang } from '@/content/i18n';
import { adminDict } from '@/content/admin-i18n';

const STATUSES = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
const PAYMENTS = ['unpaid', 'deposit', 'paid'];

/** Status, payment and internal notes for one order. Saves immediately, then refreshes the server view. */
export function OrderActions({ lang, orderRef, status, payment, notes }: { lang: Lang; orderRef: string; status: string; payment: string; notes: string }) {
  const a = adminDict[lang].drawer;
  const ad = adminDict[lang];
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(notes);
  const [msg, setMsg] = useState<string | null>(null);

  async function patch(body: Record<string, string>) {
    setMsg(null);
    const r = await fetch(`/api/admin/orders/${orderRef}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    if (!r?.ok) return setMsg(a.failed);
    if ('internal_notes' in body) setMsg(a.saved);
    start(() => router.refresh());
  }

  return (
    <div className="adm-actions" aria-busy={pending}>
      <fieldset>
        <legend className="label">{a.setStatus}</legend>
        <div className="adm-seg">
          {STATUSES.map((s) => (
            <button key={s} type="button" className="adm-pill" data-status={s} aria-pressed={status === s} onClick={() => status !== s && patch({ status: s })}>
              {ad.status[s]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{a.setPayment}</legend>
        <div className="adm-seg">
          {PAYMENTS.map((p) => (
            <button key={p} type="button" className="adm-pill" data-pay={p} aria-pressed={payment === p} onClick={() => payment !== p && patch({ payment: p })}>
              {ad.payment[p]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label" htmlFor="internal">
          {a.internal}
        </label>
        <textarea id="internal" className="textarea" rows={3} value={text} maxLength={1000} data-dirty={text !== notes} onChange={(e) => setText(e.target.value)} />
        <div className="adm-row">
          <span className="field__help">{a.internalHelp}</span>
          <button type="button" data-save className="btn btn--ghost adm-btn-s" onClick={() => patch({ internal_notes: text })} disabled={text === notes}>
            {a.save}
          </button>
        </div>
        {msg && (
          <p className="small" role="status">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
