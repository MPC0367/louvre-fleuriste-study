/* Snapshot runtime (scripts/snapshot.mjs). Routes between captured pages by #path, fills photographs,
   and re-creates the few interactions React handled: the mobile menu, header state, reveals, the
   Instagram lightbox steps and the order steps. Anything that would act on the world shows a note. */
(async () => {
  const cfg = JSON.parse(document.getElementById('lf-cfg').textContent);
  document.documentElement.classList.add(...cfg.htmlClass.split(/\s+/).filter(Boolean), 'js');
  const loader = document.getElementById('lf-loader');
  const LOADER_MS = 650;
  const showLoader = () => {
    window.__lfLoaded = false;
    if (!loader) return;
    // A fresh copy of the mark and wordmark restarts their drawing, as the site's remount does.
    const inner = loader.querySelector('.loader__in');
    if (inner) inner.replaceWith(inner.cloneNode(true));
    loader.dataset.on = 'true';
  };
  // Entrance motion (reveals, the hero carousel) waits for this, as it does on the site.
  const hideLoader = () => {
    if (loader) loader.dataset.on = 'false';
    window.__lfLoaded = true;
    window.dispatchEvent(new Event('lf:loaded'));
  };
  const imgs = JSON.parse(document.getElementById('lf-img').textContent);
  const app = document.getElementById('lf-app');
  const toastEl = document.querySelector('.lf-toast');
  const b64 = document.getElementById('lf-pages').textContent.trim();
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const pages = JSON.parse(await new Response(stream).text());
  setTimeout(hideLoader, 700);

  let current = null;
  let lang = 'th';
  let io = null;
  let toastTimer = 0;

  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
  };
  const ui = () => cfg.ui[lang] || cfg.ui.th;
  const pathOf = (k) => k.split('?')[0];
  const params = (k) => new URLSearchParams(k.split('?')[1] || '');

  function resolve(key) {
    if (pages[key]) return key;
    const l = (key.match(/^\/(th|en)/) || [])[1];
    if (!l) return null;
    const p = pathOf(key);
    if (p === `/${l}/order`) return params(key).get('work') ? `/${l}/order?work=${cfg.flowWork}` : `/${l}/order`; // one worked example
    if (p.startsWith(`/${l}/admin`) && pages[p]) return p;
    if (p === `/${l}/works`) {
      // Combined filters weren't captured one by one: fall back to the first single filter.
      for (const [k, v] of params(key)) if (pages[`${p}?${k}=${v}`]) return `${p}?${k}=${v}`;
      return p;
    }
    return null;
  }

  function go(key, { replace = false } = {}) {
    const k = resolve(key);
    if (!k) return toast(ui().missing);
    if (pathOf(key) === `/${lang}/order` && key !== k && params(key).get('work')) setTimeout(() => toast(ui().order), 50);
    if (replace) history.replaceState(null, '', '#' + k);
    else if (location.hash.slice(1) !== k) history.pushState(null, '', '#' + k);
    // A new page gets the loader; a filter, step or lightbox on the same page does not.
    if (current && pathOf(current) !== pathOf(k) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showLoader();
      setTimeout(() => render(k), 260);
      setTimeout(hideLoader, LOADER_MS);
    } else render(k);
  }

  function render(key) {
    const p = pages[key];
    const samePath = current && pathOf(current) === pathOf(key);
    const y = window.scrollY;
    current = key;
    lang = p.lang;
    document.documentElement.lang = p.lang;
    document.title = p.title;
    app.innerHTML = p.html;
    const inAdmin = /^\/(th|en)\/admin/.test(key);
    document.querySelectorAll('[data-lf-switch]').forEach((a) => {
      const admin = a.dataset.lfSwitch === 'admin';
      a.setAttribute('aria-current', String(admin === inAdmin));
      a.setAttribute('href', `#/${lang}${admin ? '/admin' : ''}`);
      a.textContent = admin ? (lang === 'th' ? 'หลังร้าน' : 'Back office') : lang === 'th' ? 'หน้าเว็บ' : 'Website';
    });
    app.querySelectorAll('[data-lf-img]').forEach((img) => {
      const src = imgs[img.getAttribute('data-lf-img')];
      if (src) img.src = src;
    });
    const dlg = app.querySelector('dialog[open]');
    document.body.style.overflow = dlg ? 'hidden' : '';
    document.body.classList.toggle('lf-modal', !!dlg || (!!app.querySelector('.adm-drawer') && innerWidth < 900));
    window.scrollTo(0, samePath ? y : 0);
    wire();
    enhance(app);
  }

  function wire() {
    // Reveals
    io?.disconnect();
    io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('is-in'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const obs = io;
    const start = () => obs === io && app.querySelectorAll('.reveal:not(.is-in), .lift:not(.is-in)').forEach((e) => io.observe(e));
    if (loader?.dataset.on === 'true') window.addEventListener('lf:loaded', start, { once: true });
    else start();
    onScroll();
  }

  const onScroll = () => {
    const h = app.querySelector('.header');
    if (h) h.dataset.scrolled = String(window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    const sheet = app.querySelector('#sheet');
    const btn = app.querySelector('.menu-btn');
    if (!sheet || !btn) return;
    sheet.dataset.open = String(open);
    sheet.toggleAttribute('inert', !open);
    sheet.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function step(dir) {
    const p = params(current);
    const post = p.get('post');
    const i = cfg.works.indexOf(post);
    const n = cfg.works[(i + dir + cfg.works.length) % cfg.works.length];
    go(`/${lang}/instagram?post=${n}`, { replace: true });
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('a, button, label, input');
    if (!t) return;
    if (t.matches('a[href^="tel:"]')) {
      e.preventDefault();
      return toast(ui().call);
    }
    if (t.matches('a[href^="#/api/"]')) {
      e.preventDefault();
      return toast(t.getAttribute('href').includes('export') ? ui().export : ui().missing);
    }
    if (t.matches('a[href^="#/"]')) {
      e.preventDefault();
      setMenu(false);
      return go(t.getAttribute('href').slice(1));
    }
    if (t.matches('a[href="#main"]')) return;
    if (t.matches('.menu-btn')) return setMenu(t.getAttribute('aria-expanded') !== 'true');
    if (t.matches('.post[data-post]')) return go(`/${lang}/instagram?post=${t.dataset.post}`);
    if (t.matches('.lightbox__nav--next')) return step(1);
    if (t.matches('.lightbox__nav--prev')) return step(-1);
    if (t.matches('.lightbox__close')) return go(`/${lang}/instagram`, { replace: true });
    if (t.matches('.cal__day, .cal__nav')) return toast(ui().date);
    if (t.matches('.adm-pill, .adm-block, .adm-btn-s:not(a)') || t.closest('.adm-actions')) {
      if (t.matches('textarea')) return;
      return toast(ui().save);
    }
    if (t.matches('input[type="file"]') || t.querySelector?.('input[type="file"]')) {
      e.preventDefault();
      return toast(ui().upload);
    }
    // Order steps
    if (t.matches('.navrow button')) {
      const p = params(current);
      const s = Number(p.get('step') || 0);
      const isBack = t.classList.contains('btn--ghost');
      if (!p.get('work')) return go(`/${lang}/order?work=${cfg.flowWork}${isBack ? '' : '&step=1'}`);
      if (isBack) return go(s <= 1 ? `/${lang}/order?work=${cfg.flowWork}` : `/${lang}/order?work=${cfg.flowWork}&step=${s - 1}`);
      if (s >= 4) return go(`/${lang}/order/confirmation`);
      return go(`/${lang}/order?work=${cfg.flowWork}&step=${s + 1}`);
    }
    if (t.matches('.review__row .textbtn')) return toast(ui().save);
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    toast(ui().missing);
  });
  document.addEventListener('keydown', (e) => {
    if (!app.querySelector('dialog[open]')) {
      if (e.key === 'Escape') setMenu(false);
      return;
    }
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'Escape') go(`/${lang}/instagram`, { replace: true });
  });
  window.addEventListener('popstate', () => {
    const k = resolve(location.hash.slice(1));
    if (k) render(k);
  });

  const start = resolve(location.hash.slice(1)) || cfg.home;
  history.replaceState(null, '', '#' + start);
  render(start);
})();
