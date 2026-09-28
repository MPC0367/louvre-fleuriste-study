import { baht, longDate, type Lang } from '@/content/i18n';
import { adminDict } from '@/content/admin-i18n';
import { shop } from '@/content/shop';
import { rules } from '@/lib/rules';


export default async function Settings({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  const lang = l as Lang;
  const a = adminDict[lang];
  const s = a.set;
  const rows: [string, React.ReactNode, boolean][] = [
    [s.lead, s.leadV(rules.leadDays, rules.cutoffHour), true],
    [s.horizon, s.horizonV(rules.horizonDays), true],
    [s.daily, s.dailyV(rules.dailyCapacity), true],
    [s.windows, rules.windows.map((w) => `${w.from}–${w.to} × ${w.capacity}`).join('  ·  '), true],
    [s.peak, rules.peak.map((p) => `${longDate(p.date, lang)} (${p.capacity})`).join('  ·  '), true],
    [s.blackout, rules.blackout.map((b) => `${longDate(b.date, lang)} — ${b[lang]}`).join('  ·  '), true],
    [`${s.budgets}: ${s.bouquet}`, rules.budgetTiers.bouquet.map((b) => baht(b, lang)).join('  ·  '), true],
    [`${s.budgets}: ${s.box}`, rules.budgetTiers.box.map((b) => baht(b, lang)).join('  ·  '), true],
    [s.fromShop, `${s.bouquet} ${baht(shop.bouquetFrom.value, lang)} · ${s.box} ${baht(shop.boxFrom.value, lang)}`, false],
    [s.card, s.cardV(rules.cardMax), true],
  ];
  return (
    <>
      <header className="adm__head">
        <h1 className="display h-l">{s.title}</h1>
      </header>
      <p className="lede adm-lede">{s.lede}</p>
      <dl className="adm-settings">
        {rows.map(([k, v, demo]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <span>{v}</span>
              {demo ? <span className="demo-mark">{a.demo}</span> : <span className="adm-verified">Instagram ✓</span>}
            </dd>
          </div>
        ))}
      </dl>
      <section className="adm-prod">
        <h2 className="display h-s">{s.production}</h2>
        <ol>
          {s.productionList.map((x, i) => (
            <li key={x}>
              <span className="num">0{i + 1}</span> {x}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
