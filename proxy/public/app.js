/* Veil UI shell: address bar, navigation controls and the page viewport. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var body = document.body;
  var frame = $('frame');
  var address = $('address-input');
  var hero = $('hero-input');
  var scheme = $('scheme-icon');
  var menu = $('menu');
  var menuBtn = $('btn-menu');
  var toastEl = $('toast');

  var current = null; // real URL currently displayed
  var pageTitle = 'Veil';
  // The shell runs at "/" when the proxy has its own domain, or at "/__px/" when
  // it's embedded in another site (e.g. the games portal).
  var BASE = location.pathname.indexOf('/__px') === 0 ? '/__px/' : '/';
  var EMBEDDED = window.parent !== window;
  if (EMBEDDED) body.classList.add('embedded');
  function onAiPage() { return /^(\/__px)?\/ai\/?$/.test(location.pathname); }
  function mainUrl() { return current ? BASE + '#' + encodeURIComponent(current.href) : BASE; }
  function setTitle(t) {
    pageTitle = t;
    if (!body.classList.contains('ai-open')) document.title = t;
  }
  var loadTimer = null;

  // ---- URL helpers (mirrors the server's normalisation) ----
  function normalize(input) {
    var q = String(input || '').trim();
    if (!q) return null;
    if (/^https?:\/\//i.test(q)) {
      try { return new URL(q); } catch (e) { /* search */ }
    }
    if (!/\s/.test(q) && /^[^/?#]+\.[a-z0-9-]{2,}(:\d+)?([/?#].*)?$/i.test(q)) {
      try { return new URL('https://' + q); } catch (e) { /* search */ }
    }
    return null; // not an address: let the server run the configured search
  }
  function encode(u) {
    return '/p/' + u.protocol.slice(0, -1) + '/' + u.host + u.pathname + u.search + u.hash;
  }
  function decode(href) {
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return null;
      var m = /^\/p\/(https?)\/([^/?#]+)(.*)$/i.exec(u.pathname + u.search);
      if (!m) return null;
      var r = new URL(m[1] + '://' + m[2] + (m[3] || '/'));
      r.hash = u.hash;
      return r;
    } catch (e) { return null; }
  }

  // ---- view state ----
  function setView(v) {
    body.classList.toggle('view-home', v === 'home');
    body.classList.toggle('view-browse', v === 'browse');
  }

  function setAddress(u) {
    current = u;
    if (document.activeElement !== address) address.value = u ? u.href : '';
    scheme.setAttribute('data-state', !u ? 'search' : u.protocol === 'https:' ? 'secure' : 'insecure');
    scheme.title = !u ? '' : u.protocol === 'https:' ? 'Connection to the site is encrypted' : 'Connection to the site is not encrypted';
    try {
      // While the AI page (/ai) is showing, leave its URL alone; the browsing
      // URL is restored when the user slides back.
      if (!onAiPage()) history.replaceState(null, '', mainUrl());
    } catch (e) {}
  }

  function startLoading() {
    body.classList.remove('loaded');
    void body.offsetWidth; // restart the progress animation
    body.classList.add('loading');
    clearTimeout(loadTimer);
    loadTimer = setTimeout(stopLoading, 45000);
  }
  function stopLoading() {
    clearTimeout(loadTimer);
    if (!body.classList.contains('loading')) return;
    body.classList.remove('loading');
    body.classList.add('loaded');
  }

  function go(input) {
    var u = input instanceof URL ? input : normalize(input);
    var text = input instanceof URL ? '' : String(input || '').trim();
    if (!u && !text) return;
    setView('browse');
    startLoading();
    if (u) {
      setAddress(u);
      frame.src = encode(u);
    } else {
      address.value = text;
      scheme.setAttribute('data-state', 'search');
      frame.src = '/__px/go?q=' + encodeURIComponent(text);
    }
    address.blur();
    hero.blur();
  }

  function goHome() {
    setView('home');
    stopLoading();
    frame.removeAttribute('src');
    setAddress(null);
    setTitle('Veil');
    setTimeout(function () { hero.focus(); }, 0);
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  // ---- forms (progressive enhancement over /__px/go) ----
  $('hero-form').addEventListener('submit', function (e) { e.preventDefault(); go(hero.value); });
  $('address-form').addEventListener('submit', function (e) { e.preventDefault(); go(address.value); });
  address.addEventListener('focus', function () { address.select(); });
  address.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { address.value = current ? current.href : ''; address.blur(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function (e) {
      // Let modified clicks (new tab / window) use the link's own /p/ href.
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      go(b.getAttribute('data-go'));
    });
  });

  // ---- navigation controls ----
  $('btn-back').addEventListener('click', function () { history.back(); });
  $('btn-forward').addEventListener('click', function () { history.forward(); });
  $('btn-home').addEventListener('click', goHome);
  $('btn-reload').addEventListener('click', function () {
    if (body.classList.contains('loading')) {
      try { frame.contentWindow.stop(); } catch (e) {}
      stopLoading();
      return;
    }
    startLoading();
    try { frame.contentWindow.location.reload(); }
    catch (e) { if (current) frame.src = encode(current); }
  });
  function openInNewTab() {
    if (current) window.open(encode(current), '_blank', 'noopener');
  }
  $('btn-newtab').addEventListener('click', openInNewTab);

  // ---- menu ----
  function closeMenu() { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) { var first = menu.querySelector('button:not([hidden])'); if (first) first.focus(); }
  });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && body.classList.contains('view-browse')) {
      e.preventDefault(); address.focus();
    }
  });
  menu.addEventListener('click', function (e) {
    var action = e.target && e.target.getAttribute && e.target.getAttribute('data-action');
    if (!action) return;
    closeMenu();
    if (action === 'home') goHome();
    if (action === 'newtab') openInNewTab();
    if (action === 'copy' && current) {
      (navigator.clipboard ? navigator.clipboard.writeText(current.href) : Promise.reject())
        .then(function () { toast('Address copied'); }, function () { toast('Could not copy'); });
    }
    if (action === 'clear') {
      fetch('/__px/clear', { method: 'POST', credentials: 'same-origin', headers: { 'x-px-req': '1' } })
        .then(function (r) {
          if (!r.ok) throw new Error();
          goHome();
          toast('Session data cleared');
        })
        .catch(function () { toast('Could not clear session data'); });
    }
  });

  // ---- messages from the page runtime ----
  window.addEventListener('message', function (e) {
    if (e.source !== frame.contentWindow) return;
    if (e.origin !== location.origin && e.origin !== 'null') return;
    var d = e.data;
    if (!d || d.__px !== 1 || typeof d.url !== 'string') return;
    if (d.type === 'unload') { startLoading(); return; }
    var u;
    try { u = new URL(d.url); } catch (err) { return; }
    if (!/^https?:$/.test(u.protocol)) return;
    setAddress(u);
    var title = typeof d.title === 'string' ? d.title.slice(0, 200) : '';
    setTitle(title ? title + ' – Veil' : 'Veil');
    if (d.type === 'loaded') stopLoading();
  });

  frame.addEventListener('load', function () {
    stopLoading();
    // Non-HTML documents (images, PDFs, error pages) carry no runtime; read
    // the location directly when the frame is same-origin.
    try {
      var href = frame.contentWindow.location.href;
      var u = decode(href);
      if (u) setAddress(u);
    } catch (e) {}
  });

  // ---- initial state: /#<encoded url> restores the last page ----
  var initial = null;
  if (location.hash.length > 1) {
    try { initial = new URL(decodeURIComponent(location.hash.slice(1))); } catch (e) { initial = null; }
  }
  // ---- ad blocker shield ----
  var shield = $('btn-shield');
  var adblockOn = false;
  function renderShield(info) {
    shield.classList.toggle('on', adblockOn);
    shield.classList.toggle('off', !adblockOn);
    shield.setAttribute('aria-pressed', String(adblockOn));
    shield.title = adblockOn
      ? 'Ad blocker on' + (info && info.domains ? ' (' + info.domains.toLocaleString() + ' ad and tracker domains)' : '') + '. Click to turn off.'
      : 'Ad blocker off. Click to turn on.';
  }
  fetch('/__px/adblock/status', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (info) {
      if (!info || !info.available) return;
      adblockOn = !!info.on;
      shield.hidden = false;
      renderShield(info);
      shield._info = info;
    })
    .catch(function () {});
  shield.addEventListener('click', function () {
    adblockOn = !adblockOn;
    // A plain preference cookie read by the server (not a secret).
    document.cookie = 'px_ab=' + (adblockOn ? '1' : '0') + '; Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    renderShield(shield._info);
    toast(adblockOn ? 'Ad blocker on' : 'Ad blocker off');
    if (current) {
      startLoading();
      try { frame.contentWindow.location.reload(); } catch (e) { frame.src = encode(current); }
    }
  });

  window.Veil = {
    base: BASE,
    embedded: EMBEDDED,
    go: go,
    mainUrl: mainUrl,
    restoreTitle: function () { document.title = pageTitle; },
  };
  if (initial && /^https?:$/.test(initial.protocol)) go(initial);
  else goHome();

  // ==========================================================================
  // Interactive landing page
  // ==========================================================================

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroForm = $('hero-form');
  var hint = $('hero-hint');

  // ---- input hint: tells the user what Enter will do ----
  function renderHint() {
    var text = hero.value.trim();
    heroForm.classList.toggle('has-text', text.length > 0);
    hint.textContent = '';
    if (!text) { hint.innerHTML = '&nbsp;'; return; }
    var key = document.createElement('span');
    key.className = 'key';
    key.textContent = 'Enter';
    var what = document.createElement('b');
    var u = normalize(text);
    hint.appendChild(key);
    if (u) {
      hint.appendChild(document.createTextNode('to open '));
      what.textContent = u.host + (u.pathname.length > 1 ? u.pathname : '');
    } else {
      hint.appendChild(document.createTextNode('to search the web for '));
      what.textContent = '\u201c' + (text.length > 60 ? text.slice(0, 57) + '\u2026' : text) + '\u201d';
    }
    hint.appendChild(what);
    if (window.VeilAI && window.VeilAI.isEnabled()) {
      var askBtn = document.createElement('button');
      askBtn.type = 'button';
      askBtn.className = 'hint-ai';
      askBtn.textContent = 'Ask AI';
      askBtn.title = 'Ask the AI assistant (Ctrl+Enter)';
      askBtn.addEventListener('click', askAi);
      hint.appendChild(askBtn);
    }
  }
  function askAi() {
    var text = hero.value.trim();
    if (!text || !window.VeilAI || !window.VeilAI.isEnabled()) return;
    window.VeilAI.ask(text);
    hero.value = '';
    renderHint();
  }
  hero.addEventListener('input', renderHint);
  hero.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); askAi(); }
  });
  document.addEventListener('veil:ai-ready', renderHint);
  renderHint();

  // "/" focuses the search box from anywhere on the landing page.
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || !body.classList.contains('view-home')) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    hero.focus();
  });

  // ---- quick-link icons (site favicons fetched through the proxy) ----
  Array.prototype.forEach.call(document.querySelectorAll('.tile-icon img[data-src]'), function (img) {
    img.addEventListener('load', function () {
      if (img.naturalWidth > 1) img.parentNode.classList.add('loaded');
    });
    img.addEventListener('error', function () { img.remove(); }); // letter fallback stays
    img.src = img.getAttribute('data-src');
  });

  // ---- cursor spotlight on cards/search + gentle 3D tilt on tiles ----
  Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (el) {
    var isTile = el.classList.contains('tile');
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--sx', x + 'px');
      el.style.setProperty('--sy', y + 'px');
      if (isTile && !reduceMotion && e.pointerType === 'mouse') {
        el.style.setProperty('--ry', ((x / r.width - 0.5) * 10).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y / r.height) * 10).toFixed(2) + 'deg');
      }
    });
    el.addEventListener('pointerleave', function () {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  });

  // ---- reactive background: a dot field that swells, brightens and parts
  // around the cursor, plus aurora glows that drift with it (parallax). ----
  (function field() {
    var canvas = $('field');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    var root = document.documentElement;
    var auroras = document.querySelectorAll('.aurora');
    if (!ctx) return;

    var GAP = 30, RADIUS = 170;
    var dpr = 1, w = 0, h = 0, cols = 0, rows = 0;
    var target = { x: -9999, y: -9999 }, pos = { x: -9999, y: -9999 };
    var active = false, lastMove = 0, raf = 0, t0 = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
      if (!active) { target.x = pos.x = w * 0.5; target.y = pos.y = h * 0.38; }
    }

    function onPointer(e) {
      target.x = e.clientX; target.y = e.clientY;
      if (!active) { pos.x = target.x; pos.y = target.y; }
      active = true; lastMove = performance.now();
      wake();
    }

    function draw(now) {
      raf = 0;
      var visible = body.classList.contains('view-home') || body.classList.contains('ai-open') || body.classList.contains('ai-leaving');
      if (!visible || document.hidden) return;
      // Idle: after a few seconds without input, the focus point drifts slowly.
      if (!active || now - lastMove > 4000) {
        var t = (now - t0) / 1000;
        target.x = w * (0.5 + 0.22 * Math.sin(t * 0.21));
        target.y = h * (0.42 + 0.16 * Math.cos(t * 0.17));
      }
      pos.x += (target.x - pos.x) * 0.12;
      pos.y += (target.y - pos.y) * 0.12;

      root.style.setProperty('--mx', pos.x.toFixed(1) + 'px');
      root.style.setProperty('--my', pos.y.toFixed(1) + 'px');
      var nx = pos.x / w - 0.5, ny = pos.y / h - 0.5;
      for (var a = 0; a < auroras.length; a++) {
        var depth = (a + 1) * 26 * (a % 2 ? -1 : 1);
        auroras[a].style.setProperty('--ax', (nx * depth).toFixed(1) + 'px');
        auroras[a].style.setProperty('--ay', (ny * depth).toFixed(1) + 'px');
      }

      ctx.clearRect(0, 0, w, h);
      var r2 = RADIUS * RADIUS;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var x = i * GAP, y = j * GAP;
          var dx = x - pos.x, dy = y - pos.y;
          var d2 = dx * dx + dy * dy;
          var f = d2 < r2 * 4 ? Math.exp(-d2 / (2 * r2 * 0.45)) : 0;
          var alpha = 0.07 + f * 0.75;
          var size = 1 + f * 1.6;
          if (f > 0.01) {
            var d = Math.sqrt(d2) || 1;
            x += (dx / d) * f * 10; // dots part around the cursor
            y += (dy / d) * f * 10;
            ctx.fillStyle = 'rgba(' + Math.round(150 + 45 * f) + ',' + Math.round(165 + 40 * f) + ',255,' + alpha.toFixed(3) + ')';
          } else {
            ctx.fillStyle = 'rgba(160,170,200,0.07)';
          }
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
      wake();
    }

    function wake() { if (!raf && !reduceMotion) raf = requestAnimationFrame(draw); }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    document.addEventListener('visibilitychange', wake);
    new MutationObserver(wake).observe(body, { attributes: true, attributeFilter: ['class'] });
    resize();
    if (reduceMotion) { draw(performance.now()); } else wake();
  })();
})();
