import Link from 'next/link';
import { baht, dict, isLang, longDate, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { colourFamilies, getWork, igNewest, works } from '@/content/works';
import { Photo } from '@/components/Photo';
import { Tag } from '@/components/Tag';
import { WorkCard } from '@/components/WorkCard';
import { Arrow, Phone } from '@/components/Icons';
import { LogoMark } from '@/components/Logo';
import { MapBlock } from '@/components/MapBlock';
import { ShopFront } from '@/components/ShopFront';
import { Lifestyle } from '@/components/Lifestyle';
import { more } from '@/content/i18n-more';
import { todayBangkok } from '@/lib/rules';
import { YearSection, type Occasion } from '@/components/YearSection';
import { keepWords } from '@/lib/thai';
import { notFound } from 'next/navigation';

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang = l as Lang;
  const t = dict[lang];
  const m = more[lang];
  const peonies = getWork('DZogaHrAYa5')!;
  const tulips = getWork('Db7cIc-jgC7')!;
  // Each photograph appears as few times as possible: the occasion photos stay in section 05, the
  // hero takes the four newest of the rest and the register the next six. The strip mirrors the feed.
  const pool = igNewest.filter((w) => w.id !== peonies.id && w.id !== tulips.id);
  const heroWorks = pool.slice(0, 4);
  const register = pool.slice(4, 10);
  const hydrangea = heroWorks.find((w) => w.id === 'Dcc0QsXgRFW') ?? heroWorks[1];
  // Both are the studio's enhanced full-resolution photos (documents/facebook-gallery-2026-09-28/enhanced). Grid saves still at
  // ~720px (w.lowres) must stay in small frames; don't put one here.
  const boxWork = getWork('x-grid-9-04-box');
  const xmasWork = getWork('x-grid-8-02-christmas-box') ?? null;
  const occasions: Occasion[] = [
    { key: 'valentines' as const, month: 2, day: 14, col: '1 / span 4', work: peonies, img: null, when: lang === 'th' ? '14 กุมภาพันธ์' : '14 February' },
    { key: 'mothers-day' as const, month: 8, day: 12, col: '5 / span 4', work: tulips, img: null, when: lang === 'th' ? '12 สิงหาคม' : '12 August' },
    { key: 'christmas' as const, month: 12, day: 25, col: '9 / span 4', work: xmasWork, img: null, when: lang === 'th' ? '25 ธันวาคม' : '25 December' },
  ];
  const how = t.how.steps.map((s, i) =>
    i === 1
      ? {
          k: s.k,
          v:
            lang === 'th'
              ? `ช่อเริ่มต้น ${baht(shop.bouquetFrom.value, lang)} กล่องเริ่มต้น ${baht(shop.boxFrom.value, lang)}`
              : `Bouquets from ${baht(shop.bouquetFrom.value, lang)}, boxes from ${baht(shop.boxFrom.value, lang)}.`,
        }
      : s,
  );

  return (
    <>
      {/* ── 01 Opening: the shop's navy, the latest bouquets on the curtain ── */}
      <section className="hero2" aria-labelledby="hero-title">
        <LogoMark className="hero2__lattice" />
        <div className="wrap grid hero2__grid">
          <div className="hero2__copy">
            <p className="hero__kicker label rise">{t.hero.kicker}</p>
            <h1 id="hero-title" className="hero2__title display">
              <span className="rise" style={{ ['--i' as string]: 1 }}>{t.hero.title[0]}</span>
              <span className="rise" style={{ ['--i' as string]: 2 }}>
                <em>{t.hero.title[1]}</em>
              </span>
            </h1>
            <p className="hero2__lede rise" style={{ ['--i' as string]: 3 }}>{t.hero.lede}</p>
            <div className="prices prices--light rise" style={{ ['--i' as string]: 4 }}>
              <p className="price">
                <span className="label">{t.hero.bouquet}</span>
                <span className="price__v num">
                  <small>{t.hero.from}</small>
                  {baht(shop.bouquetFrom.value, lang)}
                </span>
              </p>
              <p className="price">
                <span className="label">{t.hero.box}</span>
                <span className="price__v num">
                  <small>{t.hero.from}</small>
                  {baht(shop.boxFrom.value, lang)}
                </span>
              </p>
            </div>
            <div className="hero__ctas rise" style={{ ['--i' as string]: 5 }}>
              <Link href={`/${lang}/order`} className="btn btn--light">
                <span className="btn__diamond" aria-hidden="true" />
                {t.hero.order}
              </Link>
              <Link href={`/${lang}/works`} className="link hero2__link">
                {t.hero.browse} <Arrow />
              </Link>
            </div>
          </div>
          <div className="hero2__stage rise" role="region" style={{ ['--i' as string]: 2 }} data-carousel data-interval="5500" aria-roledescription="carousel" aria-label={m.hero.showing}>
            <div className="hero2__frame curtain">
              {heroWorks.map((w, i) => (
                <Link key={w.id} href={`/${lang}/works/${w.id}`} className={`hero2__slide${i === 0 ? ' is-on' : ''}`} data-slide aria-hidden={i !== 0} tabIndex={i === 0 ? 0 : -1} aria-label={`No. ${w.no} ${w.name[lang]}`}>
                  <Photo work={w} lang={lang} sizes="(max-width: 639px) 80vw, (max-width: 1023px) 496px, (max-width: 1439px) 36vw, 520px" priority={i === 0} ar="1 / 1" />
                </Link>
              ))}
              <Tag className="hero2__tag" />
            </div>
            <div className="hero2__meta">
              <div className="hero2__caps" aria-live="polite">
                {heroWorks.map((w, i) => (
                  <p key={w.id} data-cap hidden={i !== 0}>
                    <span className="num">No. {String(w.no).padStart(2, '0')}</span> {w.name[lang]} · <time dateTime={w.date}>{longDate(w.date, lang)}</time>
                  </p>
                ))}
              </div>
              <div className="hero2__dots">
                {heroWorks.map((w, i) => (
                  <button key={w.id} type="button" data-dot aria-current={i === 0 ? 'true' : 'false'} aria-label={m.hero.show(w.no)}>
                    <i />
                  </button>
                ))}
                <button type="button" className="hero2__toggle label" data-toggle data-pause={m.hero.pause} data-play={m.hero.play} hidden>
                  {m.hero.pause}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 02 The register ───────────────────────────────────────────── */}
      <section className="section wrap" aria-labelledby="reg-title">
        <div className="head">
          <p className="head__kicker label reveal">
            <span className="num">02</span> {t.sittings.kicker}
          </p>
          <div className="head__row">
            <h2 id="reg-title" className="display h-l reveal" style={{ maxWidth: '12em' }}>
              {t.sittings.title}
            </h2>
            <p className="lede reveal" style={{ maxWidth: '30em' }}>
              {t.sittings.body}
            </p>
          </div>
        </div>
        <div className="register">
          {register.map((w, i) => (
            <WorkCard key={w.id} work={w} lang={lang} i={i} sizes={i % 3 === 0 ? '(max-width: 639px) 92vw, (max-width: 1023px) 60vw, (max-width: 1439px) 37vw, 540px' : '(max-width: 639px) 46vw, (max-width: 1023px) 60vw, (max-width: 1439px) 37vw, 540px'} />
          ))}
        </div>
        <div className="center reveal" style={{ marginTop: 'clamp(56px, 7vw, 104px)' }}>
          <Link href={`/${lang}/works`} className="btn btn--ghost">
            {lang === 'th' ? `ดูทั้งหมด ${works.length} ชิ้น` : `See all ${works.length}`} <Arrow />
          </Link>
        </div>
      </section>

      <Lifestyle lang={lang} />

      {/* ── 03 Colour · variety · number — in the shop's words ────────── */}
      <section className="section choose" aria-labelledby="choose-title">
        <div className="wrap grid">
          <div className="quote">
            <p className="label reveal" id="choose-title">
              <span className="num">03</span>&nbsp; {t.choose.kicker}
            </p>
            <blockquote className="reveal" style={{ marginTop: 28 }} lang="en" cite={`${shop.instagram.value}p/DX85V6FgVzg/`}>
              <p className="quote__text">{t.choose.quote}</p>
            </blockquote>
            <p className="quote__by small reveal">
              <span className="btn__diamond" aria-hidden="true" /> @louvrefleuriste · {t.choose.quoteNote}
            </p>
            <p className="lede reveal" style={{ marginTop: 32 }}>
              {t.choose.body}
            </p>
          </div>
          <ol className="threes">
            {t.choose.steps.map((s, i) => (
              <li key={s.k} className="three reveal" style={{ ['--i' as string]: i }}>
                <p className="three__k">
                  <span className="num">0{i + 1}</span>
                  {s.k}
                </p>
                <p className="three__v">{keepWords(s.v)}</p>
              </li>
            ))}
          </ol>
          <div className="swatches reveal">
            <p className="label" style={{ marginRight: 8 }}>
              {t.works.filter}
            </p>
            {colourFamilies.map((c) => (
              <Link key={c.key} href={`/${lang}/works?colour=${c.key}`} className="swatch-link">
                <span className="note-swatch" style={{ ['--note' as string]: c.swatch }} aria-hidden="true" />
                {c[lang]}
              </Link>
            ))}
            <Link href={`/${lang}/order`} className="link" style={{ marginLeft: 'auto' }}>
              {t.choose.cta} <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 04 The two lines ──────────────────────────────────────────── */}
      <section className="section wrap" aria-labelledby="lines-title">
        <div className="head">
          <p className="head__kicker label reveal">
            <span className="num">04</span> {t.lines.kicker}
          </p>
          <h2 id="lines-title" className="display h-l reveal" style={{ maxWidth: '14em' }}>
            {t.lines.title}
          </h2>
        </div>
        <div className="grid lines">
          <article className="line line--bouquet">
            <Link href={`/${lang}/works/${hydrangea.id}`} className="line__media curtain lift" aria-label={hydrangea.name[lang]}>
              <Photo work={hydrangea} lang={lang} sizes="(max-width: 639px) 70vw, 480px" ar="1 / 1" className="line__photo" />
              <Tag className="line__tag" />
            </Link>
            <div className="line__row reveal">
              <div>
                <h3 className="display h-m">{t.lines.bouquet.name}</h3>
                <p className="small">{t.lines.bouquet.note}</p>
              </div>
              <p className="line__from num">
                <small>{t.hero.from}</small>
                {baht(shop.bouquetFrom.value, lang)}
              </p>
            </div>
            <Link href={`/${lang}/order?kind=bouquet`} className="link reveal">
              {t.lines.bouquet.cta} <Arrow />
            </Link>
          </article>
          <article className="line line--box">
            {boxWork ? (
              <Link href={`/${lang}/works?kind=box`} className="line__media curtain lift" aria-label={t.lines.box.name}>
                <Photo work={boxWork} lang={lang} sizes="(max-width: 639px) 76vw, (max-width: 1023px) 46vw, 320px" ar="1 / 1" className={boxWork.lowres ? 'line__photo photo--lowres' : 'line__photo'} />
              </Link>
            ) : (
              <div className="line__media plate lift" role="img" aria-label={t.lines.box.pending}>
                <div>
                  <p className="plate__name">Classic Box</p>
                  <p className="plate__note">{t.lines.box.pending}</p>
                </div>
              </div>
            )}
            <div className="line__row reveal">
              <div>
                <h3 className="display h-m">{t.lines.box.name}</h3>
                <p className="small">{t.lines.box.note}</p>
              </div>
              <p className="line__from num">
                <small>{t.hero.from}</small>
                {baht(shop.boxFrom.value, lang)}
              </p>
            </div>
            <Link href={`/${lang}/order?kind=box`} className="link reveal">
              {t.lines.box.cta} <Arrow />
            </Link>
          </article>
        </div>
      </section>

      {/* ── 05 A florist's year: a live twelve-month rail (dates worked out in the browser) ── */}
      <YearSection lang={lang} occasions={occasions} builtOn={todayBangkok()} />

      {/* ── 06 From the shop's Instagram ──────────────────────────────── */}
      <section className="section" aria-labelledby="feed-title">
        <div className="wrap head">
          <p className="head__kicker label reveal">
            <span className="num">06</span> {t.feed.kicker}
          </p>
          <div className="head__row">
            <h2 id="feed-title" className="display h-l reveal" lang="en">
              {t.feed.title}
            </h2>
            <div className="head__actions reveal">
              <Link href={`/${lang}/instagram`} className="link">
                {t.feed.explore} <Arrow />
              </Link>
              <button type="button" className="strip__toggle label" data-autoscroll-toggle aria-controls="feed-strip" data-pause={m.hero.pause} data-play={m.hero.play} hidden>
                {m.hero.pause}
              </button>
            </div>
          </div>
        </div>
        <ul className="strip" id="feed-strip" data-autoscroll="34">
          {igNewest.map((w) => (
            <li key={w.id}>
              <Link href={`/${lang}/instagram?post=${w.id}`} className="strip__item">
              <Photo work={w} lang={lang} sizes="(max-width: 909px) 250px, (max-width: 1454px) 28vw, 400px" ar="4 / 5" />
              <span className="strip__cap">
                <span>{w.name[lang]}</span>
                <time dateTime={w.date}>{longDate(w.date, lang)}</time>
              </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 07 How ordering works ─────────────────────────────────────── */}
      <section className="section--tight wrap" aria-labelledby="how-title">
        <div className="head">
          <p className="head__kicker label reveal">
            <span className="num">07</span> {t.how.kicker}
          </p>
          <h2 id="how-title" className="display h-l reveal">
            {t.how.title}
          </h2>
        </div>
        <ol className="how">
          {how.map((s, i) => (
            <li key={s.k} className="reveal" style={{ ['--i' as string]: i }}>
              <span className="num muted">0{i + 1}</span>
              <p className="how__k">{s.k}</p>
              <p className="small">{s.v}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 08 The studio: shop front, address, map ── */}
      <section className="visit" aria-labelledby="visit-title">
        <div className="wrap">
          <div className="head">
            <p className="head__kicker label reveal">
              <span className="num">08</span> {m.visit.kicker}
            </p>
            <h2 id="visit-title" className="display h-l reveal" style={{ maxWidth: '14em' }}>
              {m.visit.title}
            </h2>
          </div>
          <div className="grid visit__grid">
            <div className="visit__info reveal">
              <p className="label">{m.visit.listing}</p>
              <p className="visit__addr">{keepWords(shop.googleListing.value.address[lang])}</p>
              <p className="visit__confirm small">
                <span className="demo-mark">{lang === 'th' ? 'รอยืนยัน' : 'To confirm'}</span> {m.visit.confirm}
              </p>
              <dl className="visit__dl">
                <div>
                  <dt className="label">{m.visit.phones}</dt>
                  <dd>
                    {shop.phones.value.map((p) => (
                      <a key={p.tel} href={`tel:${p.tel}`}>
                        {p.display}
                      </a>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="label">{m.visit.line}</dt>
                  <dd>
                    <a href={shop.lineOA.value.url} target="_blank" rel="noopener noreferrer">
                      {shop.lineOA.value.id}
                    </a>
                  </dd>
                </div>
              </dl>
              <ShopFront lang={lang} />
            </div>
            <div className="visit__map reveal" style={{ ['--i' as string]: 1 }}>
              <MapBlock lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 08 Close ──────────────────────────────────────────────────── */}
      <section className="close on-ink" aria-labelledby="close-title">
        <Tag className="close__tag" />
        <div className="wrap">
          <h2 id="close-title" className="close__title display h-xl">
            <span className="reveal">{t.close.title}</span>
            <span className="reveal" style={{ ['--i' as string]: 1 }}>
              {t.close.title2}
            </span>
          </h2>
          <div className="close__row reveal" style={{ ['--i' as string]: 2 }}>
            <Link href={`/${lang}/order`} className="btn btn--light">
              <span className="btn__diamond" aria-hidden="true" />
              {t.close.cta}
            </Link>
            <div className="close__phones">
              {shop.phones.value.map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`} aria-label={`${t.close.call} ${p.display}`}>
                  <Phone />
                  &nbsp;{p.display}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
