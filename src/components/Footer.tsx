import Link from 'next/link';
import { dict, type Lang } from '@/content/i18n';
import { shop } from '@/content/shop';
import { O2Credit } from './O2Credit';
import { Logo } from './Logo';
import { keepWords } from '@/lib/thai';

export function Footer({ lang }: { lang: Lang }) {
  const t = dict[lang];
  return (
    <footer className="footer on-ink">
      <div className="wrap grid footer__grid">
        <div className="footer__col">
          <Logo className="logo--footer" />
          <p className="small footer__addr">
            {t.footer.shop}
            <br />
            {t.footer.area}
          </p>
        </div>
        <div className="footer__col">
          <p className="label">{t.footer.call}</p>
          {shop.phones.value.map((p) => (
            <a key={p.tel} href={`tel:${p.tel}`}>
              {p.display}
            </a>
          ))}
        </div>
        <div className="footer__col">
          <p className="label">{t.footer.follow}</p>
          <a href={shop.instagram.value} target="_blank" rel="noopener noreferrer" aria-label="Instagram @louvrefleuriste (opens in a new tab)">
            Instagram
          </a>
          <a href={shop.facebook.value} target="_blank" rel="noopener noreferrer" aria-label="Facebook Louvre Fleuriste (opens in a new tab)">
            Facebook
          </a>
          <a href={shop.lineOA.value.url} target="_blank" rel="noopener noreferrer" aria-label="LINE @louvrefleuriste (opens in a new tab)">
            LINE
          </a>
        </div>
        <div className="footer__col">
          <p className="label">Louvre Fleuriste</p>
          <Link href={`/${lang}/works`}>{t.nav.works}</Link>
          <Link href={`/${lang}/order`}>{t.nav.order}</Link>
        </div>
        <div className="footer__legal">
          <span>{keepWords(t.footer.photos)}</span>
          <O2Credit />
        </div>
      </div>
    </footer>
  );
}
