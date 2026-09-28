import Link from 'next/link';
import { longDate, type Lang, dict } from '@/content/i18n';
import type { Work } from '@/content/works';
import { Photo } from './Photo';
import { Tag } from './Tag';
import { Arrow } from './Icons';
import { keepWords } from '@/lib/thai';

export function WorkCard({ work, lang, i = 0, sizes }: { work: Work; lang: Lang; i?: number; sizes?: string }) {
  const t = dict[lang];
  return (
    <article className="work reveal" style={{ ['--i' as string]: i % 3 }}>
      <Link href={`/${lang}/works/${work.id}`} className="work__frame" aria-label={`${t.works.view}: ${t.works.no} ${work.no} — ${work.name[lang]}${work.seen[lang] ? `. ${work.seen[lang]}` : ''}`}>
        <Photo work={work} lang={lang} sizes={sizes ?? '(max-width: 639px) 92vw, (max-width: 1023px) 60vw, 38vw'} />
        <Tag className="work__tag" swing />
        <span className="work__order" aria-hidden="true">
          <span>{t.works.view}</span>
          <Arrow />
        </span>
      </Link>
      <div className="work__meta">
        <span className="work__no num" aria-hidden="true">
          {String(work.no).padStart(2, '0')}
        </span>
        <p className="work__name">
          {work.name[lang]}
          <span className="work__seen">{keepWords(work.seen[lang])}</span>
        </p>
        {work.date && (
          <time className="work__date" dateTime={work.date}>
            <span className="note-swatch" style={{ ['--note' as string]: work.note }} aria-hidden="true" /> {longDate(work.date, lang)}
          </time>
        )}
      </div>
    </article>
  );
}
