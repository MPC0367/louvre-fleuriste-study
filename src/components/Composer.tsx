'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { baht, dict, longDate, type Lang } from '@/content/i18n';
import { colourFamilies, getWork, photo, worksNewest } from '@/content/works';
import { rules, type Kind, type Method } from '@/lib/rules';
import { Arrow } from './Icons';
import { keepWords } from '@/lib/thai';
import { availability, placeOrder, uploadPicture } from '@/lib/client-api';
import { STATIC } from '@/lib/paths';
import { Tag } from './Tag';
import { Calendar, type Day } from './Calendar';

const KEY = 'lf-order-draft-v1';
const OCCASIONS = ['valentines', 'mothers-day', 'christmas', 'other'] as const;

interface Draft {
  kind: Kind;
  workId: string | null;
  similar: boolean;
  budget: number | null;
  budgetOther: string;
  occasion: string | null;
  occasionOther: string;
  colour: string | null;
  flowers: string;
  uploadId: string | null;
  uploadName: string;
  uploadThumb: string | null;
  date: string | null;
  windowId: string | null;
  method: Method;
  recipientName: string;
  recipientPhone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postcode: string;
  instructions: string;
  card: string;
  senderName: string;
  senderPhone: string;
  email: string;
  notes: string;
  sameAsYou: boolean;
  idemKey: string;
}

const blank = (lang: Lang = 'th'): Draft => ({
  kind: 'bouquet',
  workId: null,
  similar: false,
  budget: null,
  budgetOther: '',
  occasion: null,
  occasionOther: '',
  colour: null,
  flowers: '',
  uploadId: null,
  uploadName: '',
  uploadThumb: null,
  date: null,
  windowId: null,
  method: 'delivery',
  recipientName: '',
  recipientPhone: '',
  address: '',
  subdistrict: '',
  district: '',
  province: lang === 'th' ? 'กรุงเทพมหานคร' : 'Bangkok',
  postcode: '',
  instructions: '',
  card: '',
  senderName: '',
  senderPhone: '',
  email: '',
  notes: '',
  sameAsYou: false,
  idemKey: newKey(),
});

function newKey() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

const phoneOk = (p: string) => /^0\d{8,9}$/.test(p.replace(/[\s-]/g, ''));
const STEP_FIELDS: Record<number, string[]> = {
  0: ['kind', 'budget', 'workId'],
  1: ['uploadId'],
  2: ['date', 'windowId', 'method'],
  3: ['senderName', 'senderPhone', 'email', 'recipientName', 'recipientPhone', 'address', 'district', 'postcode'],
};

type ServerError = { code: string; fields?: string[]; nearest?: string[]; windows?: { id: string; left: number }[] };

