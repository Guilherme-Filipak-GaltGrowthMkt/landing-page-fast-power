/**
 * Movimento orgânico do Hero (v3).
 *
 * O SVG está inline no DOM, então dá para girar o próprio padrão das ripas.
 * As linhas são inclinadas para a direita e o ângulo responde ao cursor de
 * forma sutil — a superfície reage, mas não desliza como um bloco.
 *
 * Sem cursor, tudo deriva por soma de senoides de frequências incomensuráveis:
 * o ciclo combinado não fecha, então o movimento nunca bate o compasso.
 */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const svg = hero.querySelector('.hero__svg');
  const beams = Array.from(hero.querySelectorAll('.hero__beam'));
  const ribPatterns = svg ? Array.from(svg.querySelectorAll('.rib-pattern')) : [];
  const pulseLayer = svg ? svg.querySelector('#pulseLayer') : null;
  const litSpot = svg ? svg.querySelector('#litSpot') : null;
  const litLayer = svg ? svg.querySelector('#litLayer') : null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const VIEWBOX_W = 1600;
  const VIEWBOX_H = 1000;
  const RIB_UNITS = 17;
  const CREST = 0.52;     // posição da crista dentro de #ribShade
  const BASE_ANGLE = 11;  // inclinação para a direita

  // ---------------------------------------------------------------- estado
  const pointer = { x: 0, y: 0, vx: VIEWBOX_W * 0.64, vy: VIEWBOX_H * 0.3 };
  const smooth = { x: 0, y: 0, vx: pointer.vx, vy: pointer.vy, glow: 0 };
  let lastMove = -Infinity;
  let rafId = null;
  let onScreen = true;
  let lastLit = 0;
  let litOp = 0.5;
  const litAt = { x: 1020, y: 300 };

  const drift = (t, a, b, c, phase) =>
    Math.sin(t * a + phase) * 0.60 +
    Math.sin(t * b + phase * 1.7) * 0.28 +
    Math.sin(t * c + phase * 3.1) * 0.12;

  // Converte coordenada de tela para o espaço do viewBox, desfazendo o
  // recorte de `preserveAspectRatio="slice"` (equivalente a object-fit: cover).
  function toViewBox(clientX, clientY) {
    const rect = hero.getBoundingClientRect();
    const scale = Math.max(rect.width / VIEWBOX_W, rect.height / VIEWBOX_H);
    const offsetX = (rect.width - VIEWBOX_W * scale) / 2;
    const offsetY = (rect.height - VIEWBOX_H * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale
    };
  }

  function handleMove(event) {
    const rect = hero.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    const vb = toViewBox(event.clientX, event.clientY);
    pointer.vx = vb.x;
    pointer.vy = vb.y;

    lastMove = performance.now();
  }

  // --------------------------------------------------------------- loop
  function frame(now) {
    const t = now / 1000;

    const idleFor = now - lastMove;
    const influence = Math.max(0, Math.min(1, 1 - (idleFor - 900) / 2200));

    const idleX = drift(t, 0.113, 0.047, 0.019, 0);
    const idleY = drift(t, 0.071, 0.033, 0.014, 2.4);

    const targetX = pointer.x * influence + idleX * (1 - influence);
    const targetY = pointer.y * influence + idleY * (1 - influence);

    // alvo do realce: sob o cursor, ou derivando pela zona iluminada
    const targetVx = pointer.vx * influence + (VIEWBOX_W * (0.64 + idleX * 0.1)) * (1 - influence);
    const targetVy = pointer.vy * influence + (VIEWBOX_H * (0.32 + idleY * 0.1)) * (1 - influence);

    // inércia pesada: a luz arrasta atrás do cursor
    smooth.x += (targetX - smooth.x) * 0.042;
    smooth.y += (targetY - smooth.y) * 0.042;
    smooth.vx += (targetVx - smooth.vx) * 0.07;
    smooth.vy += (targetVy - smooth.vy) * 0.07;
    smooth.glow += (influence - smooth.glow) * 0.05;

    const s = hero.style;
    s.setProperty('--mx', smooth.x.toFixed(4));
    s.setProperty('--my', smooth.y.toFixed(4));

    const pulse = 0.78 + (drift(t, 0.089, 0.037, 0.016, 3.6) + 1) * 0.07;
    s.setProperty('--glow-pulse', pulse.toFixed(3));

    // ---- as próprias linhas reagem: o ângulo inclina de leve na direção
    // do cursor, mais uma oscilação orgânica. Amplitude pequena de propósito.
    // O ângulo das ripas NÃO é mais reescrito por quadro. Mexer em
    // patternTransform invalida todo <rect> preenchido com o pattern — eram
    // três rects de 1600x1000, ou seja três repinturas de tela cheia a 60fps.
    // A oscilação era de ~2 graus: imperceptível, e custava o hero inteiro.

    // ---- realce especular: mexer em litSpot recalcula <mask id="litMask">
    // e repinta o rect mascarado de tela cheia. Limitado a ~12fps e só
    // quando de fato mudou de lugar.
    if (litSpot && now - lastLit > 80) {
      const nx = smooth.vx, ny = smooth.vy;
      if (Math.abs(nx - litAt.x) > 6 || Math.abs(ny - litAt.y) > 6) {
        litSpot.setAttribute('cx', nx.toFixed(0));
        litSpot.setAttribute('cy', ny.toFixed(0));
        litAt.x = nx; litAt.y = ny;
      }
      if (litLayer) {
        const op = 0.34 + smooth.glow * 0.5;
        if (Math.abs(op - litOp) > 0.02) {
          litLayer.setAttribute('opacity', op.toFixed(2));
          litOp = op;
        }
      }
      lastLit = now;
    }

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId !== null || reduceMotion.matches) return;
    hero.classList.add('is-animating');
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
    hero.classList.remove('is-animating');
  }

  // Inclinação das ripas: aplicada UMA vez, não por quadro.
  const fixedRotation = 'rotate(' + BASE_ANGLE + ')';
  for (const pattern of ribPatterns) pattern.setAttribute('patternTransform', fixedRotation);
  if (pulseLayer) pulseLayer.setAttribute('transform', fixedRotation);

  // ------------------------------------------- feixes com cadência irregular
  function scheduleBeam(el, baseDuration) {
    const gap = 5200 + Math.random() * 9000;

    setTimeout(() => {
      if (reduceMotion.matches) return;
      if (!onScreen || document.hidden) {
        scheduleBeam(el, baseDuration);
        return;
      }

      const duration = baseDuration * (0.9 + Math.random() * 0.75);
      const angle = BASE_ANGLE + (Math.random() * 2 - 1) * 5;
      const peak = 0.24 + Math.random() * 0.20;

      const animation = el.animate(
        [
          { transform: `translateX(-32vw) rotate(${angle}deg)`, opacity: 0 },
          { opacity: peak, offset: 0.2 },
          { opacity: peak * 0.9, offset: 0.78 },
          { transform: `translateX(124vw) rotate(${angle}deg)`, opacity: 0 }
        ],
        { duration, easing: 'cubic-bezier(0.30, 0.06, 0.25, 1)' }
      );

      animation.onfinish = () => scheduleBeam(el, baseDuration);
      animation.oncancel = () => scheduleBeam(el, baseDuration);
    }, gap);
  }

  // -------------------------------- pulsos de dados descendo pelas ripas
  // Desenhados DENTRO do grupo rotacionado, então herdam a inclinação das
  // ripas automaticamente — basta encaixá-los na crista.
  function firePulse() {
    if (reduceMotion.matches || !pulseLayer) return;

    const nextIn = 1400 + Math.random() * 3200;

    if (!onScreen || document.hidden) {
      setTimeout(firePulse, nextIn);
      return;
    }

    // faixa ampla: a rotação empurra parte das ripas para fora do quadro,
    // então geramos além da borda direita do viewBox
    const minX = 560;
    const maxX = 1900;
    const rib = Math.round((minX + Math.random() * (maxX - minX)) / RIB_UNITS - CREST);
    const x = (rib + CREST) * RIB_UNITS;
    const height = 120 + Math.random() * 150;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x.toFixed(2));
    rect.setAttribute('y', '-260');
    rect.setAttribute('width', '3');
    rect.setAttribute('height', height.toFixed(0));
    rect.setAttribute('fill', 'url(#pulseGrad)');
    pulseLayer.appendChild(rect);

    const duration = 1100 + Math.random() * 1700;
    const peak = 0.22 + Math.random() * 0.26;

    const animation = rect.animate(
      [
        { transform: 'translateY(0px)', opacity: 0 },
        { opacity: peak, offset: 0.18 },
        { opacity: peak * 0.85, offset: 0.7 },
        { transform: 'translateY(1500px)', opacity: 0 }
      ],
      { duration, easing: 'cubic-bezier(0.25, 0.55, 0.3, 1)' }
    );

    animation.onfinish = () => rect.remove();
    animation.oncancel = () => rect.remove();

    setTimeout(firePulse, nextIn);
  }

  // ------------------------------------------------------------- ligação
  if (!reduceMotion.matches) {
    hero.addEventListener('pointermove', handleMove, { passive: true });
    beams.forEach((el, i) => scheduleBeam(el, 5200 + i * 2400));
    setTimeout(firePulse, 700);
  }

  // O Hero começa visível, então o loop parte imediatamente; o observer só
  // pausa e retoma.
  start();

  const observer = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      onScreen && !document.hidden ? start() : stop();
    },
    { threshold: 0, rootMargin: '120px 0px 120px 0px' }
  );
  observer.observe(hero);

  document.addEventListener('visibilitychange', () => {
    document.hidden || !onScreen ? stop() : start();
  });

  reduceMotion.addEventListener('change', () => {
    reduceMotion.matches ? stop() : start();
  });
})();
