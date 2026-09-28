/* Progressive behaviour that works without React: the hero carousel and the drawn map.
   Used by the site (components/Enhance.tsx) and inlined by the single-file snapshot, so both behave
   the same. Idempotent: calling it again on the same nodes does nothing. */
export function enhance(root) {
  root = root || document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Motion that belongs to the page's entrance waits until the loader has lifted.
  function whenLoaded(fn) {
    if (window.__lfLoaded || !document.querySelector('.loader[data-on="true"]')) fn();
    else window.addEventListener('lf:loaded', fn, { once: true });
  }

  // ── Hero carousel: crossfades real bouquets, pauses on hover/focus, never autoplays for reduced motion.
  root.querySelectorAll('[data-carousel]').forEach(function (c) {
    if (c.__lf) return;
    c.__lf = true;
    var slides = [].slice.call(c.querySelectorAll('[data-slide]'));
    var dots = [].slice.call(c.querySelectorAll('[data-dot]'));
    var caps = [].slice.call(c.querySelectorAll('[data-cap]'));
    var live = c.querySelector('.hero2__caps');
    var toggle = c.querySelector('[data-toggle]');
    var i = 0;
    var timer = null;
    var stopped = false; // the visitor pressed Pause
    var ms = Number(c.getAttribute('data-interval') || 5500);
    // Time left on the current slide. It is banked on pause, so after a hover or focus pause the
    // slide turns exactly when the resumed dot fills.
    var left = ms, since = 0, running = false;
    if (live) live.setAttribute('aria-live', 'polite');
    function arm() {
      clearTimeout(timer);
      since = performance.now();
      timer = setTimeout(function () {
        if (!c.isConnected) return;
        if (document.hidden) { left = ms; arm(); return; }
        // Automatic turns are not announced; a slide the visitor picks is.
        if (live) live.setAttribute('aria-live', 'off');
        show(i + 1);
      }, left);
    }
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var on = k === i;
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-hidden', String(!on));
        s.tabIndex = on ? 0 : -1;
        s.inert = !on;
      });
      caps.forEach(function (s, k) { s.hidden = k !== i; });
      dots.forEach(function (d, k) {
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
        d.classList.remove('is-run');
      });
      if (!reduce && !stopped && dots[i]) { void dots[i].offsetWidth; dots[i].classList.add('is-run'); }
      left = ms;
      if (running) arm();
    }
    function play() {
      if (stopped) return;
      c.classList.remove('is-paused');
      if (reduce || running) return;
      running = true;
      arm();
    }
    function pause() {
      if (running) {
        clearTimeout(timer);
        running = false;
        left = Math.max(0, left - (performance.now() - since));
      }
      c.classList.add('is-paused');
      if (live) live.setAttribute('aria-live', 'polite');
    }
    // A dot click keeps focus on the dot, so the carousel stays paused until focus leaves it.
    dots.forEach(function (d, k) {
      d.addEventListener('click', function () {
        if (live) live.setAttribute('aria-live', 'polite');
        show(k);
        if (!c.contains(document.activeElement) && !c.matches(':hover')) play();
      });
    });
    // Pause / Play: nothing moves for reduced motion, so the control only exists when motion does.
    if (toggle) {
      toggle.hidden = reduce;
      toggle.addEventListener('click', function () {
        stopped = !stopped;
        toggle.textContent = toggle.getAttribute(stopped ? 'data-play' : 'data-pause');
        show(i);
        if (stopped) pause();
        else play();
      });
    }
    c.addEventListener('mouseenter', pause);
    c.addEventListener('mouseleave', play);
    c.addEventListener('focusin', pause);
    c.addEventListener('focusout', play);
    show(0);
    dots.forEach(function (d) { d.classList.remove('is-run'); });
    whenLoaded(function () { if (!c.contains(document.activeElement) && !c.matches(':hover')) { show(i); play(); } });
  });

  // ── Autoscrolling strip: a slow, continuous drift that loops. Pauses on hover, touch and focus,
  //    stays hand-scrollable, stops off-screen, and never moves for reduced motion.
  root.querySelectorAll('[data-autoscroll]').forEach(function (s) {
    if (s.__lf) return;
    s.__lf = true;
    var stoggle = s.id && document.querySelector('[data-autoscroll-toggle][aria-controls="' + s.id + '"]');
    if (stoggle) stoggle.hidden = true;
    var stopped = false;
    if (reduce) return;
    var items = [].slice.call(s.children);
    if (items.length < 2) return;
    // A second copy of the items makes the loop seamless; it is hidden from assistive tech.
    items.forEach(function (el) {
      var c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-clone', '');
      c.querySelectorAll('a, button').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      if (c.matches('a, button')) c.setAttribute('tabindex', '-1');
      s.appendChild(c);
    });
    s.classList.add('is-auto');
    var speed = Number(s.getAttribute('data-autoscroll') || 32); // px per second
    var pos = s.scrollLeft, last = 0, paused = false, visible = true, resumeT = 0;
    var firstClone = s.querySelector('[data-clone]');
    function half() { return firstClone.offsetLeft - items[0].offsetLeft; }
    function pause() { paused = true; clearTimeout(resumeT); s.style.setProperty('--sub', '0px'); }
    function resume(delay) { if (stopped) return; clearTimeout(resumeT); resumeT = setTimeout(function () { pos = s.scrollLeft; paused = false; }, delay || 0); }
    if (stoggle) {
      stoggle.hidden = false;
      stoggle.addEventListener('click', function () {
        stopped = !stopped;
        stoggle.textContent = stoggle.getAttribute(stopped ? 'data-play' : 'data-pause');
        if (stopped) pause();
        else resume(0);
      });
    }
    s.addEventListener('mouseenter', pause);
    s.addEventListener('mouseleave', function () { resume(300); });
    s.addEventListener('focusin', pause);
    s.addEventListener('focusout', function () { resume(600); });
    s.addEventListener('touchstart', pause, { passive: true });
    s.addEventListener('touchend', function () { resume(2500); }, { passive: true });
    s.addEventListener('wheel', function () { pause(); resume(2500); }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(s);
    function tick(t) {
      if (!s.isConnected) return;
      var dt = last ? Math.min(64, t - last) : 0;
      last = t;
      if (!paused && visible && !document.hidden) {
        pos += (speed * dt) / 1000;
        if (pos >= half()) pos -= half();
        // scrollLeft snaps to whole pixels, which reads as a stutter at this speed: scroll by the
        // whole part and slide the items by the remainder, so the drift is continuous.
        var whole = Math.floor(pos);
        s.scrollLeft = whole;
        s.style.setProperty('--sub', (whole - pos).toFixed(3) + 'px');
      } else if (s.scrollLeft >= half()) {
        s.scrollLeft -= half();
        pos = s.scrollLeft;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // ── Works filters on a phone: a row that scrolls sideways opens on its selected chip, so a filtered
  //    page shows what is filtered. Once per row, when it first appears; the row survives filter taps,
  //    so a tap never moves the row under the finger.
  root.querySelectorAll('.gallery__filters .filters').forEach(function (f) {
    if (f.__lf) return;
    f.__lf = true;
    var a = f.querySelector('.chip[aria-current="true"]');
    if (!a || f.scrollWidth <= f.clientWidth) return;
    var fr = f.getBoundingClientRect(), ar = a.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(f).paddingLeft) || 0;
    if (ar.left >= fr.left + pad && ar.right <= fr.right - pad) return;
    f.scrollLeft += ar.left - fr.left - pad;
  });

  // ── Drawn map: drag to pan, pinch or ctrl/⌘ + wheel to zoom, buttons for both.
  root.querySelectorAll('[data-svgmap]').forEach(function (m) {
    if (m.__lf) return;
    m.__lf = true;
    var svg = m.querySelector('svg');
    var W = Number(m.getAttribute('data-w')), H = Number(m.getAttribute('data-h'));
    var home = m.getAttribute('data-view').split(' ').map(Number);
    var v = home.slice();
    var hint = m.querySelector('.svgmap__hint');
    function clamp() {
      v[2] = Math.max(260, Math.min(W, v[2]));
      v[3] = v[2] * (home[3] / home[2]);
      v[0] = Math.max(0, Math.min(W - v[2], v[0]));
      v[1] = Math.max(0, Math.min(H - v[3], v[1]));
    }
    function draw() { clamp(); svg.setAttribute('viewBox', v.join(' ')); m.style.setProperty('--z', String(home[2] / v[2])); }
    function zoom(f, cx, cy) {
      var r = svg.getBoundingClientRect();
      var px = cx == null ? 0.5 : (cx - r.left) / r.width, py = cy == null ? 0.5 : (cy - r.top) / r.height;
      var nw = v[2] / f;
      v[0] += (v[2] - nw) * px; v[1] += (v[3] - nw * (home[3] / home[2])) * py; v[2] = nw;
      draw();
    }
    var pts = new Map(), last = null, pinch = null;
    svg.addEventListener('pointerdown', function (e) { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); m.classList.add('is-drag'); });
    svg.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      var r = svg.getBoundingClientRect();
      var prev = pts.get(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) {
        v[0] -= (e.clientX - prev[0]) * (v[2] / r.width);
        v[1] -= (e.clientY - prev[1]) * (v[3] / r.height);
        draw();
      } else if (pts.size === 2) {
        var p = [].slice.call(pts.values());
        var d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
        if (pinch) zoom(d / pinch, (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
        pinch = d;
      }
    });
    function up(e) { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) m.classList.remove('is-drag'); }
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) {
        if (hint) { hint.classList.add('is-on'); clearTimeout(last); last = setTimeout(function () { hint.classList.remove('is-on'); }, 1200); }
        return;
      }
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });
    m.querySelectorAll('[data-zoom]').forEach(function (b) {
      b.addEventListener('click', function () {
        var z = b.getAttribute('data-zoom');
        if (z === 'reset') { v = home.slice(); draw(); } else zoom(z === 'in' ? 1.4 : 1 / 1.4);
      });
    });
    draw();
  });
}
