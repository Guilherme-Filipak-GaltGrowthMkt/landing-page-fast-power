(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // --------------------------------------------------------------- reveal
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  revealEls.forEach((el) => {
    const siblings = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal')) : [];
    el.style.setProperty('--stagger', siblings.indexOf(el));
  });
  const reveal = (el) => el.classList.add('is-visible');

  if (!window.IntersectionObserver || reduceMotion) {
    revealEls.forEach(reveal);
    document.documentElement.classList.remove('js-reveal');
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
    setTimeout(() => {
      revealEls.forEach(reveal);
      document.documentElement.classList.remove('js-reveal');
    }, 2500);
  }

  // ------------------------------------------------------------- contadores
  const counters = Array.from(document.querySelectorAll('.count'));
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (document.documentElement.classList.contains('nomotion')) {
    counters.forEach((el) => { el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || ''); });
  } else if (counters.length && window.IntersectionObserver && !reduceMotion) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  // ------------------------------------------- luz nos cards de vidro
  // A luz arrasta atrás do cursor (inércia), como no Hero. Sem cursor fino,
  // ela responde à posição do card na tela: desce conforme o card sobe.
  const lit = Array.from(document.querySelectorAll('[data-light]'));
  const state = lit.map((el) => ({ el, x: 50, y: 0, tx: 50, ty: 0, hot: false }));
  let rafId = null;

  function loop() {
    let moving = false;
    for (const s of state) {
      s.x += (s.tx - s.x) * 0.09;
      s.y += (s.ty - s.y) * 0.09;
      if (Math.abs(s.tx - s.x) > 0.05 || Math.abs(s.ty - s.y) > 0.05) moving = true;
      s.el.style.setProperty('--lx', s.x.toFixed(2) + '%');
      s.el.style.setProperty('--ly', s.y.toFixed(2) + '%');
    }
    rafId = moving ? requestAnimationFrame(loop) : null;
  }
  const wake = () => { if (rafId === null) rafId = requestAnimationFrame(loop); };

  if (!reduceMotion) {
    if (finePointer) {
      state.forEach((s) => {
        s.el.addEventListener('pointermove', (e) => {
          const r = s.el.getBoundingClientRect();
          s.tx = ((e.clientX - r.left) / r.width) * 100;
          s.ty = ((e.clientY - r.top) / r.height) * 100;
          wake();
        }, { passive: true });
        s.el.addEventListener('pointerleave', () => {
          s.tx = 50; s.ty = -10; wake();
        });
      });
    } else {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const vh = window.innerHeight;
          for (const s of state) {
            const r = s.el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) continue;
            const progress = 1 - (r.top + r.height / 2) / vh;  // 0 embaixo → 1 em cima
            s.tx = 30 + progress * 40;
            s.ty = progress * 100;
            s.el.style.setProperty('--light-on', '1');
          }
          wake();
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  // ------------------------------------------- indicador do trilho de etapas
  const steps = document.querySelector('.steps');
  const dots = document.querySelector('.steps__dots');
  if (steps && dots) {
    const cards = Array.from(steps.children);
    cards.forEach(() => dots.appendChild(document.createElement('span')));
    const sync = () => {
      const cardW = cards[0].getBoundingClientRect().width + 14;
      const i = Math.min(cards.length - 1, Math.round(steps.scrollLeft / cardW));
      Array.from(dots.children).forEach((d, k) => d.classList.toggle('is-active', k === i));
    };
    steps.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  // ------------------------------------------------- marquee orgânico
  // Velocidade base com deriva por senoides incomensuráveis: acelera e
  // desacelera de leve, nunca no compasso. Pausa suave com o cursor em cima.
  const marquee = document.querySelector('.marquee');
  const tracks = marquee ? Array.from(marquee.querySelectorAll('.marquee__track')) : [];
  if (tracks.length && !reduceMotion) {
    let x = 0;
    let speedScale = 1;
    let hover = false;
    let last = performance.now();
    let width = tracks[0].getBoundingClientRect().width;
    window.addEventListener('resize', () => { width = tracks[0].getBoundingClientRect().width; });
    marquee.addEventListener('pointerenter', () => { hover = true; });
    marquee.addEventListener('pointerleave', () => { hover = false; });

    const drift = (t) => Math.sin(t * 0.113) * 0.22 + Math.sin(t * 0.047) * 0.12 + Math.sin(t * 0.019) * 0.06;

    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      speedScale += ((hover ? 0.12 : 1) - speedScale) * 0.06;
      const speed = 42 * (1 + drift(t)) * speedScale;   // px/s
      x -= speed * dt;
      if (width > 0 && -x >= width) x += width;
      for (const tr of tracks) tr.style.setProperty('--marquee-x', x.toFixed(2) + 'px');
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

})();
