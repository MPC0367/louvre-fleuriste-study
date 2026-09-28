import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { keepWords } from '@/lib/thai';
import { getWork } from '@/content/works';
import { Photo } from '@/components/Photo';
import { Arrow } from '@/components/Icons';
import { MapBlock } from '@/components/MapBlock';
import { ShopFront } from '@/components/ShopFront';
import { more } from '@/content/i18n-more';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict[lang].visit.title, alternates: { canonical: `/${lang}/contact` } } : {};
}

export default async function Contact({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang = l as Lang;
  const t = dict[lang];
  const w = getWork('DbIKVRSgVKW')!;
  return (
    <>
      <section className="pagehead wrap">
        <div className="grid pagehead__grid">
          <h1 className="pagehead__title display h-xl">{t.visit.title}</h1>
          <p className="pagehead__lede lede">{t.visit.lede}</p>
        </div>
      </section>
      <section className="wrap" style={{ paddingBottom: 'clamp(96px, 12vw, 184px)' }}>
        <div className="grid contact__grid">
          <dl className="contact__list">
            <div className="contact__row">
              <dt className="label">{t.visit.phones}</dt>
              <dd>
                {shop.phones.value.map((p) => (
                  <a key={p.tel} href={`tel:${p.tel}`} className="contact__big">
                    {p.display}
                  </a>
                ))}
              </dd>
            </div>
            <div className="contact__row">
              <dt className="label">{more[lang].visit.listing}</dt>
              <dd>
                <span className="contact__big contact__big--s">{keepWords(shop.googleListing.value.address[lang])}</span>
                <span className="small">
                  <span className="demo-mark">{lang === 'th' ? 'รอยืนยัน' : 'To confirm'}</span> {more[lang].visit.confirm}
                </span>
              </dd>
            </div>
            <div className="contact__row">
              <dt className="label">LINE</dt>
              <dd>
                <a href={shop.lineOA.value.url} target="_blank" rel="noopener noreferrer" className="contact__big" lang="en">
                  {shop.lineOA.value.id}
                </a>
              </dd>
            </div>
            <div className="contact__row">
              <dt className="label">{t.visit.area}</dt>
              <dd>
                <span className="contact__big">
                  {shop.area.value[lang]}, {shop.city.value[lang]}
                </span>
              </dd>
            </div>
            <div className="contact__row">
              <dt className="label">{t.visit.social}</dt>
              <dd>
                <a href={shop.instagram.value} target="_blank" rel="noopener noreferrer" className="contact__big" lang="en">
                  Instagram
                </a>
                <a href={shop.facebook.value} target="_blank" rel="noopener noreferrer" className="contact__big" lang="en">
                  Facebook
                </a>
              </dd>
            </div>
            <div className="contact__row">
              <dt className="label">{t.nav.order}</dt>
              <dd>
                <Link href={`/${lang}/order`} className="link" style={{ justifySelf: 'start' }}>
                  {t.visit.orderHere} <Arrow />
                </Link>
              </dd>
            </div>
          </dl>
          <aside className="contact__side">
            <ShopFront lang={lang} />
            <Photo work={w} lang={lang} sizes="(max-width: 1023px) min(92vw, 720px), (max-width: 1439px) 37vw, 530px" ar="4 / 5" className="lift" />
          </aside>
        </div>
        <div className="contact__map">
          <MapBlock lang={lang} />
        </div>
      </section>
    </>
  );
}
