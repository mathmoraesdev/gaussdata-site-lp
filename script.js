(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  /* =========================================================
     1. SCROLL REVEAL & STAGGER DINÂMICO
  ========================================================= */
  document.querySelectorAll('.why-grid, .service-grid, .method-list').forEach(grid => {
    const children = grid.querySelectorAll('.why-card, .service-card, .method-item');
    children.forEach((child, index) => {
      child.style.setProperty('--stagger-idx', index);
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealIO.observe(el));

  /* =========================================================
     2. TILT 3D NOS CARDS (Desabilitado em Touch)
  ========================================================= */
  if (!reduceMotion && !isTouch) {
    const MAX_TILT = 6;
    document.querySelectorAll('.tilt').forEach(card => {
      let raf = null;
      card.style.transformStyle = 'preserve-3d';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * MAX_TILT * 2;
        const ry = (px - 0.5) * MAX_TILT * 2;

        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
        });
      });

      card.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = 'perspective(700px) rotateX(0) rotateY(0) translateY(0)';
      });
    });
  }

  /* =========================================================
     3. BOTÕES MAGNÉTICOS (Desabilitado em Touch)
  ========================================================= */
  if (!reduceMotion && !isTouch) {
    const PULL = 0.28;
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const mx = e.clientX - (rect.left + rect.width / 2);
        const my = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = `translate(${mx * PULL}px, ${my * PULL}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0,0)';
      });
    });
  }

  /* =========================================================
     4. SPOTLIGHT NO HERO E PAUSA DO CANVAS
  ========================================================= */
  const hero = document.querySelector('.hero');
  let canvasVisible = true;
  let rafId = null;

  if (hero) {
    if (!reduceMotion) {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        hero.style.setProperty('--mx', mx + '%');
        hero.style.setProperty('--my', my + '%');
      });
    }

    const heroObserver = new IntersectionObserver((entries) => {
      canvasVisible = entries[0].isIntersecting;
      if (canvasVisible && rafId === null) {
        rafId = requestAnimationFrame(frame);
      } else if (!canvasVisible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }, { threshold: 0 });
    heroObserver.observe(hero);
  }

  /* =========================================================
     5. GRÁFICO DO MOCKUP — Traço e Preenchimento
  ========================================================= */
  const dashLine = document.getElementById('dash-line');
  const dashFill = document.querySelector('.dash-chart .dash-fill');
  const dashChartEl = document.querySelector('.dash-chart');

  if (dashLine && dashFill) {
    const chartLen = dashLine.getTotalLength();
    dashLine.style.strokeDasharray = chartLen;

    if (reduceMotion) {
      dashLine.style.strokeDashoffset = 0;
      dashFill.style.opacity = 1;
    } else {
      function resetChart() {
        dashLine.style.transition = 'none';
        dashLine.style.strokeDashoffset = chartLen;
        dashFill.style.transition = 'none';
        dashFill.style.opacity = 0;
      }
      function playChart() {
        dashLine.getBoundingClientRect();
        dashLine.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1) 0.3s';
        dashLine.style.strokeDashoffset = 0;
        dashFill.style.transition = 'opacity 1.2s ease 1.5s';
        dashFill.style.opacity = 1;
      }
      resetChart();
      if (dashChartEl) {
        const chartIO = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) playChart();
            else resetChart();
          });
        }, { threshold: 0.4 });
        chartIO.observe(dashChartEl);
      } else {
        requestAnimationFrame(playChart);
      }
    }
  }

  /* =========================================================
     6. CANVAS — rede de dados viva
  ========================================================= */
  const canvas = document.getElementById('network-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, DPR;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  const COL_A = [36, 97, 255];
  const COL_B = [53, 208, 245];
  function gradColor(ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    const rr = Math.round(lerp(COL_A[0], COL_B[0], r));
    const gg = Math.round(lerp(COL_A[1], COL_B[1], r));
    const bb = Math.round(lerp(COL_A[2], COL_B[2], r));
    return `${rr},${gg},${bb}`;
  }

  let nodes = [];
  let linkDist = 150;
  function initNodes() {
    nodes = [];
    const isNarrow = W < 900;
    const count = isNarrow ? 42 : 110;
    linkDist = isNarrow ? 100 : 160;
    for (let i = 0; i < count; i++) {
      const isFeature = i % 12 === 0;
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        r: isFeature ? Math.random() * 1.1 + 1.8 : Math.random() * 1.2 + 0.4,
        depth: Math.random() * 0.6 + 0.4,
        feature: isFeature,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.01
      });
    }
  }

  const auras = [
    { baseX: 0.18, baseY: 0.28, r: 0.55, hue: [36, 97, 255], speed: 0.00016, phase: 0 },
    { baseX: 0.82, baseY: 0.78, r: 0.6, hue: [53, 208, 245], speed: 0.00021, phase: 2.1 }
  ];
  function drawAuras(now) {
    auras.forEach(a => {
      const driftX = Math.sin(now * a.speed + a.phase) * 0.05;
      const driftY = Math.cos(now * a.speed * 0.8 + a.phase) * 0.05;
      const cx = W * (a.baseX + driftX);
      const cy = H * (a.baseY + driftY);
      const r = Math.max(W, H) * a.r;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${a.hue[0]},${a.hue[1]},${a.hue[2]},0.10)`);
      g.addColorStop(1, `rgba(${a.hue[0]},${a.hue[1]},${a.hue[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  }

  let pulses = [];
  function maybeSpawnPulse(edges) {
    if (reduceMotion) return;
    if (pulses.length > 26) return;
    if (Math.random() > 0.02) return;
    if (!edges.length) return;
    const e = edges[Math.floor(Math.random() * edges.length)];
    pulses.push({ a: e.a, b: e.b, t: 0, speed: 0.006 + Math.random() * 0.01 });
  }

  resize();
  initNodes();
  window.addEventListener('resize', () => {
    resize();
    initNodes();
  });

  let mouseX = 0, mouseY = 0, mouseActive = false;
  if (!reduceMotion) {
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientY < rect.bottom && e.clientY > rect.top) {
        mouseX = (e.clientX - rect.left - W / 2) / (W / 2);
        mouseY = (e.clientY - rect.top - H / 2) / (H / 2);
        mouseActive = true;
      } else {
        mouseActive = false;
      }
    });
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);

    if (!reduceMotion) drawAuras(now);

    nodes.forEach(p => {
      if (!reduceMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        p.twinklePhase += p.twinkleSpeed;
      }
    });

    ctx.lineWidth = 1;
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          const ratio = ((a.depth + b.depth) / 2 - 0.4) / 0.6;
          ctx.strokeStyle = `rgba(${gradColor(ratio * 0.7)},${(1 - d / linkDist) * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          edges.push({ a, b });
        }
      }
    }

    maybeSpawnPulse(edges);
    pulses = pulses.filter(p => p.t < 1);
    pulses.forEach(p => {
      p.t += p.speed;
      const x = lerp(p.a.x, p.b.x, p.t);
      const y = lerp(p.a.y, p.b.y, p.t);
      const fade = Math.sin(Math.min(p.t, 1) * Math.PI);
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${gradColor(0.8)},0.9)`;
      ctx.fillStyle = `rgba(${gradColor(0.8)},${0.85 * fade})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    nodes.forEach(p => {
      const parX = mouseActive ? mouseX * 9 * p.depth : 0;
      const parY = mouseActive ? mouseY * 9 * p.depth : 0;
      const twinkle = reduceMotion ? 1 : (Math.sin(p.twinklePhase) * 0.3 + 0.7);
      const color = gradColor((p.depth - 0.4) / 0.6 * 0.7);
      ctx.beginPath();
      if (p.feature) {
        ctx.save();
        ctx.shadowBlur = 7;
        ctx.shadowColor = `rgba(${color},0.85)`;
        ctx.fillStyle = `rgba(${color},${0.75 * twinkle})`;
        ctx.arc(p.x + parX, p.y + parY, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(${color},${0.55 * twinkle})`;
        ctx.arc(p.x + parX, p.y + parY, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  /* =========================================================
     7. BARRA DE PROGRESSO DE SCROLL + HEADER RETRÁTIL
  ========================================================= */
  const progressBar = document.getElementById('scroll-progress-bar');
  const header = document.getElementById('site-header');
  let scrollTicking = false;

  function onScrollUpdate() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollH = (doc.scrollHeight - doc.clientHeight) || 1;
    if (progressBar) progressBar.style.width = ((scrollTop / scrollH) * 100).toFixed(2) + '%';
    if (header) header.classList.toggle('scrolled', scrollTop > 40);
    scrollTicking = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(onScrollUpdate);
      scrollTicking = true;
    }
  }, { passive: true });
  onScrollUpdate();

  /* =========================================================
     7b. MENU MOBILE (HAMBÚRGUER)
  ========================================================= */
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-links');
  if (navToggle && navMenu) {
    const closeMenu = () => {
      navToggle.classList.remove('open');
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      navToggle.classList.add('open');
      navMenu.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.contains('open');
      if (isOpen) closeMenu(); else openMenu();
    });
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  /* =========================================================
     8. NAV ATIVA CONFORME A SEÇÃO VISÍVEL
  ========================================================= */
  const navLinks = document.querySelectorAll('#nav-links a[data-nav]');
  if (navLinks.length) {
    const navMap = new Map();
    navLinks.forEach(a => {
      const id = a.getAttribute('data-nav');
      const section = document.getElementById(id);
      if (section) navMap.set(section, a);
    });
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = navMap.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    navMap.forEach((_, section) => navIO.observe(section));
  }

  /* =========================================================
     9. CONTADORES ANIMADOS (data-counter)
  ========================================================= */
  const counterEls = document.querySelectorAll('[data-counter]');
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function animateCounter(el) {
    const target = parseFloat(el.getAttribute('data-target') || '0');
    const suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const val = Math.round(target * easeOutExpo(t));
      el.textContent = val + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counterEls.length) {
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counterEls.forEach(el => counterIO.observe(el));
  }

  /* =========================================================
     10. FAQ ACCORDION
  ========================================================= */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(other => {
        other.classList.remove('open');
        const otherBtn = other.querySelector('.faq-q');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* =========================================================
     11. FORMULÁRIO DE LEAD → DEEP LINK WHATSAPP
  ========================================================= */
  const leadForm = document.getElementById('lead-form');
  if (leadForm) {
    const WHATSAPP_NUMBER = '5551993368040';
    const nameInput = document.getElementById('lead-name');
    const phoneInput = document.getElementById('lead-phone');

    function setFieldError(input, message) {
      const field = input.closest('.lead-field');
      const errorEl = leadForm.querySelector(`[data-error-for="${input.id}"]`);
      if (field) field.classList.toggle('invalid', !!message);
      if (errorEl) errorEl.textContent = message || '';
    }

    function validatePhone(value) {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 11;
    }

    function maskPhoneBR(raw) {
      const d = raw.replace(/\D/g, '').slice(0, 11);
      if (!d) return '';
      if (d.length <= 2) return `(${d}`;
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    phoneInput.addEventListener('blur', function() {
      const digits = this.value.replace(/\D/g, '');
      if (digits.length >= 10) {
        this.value = maskPhoneBR(digits);
      }
    });

    phoneInput.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
    });

    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      if (!nameInput.value.trim()) {
        setFieldError(nameInput, 'Informe seu nome.');
        valid = false;
      } else {
        setFieldError(nameInput, '');
      }

      if (!validatePhone(phoneInput.value)) {
        setFieldError(phoneInput, 'Informe um WhatsApp válido, com DDD.');
        valid = false;
      } else {
        setFieldError(phoneInput, '');
        phoneInput.value = maskPhoneBR(phoneInput.value);
      }

      if (!valid) {
        const firstInvalid = leadForm.querySelector('.lead-field.invalid input');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();

      const message = `Olá, sou ${name}. Quero começar pelo Gauss Scan. (Meu WhatsApp: ${phone})`;

      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      try {
        const log = JSON.parse(localStorage.getItem('gaussdata_leads') || '[]');
        log.push({ name, phone, ts: new Date().toISOString() });
        localStorage.setItem('gaussdata_leads', JSON.stringify(log.slice(-20)));
      } catch (err) { /* localStorage indisponível — segue sem log local */ }

      const fallbackLink = document.getElementById('lead-fallback-link');
      if (fallbackLink) fallbackLink.href = waUrl;
      const successName = document.getElementById('lead-success-name');
      if (successName) successName.textContent = name.split(' ')[0];

      leadForm.classList.add('sent');
      trackEvent('lead_submit', {});
      window.open(waUrl, '_blank', 'noopener');
    });

    [nameInput, phoneInput].forEach(input => {
      input.addEventListener('input', () => setFieldError(input, ''));
    });
  }

  /* =========================================================
     12. RIPPLE NOS BOTÕES
  ========================================================= */
  if (!reduceMotion) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.6;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /* =========================================================
     13. PARALLAX SUTIL NO VISUAL DO HERO (scroll)
  ========================================================= */
  const heroVisual = document.querySelector('.hero-visual');
  const isWideScreen = window.matchMedia('(min-width: 900px)').matches;
  if (heroVisual && hero && !reduceMotion && isWideScreen) {
    let parallaxTicking = false;
    function updateParallax() {
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
      heroVisual.style.transform = `translateY(${progress * 40}px)`;
      heroVisual.style.opacity = String(1 - progress * 0.6);
      parallaxTicking = false;
    }
    window.addEventListener('scroll', () => {
      if (!parallaxTicking) {
        requestAnimationFrame(updateParallax);
        parallaxTicking = true;
      }
    }, { passive: true });
  }

  /* =========================================================
     14. RASTREAMENTO DE EVENTOS (GA4 / Meta Pixel)
  ========================================================= */
  function trackEvent(name, params) {
    params = params || {};
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
      if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params);
      const debugOn = window.location.search.indexOf('debug=1') !== -1 || window.location.hostname === 'localhost';
      if (debugOn) console.log('[gauss:event]', name, params);
    } catch (err) { /* provedor de analytics indisponível — não deve quebrar a página */ }
  }
  window.gaussTrackEvent = trackEvent;

  /* =========================================================
     15. RASTREAMENTO DE CLIQUE NO WHATSAPP
  ========================================================= */
  document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    link.addEventListener('click', () => {
      const section = link.closest('section, header, footer');
      trackEvent('whatsapp_click', {
        origem: (section && section.id) || 'wa_float',
        rotulo: link.textContent.trim().slice(0, 60)
      });
    });
  });

  /* =========================================================
     16. PROFUNDIDADE DE SCROLL
  ========================================================= */
  (function trackScrollDepth() {
    const marks = [25, 50, 75, 100];
    const fired = new Set();
    let depthTicking = false;
    function checkDepth() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollH = (doc.scrollHeight - doc.clientHeight) || 1;
      const pct = (scrollTop / scrollH) * 100;
      marks.forEach(m => {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          trackEvent('scroll_depth', { porcentagem: m });
        }
      });
      depthTicking = false;
    }
    window.addEventListener('scroll', () => {
      if (!depthTicking) {
        requestAnimationFrame(checkDepth);
        depthTicking = true;
      }
    }, { passive: true });
  })();

  /* =========================================================
     17. BOTÃO FLUTUANTE DO WHATSAPP
  ========================================================= */
  const waFloat = document.getElementById('wa-float');
  const waFloatLabel = document.getElementById('wa-float-label');
  if (waFloat && hero) {
    let waLabelSwapped = false;
    let waLabelTimer = null;
    const waFloatIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const nowVisible = !entry.isIntersecting;
        waFloat.classList.toggle('visible', nowVisible);
        if (nowVisible && !waLabelSwapped && waFloatLabel && !waLabelTimer) {
          waLabelTimer = setTimeout(() => {
            waFloatLabel.textContent = 'Receber análise gratuita →';
            waLabelSwapped = true;
          }, 4000);
        }
      });
    }, { threshold: 0 });
    waFloatIO.observe(hero);
  }

  /* =========================================================
     18. BARRAS DE PROGRESSO ANIMADAS — SEÇÃO MÉTODO
  ========================================================= */
  document.querySelectorAll('.method-progress-fill').forEach(fillEl => {
    const target = fillEl.getAttribute('data-progress') || '0';
    if (reduceMotion) {
      fillEl.style.width = target + '%';
      return;
    }
    const progressIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          fillEl.style.width = target + '%';
          progressIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    progressIO.observe(fillEl);
  });

  /* =========================================================
     19. EFEITO SCRAMBLE/DECODE NOS TÍTULOS DE SEÇÃO
  ========================================================= */
  if (!reduceMotion) {
    const SCRAMBLE_CHARS = '01#%&$*ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function scrambleReveal(el) {
      const finalText = el.textContent;
      const chars = finalText.split('');
      const revealEvery = 2;
      let frame = 0;

      function tick() {
        const revealedCount = Math.floor(frame / revealEvery);
        let out = '';
        for (let i = 0; i < chars.length; i++) {
          out += (chars[i] === ' ' || i < revealedCount)
            ? chars[i]
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        el.textContent = out;
        frame++;
        if (revealedCount < chars.length) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = finalText;
        }
      }
      tick();
    }

    const scrambleEls = document.querySelectorAll('.section-head h2');
    if (scrambleEls.length) {
      const scrambleIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            scrambleReveal(entry.target);
            scrambleIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      scrambleEls.forEach(el => scrambleIO.observe(el));
    }
  }

  /* =========================================================
     20. CURSOR COM GLOW
  ========================================================= */
  if (!reduceMotion && !isTouch) {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    let glowX = window.innerWidth / 2;
    let glowY = window.innerHeight / 2;
    let targetX = glowX;
    let targetY = glowY;
    let glowRafId = null;

    function glowLoop() {
      glowX += (targetX - glowX) * 0.15;
      glowY += (targetY - glowY) * 0.15;
      glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
      glowRafId = requestAnimationFrame(glowLoop);
    }

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      glow.classList.add('active');
      if (!glowRafId) glowRafId = requestAnimationFrame(glowLoop);
    }, { passive: true });

    document.addEventListener('mouseleave', () => glow.classList.remove('active'));
  }

  /* =========================================================
     21. QUIZ GAUSS SCAN
  ========================================================= */
  (function initMaturityQuiz() {
    const card = document.getElementById('quiz-card');
    if (!card) return;

    const QUESTIONS = [
      {
        pillar: 'Governança',
        question: 'Onde ficam os dados principais da sua operação hoje?',
        options: [
          { label: 'Espalhados em planilhas e prints, cada um do seu jeito', score: 20 },
          { label: 'Em planilhas, mas com algum padrão entre a equipe', score: 55 },
          { label: 'Em um sistema ou painel central, com regras definidas', score: 90 }
        ]
      },
      {
        pillar: 'Qualidade',
        question: 'Com que frequência aparece erro, duplicidade ou dado faltando?',
        options: [
          { label: 'Toda semana — e corrigir é sempre manual', score: 20 },
          { label: 'De vez em quando; já existe alguma checagem', score: 55 },
          { label: 'Raramente — o processo já filtra a maior parte', score: 90 }
        ]
      },
      {
        pillar: 'Segurança',
        question: 'Quem tem acesso aos dados mais sensíveis da operação?',
        options: [
          { label: 'Praticamente qualquer um que tenha a planilha', score: 20 },
          { label: 'Um grupo definido, mas sem controle formal', score: 55 },
          { label: 'Acesso por permissão, com registro de quem viu o quê', score: 90 }
        ]
      },
      {
        pillar: 'Automação',
        question: 'Como o relatório mensal chega até quem decide?',
        options: [
          { label: 'Alguém monta na mão, copiando e colando', score: 20 },
          { label: 'Parte automática, parte ainda feita manualmente', score: 55 },
          { label: 'O painel já atualiza sozinho, sem trabalho manual', score: 90 }
        ]
      }
    ];

    const stepLabel = document.getElementById('quiz-step-label');
    const dotsWrap = document.getElementById('quiz-dots');
    const bodyEl = document.getElementById('quiz-body');
    const resultEl = document.getElementById('quiz-result');
    const scoreEl = document.getElementById('quiz-score');
    const gaugeFill = document.getElementById('quiz-gauge-fill');
    const resultTitle = document.getElementById('quiz-result-title');
    const resultDesc = document.getElementById('quiz-result-desc');
    const resultBridge = document.getElementById('quiz-result-bridge');
    const resultBars = document.getElementById('quiz-result-bars');
    const ctaLink = document.getElementById('quiz-cta');
    const restartBtn = document.getElementById('quiz-restart');

    let current = 0;
    const answers = [];

    QUESTIONS.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'quiz-dot' + (i === 0 ? ' active' : '');
      dot.dataset.dot = String(i);
      dotsWrap.appendChild(dot);
    });

    function updateDots() {
      dotsWrap.querySelectorAll('.quiz-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === current);
        dot.classList.toggle('done', i < current);
      });
    }

    function renderQuestion() {
      const q = QUESTIONS[current];
      stepLabel.textContent = `Pergunta ${current + 1} de ${QUESTIONS.length}`;
      updateDots();

      bodyEl.classList.add('fading');
      window.setTimeout(() => {
        bodyEl.innerHTML = '';

        const qEl = document.createElement('div');
        qEl.className = 'quiz-question';
        qEl.textContent = q.question;
        bodyEl.appendChild(qEl);

        const optsEl = document.createElement('div');
        optsEl.className = 'quiz-options';
        q.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'quiz-option';
          btn.textContent = opt.label;
          btn.addEventListener('click', () => selectOption(opt));
          optsEl.appendChild(btn);
        });
        bodyEl.appendChild(optsEl);

        bodyEl.classList.remove('fading');
      }, reduceMotion ? 0 : 220);
    }

    function selectOption(opt) {
      answers.push({ pillar: QUESTIONS[current].pillar, score: opt.score });
      current++;
      if (current < QUESTIONS.length) {
        renderQuestion();
      } else {
        showResult();
      }
    }

    function scoreLabel(score) {
      if (score < 40) {
        return {
          title: 'Maturidade inicial',
          desc: 'A operação ainda depende muito de trabalho manual e de conhecimento que fica só na cabeça da equipe. É o ponto de partida mais comum — e o que mais ganha com um diagnóstico estruturado.',
          bridge: 'Com esse nível de maturidade, é provável que sua equipe ainda perca bastante tempo todo mês consolidando informações manualmente. O diagnóstico completo mostra exatamente por onde começar.'
        };
      }
      if (score < 70) {
        return {
          title: 'Em desenvolvimento',
          desc: 'Já existe alguma estrutura, mas ainda com brechas: parte do processo é automática, parte depende de alguém lembrar de fazer. Dá pra consolidar rápido com os ajustes certos.',
          bridge: 'Você já saiu do zero, mas ainda deixa horas na mesa toda semana com processos que dependem de alguém lembrar de fazer. O diagnóstico completo mostra o que automatizar primeiro.'
        };
      }
      return {
        title: 'Maturidade consolidada',
        desc: 'A base já é sólida. Os próximos ganhos vêm de refinar indicadores, automatizar o que ainda é manual e blindar processos críticos.',
        bridge: 'Sua base já é sólida — o diagnóstico completo mostra onde estão os últimos pontos cegos antes de blindar o processo de vez.'
      };
    }

    function showResult() {
      const overall = Math.round(answers.reduce((sum, a) => sum + a.score, 0) / answers.length);
      const label = scoreLabel(overall);

      bodyEl.hidden = true;
      stepLabel.textContent = 'Resultado';
      dotsWrap.querySelectorAll('.quiz-dot').forEach(dot => dot.classList.add('done'));
      resultEl.hidden = false;

      const radius = gaugeFill.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      gaugeFill.style.strokeDasharray = String(circumference);
      gaugeFill.style.strokeDashoffset = String(circumference);

      resultTitle.textContent = label.title;
      resultDesc.textContent = label.desc;
      resultBridge.textContent = label.bridge;

      if (reduceMotion) {
        scoreEl.textContent = overall + '%';
        gaugeFill.style.strokeDashoffset = String(circumference * (1 - overall / 100));
      } else {
        requestAnimationFrame(() => {
          gaugeFill.style.strokeDashoffset = String(circumference * (1 - overall / 100));
        });
        const duration = 1300;
        const start = performance.now();
        (function step(now) {
          const t = Math.min(1, (now - start) / duration);
          scoreEl.textContent = Math.round(overall * t) + '%';
          if (t < 1) requestAnimationFrame(step);
        })(start);
      }

      resultBars.innerHTML = '';
      answers.forEach(a => {
        const row = document.createElement('div');
        row.className = 'quiz-result-bar-row';
        row.innerHTML =
          `<span class="quiz-result-bar-name mono">${a.pillar}</span>` +
          `<span class="quiz-result-bar-track"><span class="quiz-result-bar-fill"></span></span>`;
        resultBars.appendChild(row);
        const fill = row.querySelector('.quiz-result-bar-fill');
        requestAnimationFrame(() => { fill.style.width = a.score + '%'; });
      });

      const weakest = answers.reduce((min, a) => (a.score < min.score ? a : min), answers[0]);
      const waMessage = `Olá, fiz o teste rápido de maturidade de dados no site e tirei ${overall}%. ` +
        `O ponto mais fraco foi ${weakest.pillar.toLowerCase()}. Quero entender melhor o diagnóstico completo do Gauss Scan.`;
      ctaLink.href = `https://wa.me/5551993368040?text=${encodeURIComponent(waMessage)}`;

      trackEvent('quiz_complete', { nota_geral: overall, pilar_mais_fraco: weakest.pillar });
    }

    function resetQuiz() {
      current = 0;
      answers.length = 0;
      resultEl.hidden = true;
      bodyEl.hidden = false;
      renderQuestion();
    }

    restartBtn.addEventListener('click', resetQuiz);
    ctaLink.addEventListener('click', () => trackEvent('quiz_whatsapp_click', {}));
    renderQuestion();
  })();

  /* =========================================================
     22. CARROSSEL DE TELAS — coverflow com perspectiva 3D
  ========================================================= */
  const screenLightbox = document.getElementById('screen-lightbox');
  const screenLightboxStage = document.getElementById('screen-lightbox-stage');
  const screenLightboxImg = document.getElementById('screen-lightbox-img');
  const screenLightboxCaption = document.getElementById('screen-lightbox-caption');
  const screenLightboxClose = document.getElementById('screen-lightbox-close');
  let lastLightboxTrigger = null;

  const LB_MIN_SCALE = 1;
  const LB_MAX_SCALE = 3.5;
  let lbScale = 1, lbX = 0, lbY = 0;
  let lbPinchStartDist = 0, lbPinchStartScale = 1;
  let lbDragging = false, lbDragStartX = 0, lbDragStartY = 0, lbDragOriginX = 0, lbDragOriginY = 0;
  let lbLastTap = 0;

  function lbApply() {
    if (screenLightboxImg) {
      screenLightboxImg.style.transform = `translate(${lbX}px, ${lbY}px) scale(${lbScale})`;
    }
  }
  function lbClampPan() {
    if (!screenLightboxStage) return;
    const rect = screenLightboxStage.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (lbScale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (lbScale - 1)) / 2);
    lbX = Math.min(maxX, Math.max(-maxX, lbX));
    lbY = Math.min(maxY, Math.max(-maxY, lbY));
  }
  function lbReset() {
    lbScale = 1; lbX = 0; lbY = 0;
    if (screenLightboxImg) screenLightboxImg.style.transform = '';
  }

  if (screenLightboxStage) {
    screenLightboxStage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lbPinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lbPinchStartScale = lbScale;
      } else if (e.touches.length === 1 && lbScale > 1) {
        lbDragging = true;
        lbDragStartX = e.touches[0].clientX;
        lbDragStartY = e.touches[0].clientY;
        lbDragOriginX = lbX;
        lbDragOriginY = lbY;
      }
    }, { passive: true });

    screenLightboxStage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && lbPinchStartDist) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lbScale = Math.min(LB_MAX_SCALE, Math.max(LB_MIN_SCALE, lbPinchStartScale * (dist / lbPinchStartDist)));
        lbClampPan();
        lbApply();
      } else if (e.touches.length === 1 && lbDragging) {
        e.preventDefault();
        lbX = lbDragOriginX + (e.touches[0].clientX - lbDragStartX);
        lbY = lbDragOriginY + (e.touches[0].clientY - lbDragStartY);
        lbClampPan();
        lbApply();
      }
    }, { passive: false });

    screenLightboxStage.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) lbPinchStartDist = 0;
      if (e.touches.length === 0) {
        lbDragging = false;
        if (lbScale < LB_MIN_SCALE) { lbScale = LB_MIN_SCALE; lbX = 0; lbY = 0; lbApply(); }

        const now = Date.now();
        if (now - lbLastTap < 300) {
          if (lbScale > 1) { lbScale = 1; lbX = 0; lbY = 0; }
          else { lbScale = 2; }
          lbClampPan();
          lbApply();
        }
        lbLastTap = now;
      }
    }, { passive: true });
  }

  function openScreenLightbox(imgEl, captionText, triggerEl) {
    if (!screenLightbox || !screenLightboxImg || !imgEl) return;
    lbReset();
    screenLightboxImg.src = imgEl.getAttribute('src');
    screenLightboxImg.alt = imgEl.getAttribute('alt') || '';
    if (screenLightboxCaption) screenLightboxCaption.textContent = captionText || '';
    lastLightboxTrigger = triggerEl || null;
    screenLightbox.classList.add('active');
    screenLightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    screenLightboxClose?.focus();
  }
  function closeScreenLightbox() {
    if (!screenLightbox) return;
    screenLightbox.classList.remove('active');
    screenLightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbReset();
    lastLightboxTrigger?.focus();
  }
  if (screenLightbox) {
    screenLightboxClose?.addEventListener('click', closeScreenLightbox);
    screenLightbox.addEventListener('click', (e) => {
      if (e.target === screenLightbox) closeScreenLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && screenLightbox.classList.contains('active')) closeScreenLightbox();
    });
  }

  function initScreensCarousel(root) {
    const viewport = root.querySelector('.screens-viewport');
    const track = root.querySelector('.screens-track');
    const dotsWrap = root.querySelector('.screens-dots');
    const prevBtn = root.querySelector('.screens-prev');
    const nextBtn = root.querySelector('.screens-next');
    if (!viewport || !track || !dotsWrap) return null;

    const cards = Array.from(track.querySelectorAll('.screen-card'));
    const total = cards.length;
    if (!total) return null;

    let active = 0;
    let autoplayId = null;

    dotsWrap.innerHTML = '';
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'screens-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Ir para tela ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.querySelectorAll('.screens-dot'));

    function layout() {
      cards.forEach((card, i) => {
        let offset = i - active;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        const abs = Math.abs(offset);

        let x = 0, scale = 1, rotate = 0, opacity = 1, z = 30, blur = 0, pointer = 'auto';
        if (abs === 1) {
          x = offset * 62; scale = 0.82; rotate = offset * -28; opacity = 0.55; z = 20; blur = 1;
        } else if (abs === 2) {
          x = offset * 100; scale = 0.66; rotate = offset * -32; opacity = 0.16; z = 10; blur = 2; pointer = 'none';
        } else if (abs > 2) {
          x = offset * 120; scale = 0.5; rotate = 0; opacity = 0; z = 0; blur = 3; pointer = 'none';
        }

        card.style.transform = `translate(-50%,-50%) translateX(${x}%) scale(${scale}) rotateY(${rotate}deg)`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(z);
        card.style.filter = blur ? `blur(${blur}px)` : 'none';
        card.style.pointerEvents = pointer;
        card.classList.toggle('is-active', i === active);
      });
      dots.forEach((dot, i) => dot.classList.toggle('active', i === active));
    }

    function goTo(index) {
      active = ((index % total) + total) % total;
      layout();
    }

    function next() { goTo(active + 1); }
    function prev() { goTo(active - 1); }

    if (reduceMotion) cards.forEach(card => card.classList.add('no-anim'));

    function activateCard(i, card) {
      if (i !== active) { goTo(i); return; }
      const img = card.querySelector('.screen-body-img img');
      if (img) {
        const caption = card.querySelector('.screen-caption')?.textContent || '';
        openScreenLightbox(img, caption, card);
      }
    }

    cards.forEach((card, i) => card.addEventListener('click', () => activateCard(i, card)));
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });

    viewport.setAttribute('tabindex', '0');
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { prev(); restartAutoplay(); }
      if (e.key === 'ArrowRight') { next(); restartAutoplay(); }
    });

    let touchStartX = null;
    let touchStartY = null;
    let touchMoved = false;
    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });
    viewport.addEventListener('touchmove', (e) => {
      if (touchStartX === null) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 10 || dy > 10) touchMoved = true;
    }, { passive: true });
    viewport.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) next(); else prev();
        restartAutoplay();
      } else if (!touchMoved) {
        const target = e.target.closest('.screen-card');
        const idx = target ? cards.indexOf(target) : -1;
        if (idx !== -1) {
          e.preventDefault();
          activateCard(idx, cards[idx]);
        }
      }
      touchStartX = null;
      touchStartY = null;
    }, { passive: false });

    function startAutoplay() {
      if (reduceMotion || autoplayId) return;
      autoplayId = window.setInterval(next, 4800);
    }
    function stopAutoplay() {
      if (autoplayId) { window.clearInterval(autoplayId); autoplayId = null; }
    }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    viewport.addEventListener('mouseenter', stopAutoplay);
    viewport.addEventListener('mouseleave', startAutoplay);
    viewport.addEventListener('focusin', stopAutoplay);
    viewport.addEventListener('focusout', startAutoplay);

    const screensIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) startAutoplay(); else stopAutoplay();
      });
    }, { threshold: 0.3 });
    screensIO.observe(viewport);

    layout();
    return { goTo, layout, startAutoplay, stopAutoplay };
  }

  const screensCarousels = Array.from(document.querySelectorAll('.screens-carousel'))
    .map(el => initScreensCarousel(el))
    .filter(Boolean);

  /* =========================================================
     23. ABAS DE CLIENTES
  ========================================================= */
  (function initCaseTabs() {
    const tabsWrap = document.getElementById('case-tabs');
    const panelsWrap = document.getElementById('case-panels');
    if (!tabsWrap || !panelsWrap) return;

    const tabs = Array.from(tabsWrap.querySelectorAll('.case-tab'));
    const panels = Array.from(panelsWrap.querySelectorAll('.case-panel'));

    function lockPanelsHeight() {
      let max = 0;
      panels.forEach(panel => {
        const wasHidden = panel.hidden;
        if (wasHidden) panel.hidden = false;
        max = Math.max(max, panel.scrollHeight);
        if (wasHidden) panel.hidden = true;
      });
      if (max > 0) panelsWrap.style.minHeight = max + 'px';
    }
    lockPanelsHeight();
    window.addEventListener('load', lockPanelsHeight);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockPanelsHeight).catch(() => {});
    }
    let resizeId = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeId);
      resizeId = setTimeout(lockPanelsHeight, 200);
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const client = tab.dataset.client;
        if (tab.classList.contains('active')) return;

        tabs.forEach(t => {
          const isActive = t === tab;
          t.classList.toggle('active', isActive);
          t.setAttribute('aria-selected', String(isActive));
        });

        panels.forEach(panel => {
          const isActive = panel.dataset.client === client;
          panel.hidden = !isActive;
          panel.classList.toggle('active', isActive);
        });

        tab.blur();

        trackEvent('case_tab_click', { client });
      });
    });
  })();

  /* =========================================================
     24. RASTREAMENTO DE CONVERSÃO (otimizado)
  ========================================================= */
  // Rastreia quando o usuário chega na página via campanha
  (function trackCampaign() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    
    if (utmSource || utmMedium || utmCampaign) {
      trackEvent('campaign_visit', {
        source: utmSource || 'direct',
        medium: utmMedium || 'none',
        campaign: utmCampaign || 'none'
      });
    }
  })();

  // Rastreia tempo na página (engajamento)
  let pageStartTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const timeSpent = Math.round((Date.now() - pageStartTime) / 1000);
    if (timeSpent > 10) {
      trackEvent('page_time', { seconds: timeSpent });
    }
  });

  console.log('🚀 Gauss Data - Landing Page otimizada (v2.0)');
  console.log('📊 Rastreamento de eventos ativo');
  console.log('💡 Use gaussTrackEvent() para disparar eventos manualmente');
})();