export function Composer({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const o = t.order;
  const q = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const step = Math.min(4, Math.max(0, Number(q.get('step') ?? 0) || 0));

  const [d, setD] = useState<Draft | null>(null);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState<ServerError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, Day>>({});
  const headRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // ── Load draft, then apply any entry point from the URL (a work, a colour, a kind) ──
  useEffect(() => {
    let base = blank(lang);
    let had = false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        base = { ...base, ...JSON.parse(raw) };
        had = true;
      }
    } catch {}
    const work = q.get('work');
    const colour = q.get('colour');
    const kind = q.get('kind');
    const occasion = q.get('occasion');
    if (work && getWork(work)) {
      base.workId = work;
      base.similar = q.get('similar') === '1';
      const w = getWork(work)!;
      base.kind = w.format === 'box' ? 'box' : 'bouquet';
      if (!base.colour) base.colour = w.colours[0];
      if (w.occasion && !base.occasion) base.occasion = w.occasion;
    }
    if (colour && colourFamilies.some((c) => c.key === colour)) base.colour = colour;
    if (kind === 'box' || kind === 'bouquet') {
      base.kind = kind;
      if (kind === 'box') base.workId = null;
    }
    if (occasion && (OCCASIONS as readonly string[]).includes(occasion)) base.occasion = occasion;
    if (base.budget != null && base.budget < rules.minBudget[base.kind]) base.budget = null;
    setD(base);
    setRestored(had && !work && !colour && !kind);
    const gap = [0, 1, 2, 3].find((n) => n < step && Object.keys(validateStep(n, base)).length > 0);
    if (gap != null) goStep(gap, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!d) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {}
  }, [d]);

  // Move focus to the step heading when the step changes, so the change is announced.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headRef.current?.focus({ preventScroll: true });
    const top = (headRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 140;
    if (window.scrollY > top) window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [step]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => (p ? { ...p, [k]: v } : p));
    setErrors((e) => {
      if (!e[k as string]) return e;
      const n = { ...e };
      delete n[k as string];
      return n;
    });
  }, []);

  const goStep = useCallback(
    (n: number, replace = false) => {
      const p = new URLSearchParams(q.toString());
      if (n === 0) p.delete('step');
      else p.set('step', String(n));
      const url = p.size ? `${path}?${p}` : path;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [q, path, router],
  );

  const minBudget = d ? rules.minBudget[d.kind] : 0;

  function validateStep(n: number, dr: Draft): Record<string, string> {
    const e: Record<string, string> = {};
    if (n === 0) {
      if (dr.budget == null || dr.budget < rules.minBudget[dr.kind]) e.budget = o.budgetLow(baht(rules.minBudget[dr.kind], lang));
      else if (dr.budget > rules.maxBudget) e.budget = o.budgetHigh(baht(rules.maxBudget, lang));
    }
    if (n === 1) {
      if (uploading) e.uploadId = o.uploading;
    }
    if (n === 2) {
      if (!dr.date) e.date = o.pickDate;
      else if (!dr.windowId) e.windowId = o.pickWindow;
      else {
        const day = days[dr.date];
        const w = day?.windows.find((x) => x.id === dr.windowId);
        if (day && (day.state === 'full' || day.state === 'closed')) e.date = o.err.day_full;
        else if (w && w.left <= 0) e.windowId = o.windowFull;
      }
    }
    if (n === 3) {
      if (!dr.senderName.trim()) e.senderName = o.required;
      if (!phoneOk(dr.senderPhone)) e.senderPhone = dr.senderPhone ? o.badPhone : o.required;
      if (dr.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dr.email)) e.email = o.badEmail;
      if (dr.method === 'delivery') {
        const rn = dr.sameAsYou ? dr.senderName : dr.recipientName;
        const rp = dr.sameAsYou ? dr.senderPhone : dr.recipientPhone;
        if (!rn.trim()) e.recipientName = o.required;
        if (!phoneOk(rp)) e.recipientPhone = rp ? o.badPhone : o.required;
        if (!dr.address.trim()) e.address = o.required;
        if (!dr.district.trim()) e.district = o.required;
        if (!/^\d{5}$/.test(dr.postcode)) e.postcode = dr.postcode ? o.badPostcode : o.required;
      }
    }
    return e;
  }

  // Back/Forward within the form doesn't remount it: the same guard, whenever the step changes.
  useEffect(() => {
    if (!d) return;
    const gap = [0, 1, 2, 3].find((n) => n < step && Object.keys(validateStep(n, d)).length > 0);
    if (gap != null) goStep(gap, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function next() {
    if (!d) return;
    const e = validateStep(step, d);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => {
        // A date error puts focus on the calendar's day (its roving cell), not on the whole field.
        const first =
          (e.date && document.querySelector<HTMLElement>('.cal__day[tabindex="0"]')) ||
          document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
        first?.focus();
        first?.scrollIntoView({ block: 'center' });
      });
      return;
    }
    setServerErr(null);
    goStep(step + 1);
  }

  async function submit() {
    if (!d || submitting) return;
    for (let n = 0; n < 4; n++) {
      const e = validateStep(n, d);
      if (Object.keys(e).length) {
        setErrors(e);
        goStep(n);
        return;
      }
    }
    setSubmitting(true);
    setServerErr(null);
    const body = {
      ...d,
      lang,
      budget: d.budget,
      occasion: d.occasion === 'other' ? d.occasionOther || 'other' : d.occasion,
      recipientName: d.method === 'delivery' ? (d.sameAsYou ? d.senderName : d.recipientName) : d.recipientName || d.senderName,
      recipientPhone: d.method === 'delivery' ? (d.sameAsYou ? d.senderPhone : d.recipientPhone) : d.recipientPhone,
      notes: [d.similar ? '[similar]' : '', d.notes].filter(Boolean).join(' '),
    };
    try {
      const r = await placeOrder(body);
      const j = r.json as { ref?: string; token?: string; error?: ServerError };
      if (r.ok && j.ref && j.token) {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        router.replace(`/${lang}/order/status?ref=${encodeURIComponent(j.ref)}&t=${encodeURIComponent(j.token)}`);
        return;
      }
      const err: ServerError = j.error ?? { code: 'server' };
      setServerErr(err);
      if (err.code === 'slot_full' || err.code === 'day_full' || err.code === 'closed' || err.code === 'lead' || err.code === 'horizon' || err.code === 'past') {
        if (err.code !== 'slot_full') set('date', null);
        set('windowId', null);
        await refreshDays();
        goStep(2);
      } else if (err.code === 'invalid' && err.fields?.length) {
        const map: Record<string, string> = {};
        err.fields.forEach(
          (f) =>
            (map[f] =
              f === 'workId' ? o.workUnavailable : f === 'budget' && d.budget != null && d.budget > rules.maxBudget ? o.budgetHigh(baht(rules.maxBudget, lang)) : o.required),
        );
        if (err.fields.includes('workId')) set('workId', null);
        setErrors(map);
        const n = [0, 1, 2, 3].find((s) => STEP_FIELDS[s].some((f) => err.fields!.includes(f)));
        if (n != null) goStep(n);
      }
    } catch {
      setServerErr({ code: 'network' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Availability ──
  const [monthStart, setMonthStart] = useState<string | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const refreshDays = useCallback(
    async (from?: string) => {
      const f = from ?? monthStart;
      if (!f) return;
      setLoadingDays(true);
      try {
        const j = await availability(f, 42);
        const m: Record<string, Day> = {};
        for (const x of j.days) m[x.date] = x;
        setDays((p) => ({ ...p, ...m }));
      } catch {
        setServerErr({ code: 'network' });
      } finally {
        setLoadingDays(false);
      }
    },
    [monthStart],
  );
  useEffect(() => {
    if (step === 2 && monthStart) refreshDays(monthStart);
  }, [step, monthStart, refreshDays]);

  // ── Upload ──
  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadErr(null);
    const okType = /^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    if (!okType) return setUploadErr(o.uploadType);
    if (file.size > 8 * 1024 * 1024) return setUploadErr(o.uploadBig);
    setUploading(true);
    try {
      let blob: Blob = file;
      let thumb: string | null = null;
      if (/^image\/(jpeg|png|webp)$/.test(file.type)) {
        const bmp = await createImageBitmap(file);
        blob = await shrink(bmp, 1600, 0.85);
        thumb = await toDataUrl(bmp, 180);
        setPreview(URL.createObjectURL(blob));
      } else {
        setPreview(null);
      }
      const r = await uploadPicture(blob, file.name.replace(/\.(png|webp)$/i, '.jpg'));
      if (!r.ok || typeof r.json.id !== 'string') {
        throw new Error(r.json.error === 'type' ? o.uploadType : r.json.error === 'too_big' ? o.uploadBig : o.uploadFail);
      }
      const id = r.json.id;
      setD((p) => (p ? { ...p, uploadId: id, uploadName: file.name, uploadThumb: thumb } : p));
    } catch (e) {
      setUploadErr(e instanceof Error && e.message ? e.message : o.uploadFail);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const work = d?.workId ? getWork(d.workId) : undefined;
  const tiers = d ? rules.budgetTiers[d.kind] : [];
  const colourLabel = (k: string | null) => (k === 'any' ? o.colourAny : colourFamilies.find((c) => c.key === k)?.[lang] ?? null);
  const occasionLabel = (k: string | null) =>
    !k ? null : k === 'other' ? d?.occasionOther || t.occasions.other : (t.occasions as unknown as Record<string, string>)[k] ?? k;
  const windowLabel = (id: string | null) => {
    const w = rules.windows.find((x) => x.id === id);
    return w ? `${w.from}–${w.to}` : null;
  };
  const dateLabel = (iso: string | null) => (iso ? `${t.weekdays[new Date(iso + 'T00:00:00Z').getUTCDay()]} ${longDate(iso, lang)}` : null);

  const tagRows = useMemo(() => {
    if (!d) return [];
    const rows: [string, string][] = [];
    rows.push([t.fields.kind, d.kind === 'box' ? o.box : o.bouquet]);
    if (work) rows.push([t.fields.work, `No. ${String(work.no).padStart(2, '0')} ${work.name[lang]}`]);
    if (d.budget) rows.push([t.fields.budget, baht(d.budget, lang)]);
    const c = colourLabel(d.colour);
    if (c) rows.push([t.fields.colour, c]);
    const oc = occasionLabel(d.occasion);
    if (oc) rows.push([t.fields.occasion, oc]);
    if (d.uploadId) rows.push([t.fields.reference, d.uploadName]);
    if (d.date) rows.push([t.fields.date, dateLabel(d.date)!]);
    if (d.date && d.windowId) rows.push([t.fields.method, `${d.method === 'delivery' ? o.delivery : o.pickup} · ${windowLabel(d.windowId)}`]);
    if (d.card) rows.push([t.fields.card, d.card.length > 60 ? d.card.slice(0, 60) + '…' : d.card]);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, lang, work]);

  if (!d) {
    return (
      <div className="cal__loading" aria-busy="true">
        {o.loadingDays}
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="field__err" id={`err-${k}`} role="alert">
        {errors[k]}
      </p>
    ) : null;
  const inv = (k: string) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `err-${k}` } : {});
  const serverMsg = serverErr ? (o.err as Record<string, string>)[serverErr.code] ?? o.err.server : null;

  return (
    <div className="grid composer__grid">
      <div className="composer__main">
        <ol className="steps" aria-hidden="true">
          {o.steps.map((s, i) => (
            <li key={s} data-done={i < step} data-current={i === step} />
          ))}
        </ol>
        <div className="stepbar">
          <p className="label">{o.stepOf(step + 1, o.steps.length)}</p>
          {restored && step === 0 && (
            <p className="small">
              {o.restored} ·{' '}
              <button
                type="button"
                className="textbtn"
                onClick={() => {
                  setD(blank(lang));
                  setPreview(null);
                  setRestored(false);
                  setErrors({});
                }}
              >
                {o.startOver}
              </button>
            </p>
          )}
        </div>

        <div className="tagbar" aria-hidden="true">
          <Tag label={false} />
          <span className="tagbar__text">{tagRows.map((r) => r[1]).join(' · ') || o.tagEmpty}</span>
        </div>

        <h2 className="stephead" ref={headRef} tabIndex={-1}>
          {o.steps[step]}
        </h2>

        {serverMsg && (
          <div className="alert" role="alert" style={{ marginTop: 24 }}>
            <p>{serverMsg}</p>
            {serverErr?.code === 'day_full' && serverErr.nearest && serverErr.nearest.length > 0 && (
              <div>
                <p className="small">{o.nearest}</p>
                <div className="pills">
                  {serverErr.nearest.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="chip"
                      onClick={() => {
                        set('date', n);
                        set('windowId', null);
                        setServerErr(null);
                      }}
                    >
                      {dateLabel(n)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="panel" key={step} style={{ marginTop: 32 }}>
          {/* ── Step 1: flowers ─────────────────────────────────────── */}
          {step === 0 && (
            <>
              {work && (
                <div className="field">
                  <p className="label">{d.similar ? t.works.similar : o.fromWork}</p>
                  <div className="workpick">
                    <div className="photo">
                      <Image src={photo(work.id)} alt="" fill sizes="88px" style={{ objectFit: 'cover' }} />
                    </div>
                    <div>
                      <p className="num" style={{ fontSize: 18 }}>
                        No. {String(work.no).padStart(2, '0')}
                      </p>
                      <p>{work.name[lang]}</p>
                      <p className="small">{keepWords(work.seen[lang])}</p>
                    </div>
                    <button type="button" className="textbtn" onClick={() => set('workId', null)}>
                      {o.removeWork}
                    </button>
                  </div>
                  <p className="field__help">{t.works.oneOff[work.format]}</p>
                </div>
              )}
              {err('workId')}

              <fieldset className="field">
                <legend className="label">{o.kind}</legend>
                <div className="choices">
                  {(['bouquet', 'box'] as const).map((k) => (
                    <label key={k} className="choice" aria-disabled={work && k !== (work.format === 'box' ? 'box' : 'bouquet') ? true : undefined}>
                      <input
                        type="radio"
                        name="kind"
                        value={k}
                        checked={d.kind === k}
                        disabled={!!work && k !== (work.format === 'box' ? 'box' : 'bouquet')}
                        onChange={() => {
                          set('kind', k);
                          if (d.budget != null && d.budget < rules.minBudget[k]) set('budget', null);
                        }}
                      />
                      <span className="choice__mark" aria-hidden="true" />
                      <span className="choice__k">{k === 'box' ? o.box : o.bouquet}</span>
                      <span className="choice__v">
                        {o.from} <span className="num">{baht(rules.minBudget[k], lang)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field" data-invalid={!!errors.budget} tabIndex={errors.budget ? -1 : undefined} aria-describedby={errors.budget ? 'err-budget' : 'help-budget'}>
                <legend className="label">
                  {o.budget} <span className="demo-mark" title={t.concept.demoNote}>{t.concept.demo}</span>
                </legend>
                <div className="pills" role="radiogroup" aria-label={o.budget}>
                  {tiers.map((b) => (
                    <label key={b} className="chip">
                      <input
                        type="radio"
                        name="budget"
                        checked={d.budget === b && !d.budgetOther}
                        onChange={() => {
                          set('budget', b);
                          set('budgetOther', '');
                        }}
                      />
                      <span className="num">{baht(b, lang)}</span>
                    </label>
                  ))}
                  <label className="chip" style={{ paddingRight: 8 }}>
                    <span>{o.budgetOther}</span>
                    <input
                      className="input"
                      style={{ minHeight: 36, width: 120, padding: '4px 10px', position: 'static', opacity: 1, pointerEvents: 'auto' }}
                      inputMode="numeric"
                      aria-label={o.budgetOther}
                      value={d.budgetOther}
                      placeholder={String(minBudget)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                        set('budgetOther', v);
                        set('budget', v ? Number(v) : null);
                      }}
                    />
                  </label>
                </div>
                <p className="field__help" id="help-budget">
                  {o.budgetHelp(baht(minBudget, lang))}
                </p>
                {err('budget')}
              </fieldset>

              {!work && d.kind === 'bouquet' && (
                <div className="field">
                  <p className="label">{o.pickWork}</p>
                  <div className="workrail">
                    {worksNewest
                      .filter((w) => !d.colour || d.colour === 'any' || w.colours.includes(d.colour as never))
                      .map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          set('workId', w.id);
                          if (!d.colour) set('colour', w.colours[0]);
                        }}
                        aria-label={`No. ${w.no} ${w.name[lang]} — ${w.seen[lang]}`}
                      >
                        <Image src={photo(w.id)} alt="" width={96} height={96} sizes="96px" />
                        <span className="num">{String(w.no).padStart(2, '0')}</span>
                      </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 2: colour & details ────────────────────────────── */}
          {step === 1 && (
            <>
              <fieldset className="field">
                <legend className="label">{o.colour}</legend>
                <div className="pills">
                  {[...colourFamilies.map((c) => ({ key: c.key, label: c[lang], swatch: c.swatch })), { key: 'any', label: o.colourAny, swatch: '' }].map((c) => (
                    <label key={c.key} className="chip">
                      <input type="radio" name="colour" checked={d.colour === c.key} onChange={() => set('colour', c.key)} />
                      {c.swatch ? (
                        <span className="note-swatch" style={{ ['--note' as string]: c.swatch }} aria-hidden="true" />
                      ) : (
                        <span className="btn__diamond" aria-hidden="true" />
                      )}
                      {c.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field">
                <legend className="label">{o.occasion}</legend>
                <div className="pills">
                  {OCCASIONS.map((k) => (
                    <label key={k} className="chip">
                      <input type="radio" name="occasion" checked={d.occasion === k} onChange={() => set('occasion', k)} />
                      {(t.occasions as unknown as Record<string, string>)[k]}
                    </label>
                  ))}
                </div>
                {d.occasion === 'other' && (
                  <input
                    className="input"
                    aria-label={o.occasionOther}
                    placeholder={o.occasionOther}
                    value={d.occasionOther}
                    maxLength={60}
                    onChange={(e) => set('occasionOther', e.target.value)}
                  />
                )}
              </fieldset>

              <div className="field">
                <label className="label" htmlFor="flowers">
                  {o.flowers}
                </label>
                <textarea id="flowers" className="textarea" rows={3} maxLength={400} placeholder={o.flowersPh} value={d.flowers} onChange={(e) => set('flowers', e.target.value)} />
              </div>

              <div className="field">
                <p className="label" id="ref-label">
                  {o.reference}
                </p>
                <div className="upload" aria-labelledby="ref-label" aria-busy={uploading}>
                  <div className="upload__preview">
                    {preview || d.uploadThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview ?? d.uploadThumb!} alt={d.uploadName} />
                    ) : (
                      <Tag label={false} />
                    )}
                  </div>
                  <div>
                    <p className="small">{d.uploadName || o.referenceHelp}</p>
                    <div className="upload__actions">
                      <label className="textbtn" style={{ cursor: 'pointer' }}>
                        {d.uploadId ? o.replace : o.upload}
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                          onChange={(e) => {
                            onFile(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {d.uploadId && !uploading && (
                        <button
                          type="button"
                          className="textbtn"
                          onClick={() => {
                            setD({ ...d, uploadId: null, uploadName: '', uploadThumb: null });
                            setPreview(null);
                          }}
                        >
                          {o.remove}
                        </button>
                      )}
                    </div>
                    {uploading && (
                      <>
                        <p className="small" aria-live="polite">
                          {o.uploading}
                        </p>
                        <div className="upload__bar">
                          <i />
                        </div>
                      </>
                    )}
                    {uploadErr && (
                      <p className="field__err" role="alert">
                        {uploadErr}
                      </p>
                    )}
                  </div>
                </div>
                {d.uploadId && <p className="field__help">{o.referenceHelp}</p>}
              </div>
            </>
          )}

          {/* ── Step 3: date & collection ───────────────────────────── */}
          {step === 2 && (
            <>
              <p className="alert alert--info small">
                <span>
                  <span className="demo-mark">{t.concept.demo}</span> {t.concept.demoNote}
                </span>
              </p>
              <div className="field" data-invalid={!!errors.date} tabIndex={errors.date ? -1 : undefined}>
                <p className="label">{o.date}</p>
                <Calendar
                  lang={lang}
                  days={days}
                  loading={loadingDays}
                  selected={d.date}
                  describedBy={errors.date ? 'err-date' : undefined}
                  onMonth={setMonthStart}
                  onPick={(iso) => {
                    set('date', iso);
                    set('windowId', null);
                    if (serverErr) setServerErr(null);
                  }}
                />
                {err('date')}
                {d.date && days[d.date]?.reason && <p className="field__help">{days[d.date]!.reason![lang]}</p>}
              </div>

              <fieldset className="field">
                <legend className="label">{o.method}</legend>
                <div className="choices">
                  {(['delivery', 'pickup'] as const).map((m) => (
                    <label key={m} className="choice">
                      <input type="radio" name="method" checked={d.method === m} onChange={() => set('method', m)} />
                      <span className="choice__mark" aria-hidden="true" />
                      <span className="choice__k" style={{ fontSize: 22 }}>
                        {m === 'delivery' ? o.delivery : o.pickup}
                      </span>
                      <span className="choice__v">{m === 'delivery' ? o.deliveryNote : o.pickupNote}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {d.date && days[d.date] && days[d.date].windows.length > 0 && (
                <fieldset className="field" data-invalid={!!errors.windowId} tabIndex={errors.windowId ? -1 : undefined}>
                  <legend className="label">{o.window}</legend>
                  <div className="windows">
                    {days[d.date].windows.map((w) => (
                      <label key={w.id} className="choice" aria-disabled={w.left <= 0 ? true : undefined}>
                        <input type="radio" name="window" disabled={w.left <= 0} checked={d.windowId === w.id} onChange={() => set('windowId', w.id)} />
                        <span className="choice__mark" aria-hidden="true" />
                        <span className="choice__k num" style={{ fontSize: 22 }}>
                          {w.from}–{w.to}
                        </span>
                        <span className="choice__v">{w.left > 0 ? o.windowLeft(w.left) : o.windowFull}</span>
                      </label>
                    ))}
                  </div>
                  {err('windowId')}
                </fieldset>
              )}
            </>
          )}

          {/* ── Step 4: recipient & you ─────────────────────────────── */}
          {step === 3 && (
            <>
              <fieldset className="field">
                <legend className="label">{o.you}</legend>
                <div className="row2">
                  <div className="field">
                    <label className="small" htmlFor="senderName">
                      {o.yourName}
                    </label>
                    <input id="senderName" className="input" autoComplete="name" value={d.senderName} onChange={(e) => set('senderName', e.target.value)} {...inv('senderName')} />
                    {err('senderName')}
                  </div>
                  <div className="field">
                    <label className="small" htmlFor="senderPhone">
                      {o.yourPhone}
                    </label>
                    <input
                      id="senderPhone"
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="08x xxx xxxx"
                      value={d.senderPhone}
                      onChange={(e) => set('senderPhone', e.target.value)}
                      {...inv('senderPhone')}
                    />
                    {err('senderPhone') ?? <p className="field__help">{o.yourPhoneHelp}</p>}
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="small" htmlFor="email">
                    {o.email}
                  </label>
                  <input id="email" className="input" type="email" inputMode="email" autoComplete="email" value={d.email} onChange={(e) => set('email', e.target.value)} {...inv('email')} />
                  {err('email')}
                </div>
              </fieldset>

              {d.method === 'delivery' ? (
                <fieldset className="field">
                  <legend className="label">{o.recipient}</legend>
                  <label className="chip" style={{ justifySelf: 'start', marginBottom: 16, cursor: 'pointer' }}>
                    <input type="checkbox" className="sr-only" checked={d.sameAsYou} onChange={(e) => set('sameAsYou', e.target.checked)} />
                    <span className="btn__diamond" aria-hidden="true" style={{ opacity: d.sameAsYou ? 1 : 0.25 }} />
                    {o.sameAsYou}
                  </label>
                  {!d.sameAsYou && (
                    <div className="row2">
                      <div className="field">
                        <label className="small" htmlFor="recipientName">
                          {o.recipientName}
                        </label>
                        <input id="recipientName" className="input" value={d.recipientName} onChange={(e) => set('recipientName', e.target.value)} {...inv('recipientName')} />
                        {err('recipientName')}
                      </div>
                      <div className="field">
                        <label className="small" htmlFor="recipientPhone">
                          {o.recipientPhone}
                        </label>
                        <input
                          id="recipientPhone"
                          className="input"
                          type="tel"
                          inputMode="tel"
                          placeholder="08x xxx xxxx"
                          value={d.recipientPhone}
                          onChange={(e) => set('recipientPhone', e.target.value)}
                          {...inv('recipientPhone')}
                        />
                        {err('recipientPhone')}
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label className="small" htmlFor="address">
                      {o.address}
                    </label>
                    <textarea
                      id="address"
                      className="textarea"
                      rows={2}
                      autoComplete="street-address"
                      placeholder={o.addressPh}
                      value={d.address}
                      onChange={(e) => set('address', e.target.value)}
                      {...inv('address')}
                    />
                    {err('address')}
                  </div>
                  <div className="row2">
                    <div className="field">
                      <label className="small" htmlFor="subdistrict">
                        {o.subdistrict}
                      </label>
                      <input id="subdistrict" className="input" value={d.subdistrict} onChange={(e) => set('subdistrict', e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="small" htmlFor="district">
                        {o.district}
                      </label>
                      <input id="district" className="input" value={d.district} onChange={(e) => set('district', e.target.value)} {...inv('district')} />
                      {err('district')}
                    </div>
                    <div className="field">
                      <label className="small" htmlFor="province">
                        {o.province}
                      </label>
                      <input id="province" className="input" autoComplete="address-level1" value={d.province} onChange={(e) => set('province', e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="small" htmlFor="postcode">
                        {o.postcode}
                      </label>
                      <input
                        id="postcode"
                        className="input"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        value={d.postcode}
                        onChange={(e) => set('postcode', e.target.value.replace(/\D/g, ''))}
                        {...inv('postcode')}
                      />
                      {err('postcode')}
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="small" htmlFor="instructions">
                      {o.instructions}
                    </label>
                    <input id="instructions" className="input" maxLength={200} placeholder={o.instructionsPh} value={d.instructions} onChange={(e) => set('instructions', e.target.value)} />
                  </div>
                </fieldset>
              ) : (
                <div className="field">
                  <label className="label" htmlFor="recipientName">
                    {o.recipientName}
                  </label>
                  <input id="recipientName" className="input" value={d.recipientName} onChange={(e) => set('recipientName', e.target.value)} />
                </div>
              )}

              <div className="field">
                <label className="label" htmlFor="card">
                  {o.card}
                </label>
                <textarea
                  id="card"
                  className="textarea"
                  rows={3}
                  maxLength={rules.cardMax}
                  placeholder={o.cardPh}
                  value={d.card}
                  onChange={(e) => set('card', e.target.value)}
                  aria-describedby="card-count"
                />
                <p className="field__help" id="card-count" style={{ textAlign: 'right' }}>
                  {o.cardCount(d.card.length, rules.cardMax)}
                </p>
              </div>
              <div className="field">
                <label className="label" htmlFor="notes">
                  {o.notes}
                </label>
                <textarea id="notes" className="textarea" rows={2} maxLength={400} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </>
          )}

          {/* ── Step 5: review ──────────────────────────────────────── */}
          {step === 4 && (
            <>
              <dl className="review">
                {[
                  { k: t.fields.kind, v: d.kind === 'box' ? o.box : o.bouquet, s: 0 },
                  ...(work ? [{ k: t.fields.work, v: `No. ${String(work.no).padStart(2, '0')} ${work.name[lang]}${d.similar ? ` (${t.works.similar})` : ''}`, s: 0 }] : []),
                  { k: t.fields.budget, v: d.budget ? baht(d.budget, lang) : '—', s: 0 },
                  { k: t.fields.colour, v: colourLabel(d.colour) ?? o.colourAny, s: 1 },
                  ...(d.occasion ? [{ k: t.fields.occasion, v: occasionLabel(d.occasion)!, s: 1 }] : []),
                  ...(d.flowers ? [{ k: t.fields.flowers, v: d.flowers, s: 1 }] : []),
                  ...(d.uploadId ? [{ k: t.fields.reference, v: d.uploadName, s: 1 }] : []),
                  { k: t.fields.date, v: d.date ? `${dateLabel(d.date)} · ${windowLabel(d.windowId) ?? '—'}` : '—', s: 2 },
                  {
                    k: t.fields.method,
                    v:
                      d.method === 'delivery'
                        ? `${o.delivery}\n${d.sameAsYou ? d.senderName : d.recipientName} · ${d.sameAsYou ? d.senderPhone : d.recipientPhone}\n${d.address}\n${[d.subdistrict, d.district, d.province, d.postcode].filter(Boolean).join(' ')}`
                        : `${o.pickup}${d.recipientName ? `\n${d.recipientName}` : ''}`,
                    s: 3,
                  },
                  { k: o.you, v: `${d.senderName} · ${d.senderPhone}${d.email ? `\n${d.email}` : ''}`, s: 3 },
                  ...(d.card ? [{ k: t.fields.card, v: d.card, s: 3 }] : []),
                ].map((r, i) => (
                  <div key={i} className="review__row">
                    <dt>{r.k}</dt>
                    <dd>{r.v}</dd>
                    <button type="button" className="textbtn" onClick={() => goStep(r.s)} aria-label={`${o.edit}: ${r.k}`}>
                      {o.edit}
                    </button>
                  </div>
                ))}
                <div className="review__row">
                  <dt>{o.deliveryFee}</dt>
                  <dd>{d.method === 'delivery' ? o.deliveryFeeTbc : '—'}</dd>
                  <span />
                </div>
              </dl>
              <div className="alert alert--info">
                <p>
                  {STATIC ? (
                    <>
                      <span className="demo-mark">{t.concept.demo}</span> {o.demoPayNote}
                    </>
                  ) : (
                    <>
                      <b>{o.pay}.</b> {o.payNote}
                    </>
                  )}
                </p>
              </div>
            </>
          )}

          <div className="navrow">
            {step > 0 ? (
              <button type="button" className="btn btn--ghost" onClick={() => goStep(step - 1)}>
                {o.back}
              </button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button type="button" className="btn" onClick={next} disabled={uploading}>
                {o.next} <Arrow />
              </button>
            ) : (
              <button type="button" className="btn" onClick={submit} disabled={submitting} aria-busy={submitting}>
                <span className="btn__diamond" aria-hidden="true" />
                {submitting ? o.submitting : o.submit}
              </button>
            )}
          </div>
          {Object.keys(errors).length > 1 && (
            <p className="field__err" role="status" style={{ marginTop: 16 }}>
              {o.fixErrors(Object.keys(errors).length)}
            </p>
          )}
        </div>
      </div>

      {/* The order tag: every choice is written onto it */}
      <aside className="composer__aside" aria-label={o.tag}>
        <div className="ordertag">
          <p className="ordertag__brand" lang="en">
            <b>LOUVRE</b>
            <i>fleuriste</i>
          </p>
          {work && (
            <div className="ordertag__photo photo">
              <Image src={photo(work.id)} alt="" fill sizes="132px" style={{ objectFit: 'cover' }} />
            </div>
          )}
          <p className="label" style={{ color: 'rgba(244,241,236,.62)', textAlign: 'center', marginBottom: 12 }}>
            {o.tag}
          </p>
          {tagRows.length ? (
            <dl>
              {tagRows.map(([k, v]) => (
                <div key={k + v} className="ordertag__row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="ordertag__empty">{o.tagEmpty}</p>
          )}
        </div>
        <p className="small" style={{ marginTop: 20 }}>
          {STATIC ? o.demoPayNote : o.payNote}
        </p>
        <p className="small" style={{ marginTop: 8 }}>
          <Link href={`/${lang}/contact`} className="textbtn">
            {t.nav.visit}
          </Link>
        </p>
      </aside>
    </div>
  );
}

async function shrink(bmp: ImageBitmap, max: number, q: number): Promise<Blob> {
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', q));
}

async function toDataUrl(bmp: ImageBitmap, size: number) {
  const s = size / Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const w = bmp.width * s;
  const h = bmp.height * s;
  c.getContext('2d')!.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
  return c.toDataURL('image/jpeg', 0.7);
}
