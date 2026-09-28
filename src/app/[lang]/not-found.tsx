import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap section" style={{ minHeight: '50vh' }}>
      <p className="label">404</p>
      <h1 className="display h-xl" style={{ marginTop: 16 }}>
        Page not found <span className="italic">·</span> <span lang="th">ไม่พบหน้านี้</span>
      </h1>
      <p style={{ marginTop: 32, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Link href="/th" className="btn">หน้าแรก</Link>
        <Link href="/en" className="btn btn--ghost">Home</Link>
      </p>
    </section>
  );
}
