/*
 * Client runtime injected at the top of every proxied HTML document.
 *
 * The server rewrites every URL it can see in HTML and CSS. This script
 * handles URLs that pages build at runtime: fetch/XHR, WebSocket, EventSource,
 * workers, history.pushState, window.open, DOM property/attribute writes,
 * dynamically inserted markup, link clicks and form submissions.
 *
 * IMPORTANT: this is a compatibility layer, NOT a security boundary. Everything
 * security-relevant (destination policy, SSRF checks, cookie isolation,
 * redirects, header filtering) is enforced on the server. A hostile page can
 * undo anything done here and gains nothing by doing so; the proxy's CSP still
 * confines it to the proxy origin.
 */
(function () {
  'use strict';
  if (window.__pxInstalled) return;
  try {
    Object.defineProperty(window, '__pxInstalled', { value: true });
  } catch (e) {
    return;
  }

  var PREFIX = '/p/';
  var script = document.currentScript;
  var cfg = {};
  try {
    cfg = JSON.parse((script && script.getAttribute('data-px')) || '{}');
  } catch (e) {
    cfg = {};
  }
  var proxyOrigin = location.origin;
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  // --------------------------------------------------------------------------
  // URL helpers

  function decode(pathAndQuery) {
    if (pathAndQuery.indexOf(PREFIX) !== 0) return null;
    var m = /^\/p\/(https?|wss?)\/([^/?#]+)([^#]*)/i.exec(pathAndQuery);
    if (!m) return null;
    var tail = m[3] || '/';
    if (tail.charAt(0) !== '/') tail = '/' + tail;
    try {
      return new URL(m[1].toLowerCase() + '://' + m[2] + tail);
    } catch (e) {
      return null;
    }
  }

  function unproxy(href) {
    try {
      var u = new URL(href, location.href);
      if (u.origin !== proxyOrigin) return null;
      var r = decode(u.pathname + u.search);
      if (r) r.hash = u.hash;
      return r;
    } catch (e) {
      return null;
    }
  }

  /** Real URL of the current document (tracks pushState). */
  function currentReal() {
    return unproxy(location.href) || (cfg.url ? new URL(cfg.url) : new URL('about:blank'));
  }

  /** Real base URL for resolving relative references. */
  function realBase() {
    return unproxy(document.baseURI) || currentReal();
  }

  function encode(u) {
    return PREFIX + u.protocol.slice(0, -1) + '/' + u.host + u.pathname + u.search + u.hash;
  }

  var PASS = /^\s*(data|blob|javascript|about|mailto|tel|sms|intent|chrome|moz-extension|chrome-extension):/i;

  /**
   * Map any URL a page produces to its proxied equivalent.
   * kind: undefined (http), 'ws' (WebSocket).
   */
  function rewrite(raw, kind) {
    if (raw == null) return raw;
    var s = typeof raw === 'string' ? raw : String(raw);
    var t = s.trim();
    if (!t || t.charAt(0) === '#' || PASS.test(t)) return raw;
    var abs;
    try {
      if (t.indexOf('//') === 0) abs = new URL(realBase().protocol + t);
      else abs = new URL(t, document.baseURI);
    } catch (e) {
      return raw;
    }
    if (abs.origin === proxyOrigin) {
      if (abs.pathname.indexOf(PREFIX) === 0 || abs.pathname.indexOf('/__px/') === 0) {
        if (kind === 'ws') return toWs(abs);
        return abs.pathname + abs.search + abs.hash;
      }
      // Root-relative ("/api") or built from location.origin: re-home it onto
      // the real site.
      try {
        abs = new URL(abs.pathname + abs.search + abs.hash, realBase().origin);
      } catch (e) {
        return raw;
      }
    }
    if (!/^(https?|wss?):$/.test(abs.protocol)) return '#';
    if (kind === 'ws') {
      if (abs.protocol === 'http:') abs.protocol = 'ws:';
      if (abs.protocol === 'https:') abs.protocol = 'wss:';
      return toWs(new URL(encode(abs), proxyOrigin));
    }
    if (abs.protocol === 'ws:') abs.protocol = 'http:';
    if (abs.protocol === 'wss:') abs.protocol = 'https:';
    return encode(abs);
  }

  function toWs(proxyAbs) {
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + proxyAbs.pathname + proxyAbs.search;
  }

  function rewriteSrcset(v) {
    if (typeof v !== 'string') return v;
    return v
      .split(/,(?=\s|$)/)
      .map(function (part) {
        var m = /^(\s*)(\S+)(.*)$/.exec(part);
        return m ? m[1] + rewrite(m[2]) + m[3] : part;
      })
      .join(',');
  }

  function isProxied(v) {
    if (typeof v !== 'string') return true;
    var t = v.trim();
    return !t || t.charAt(0) === '#' || PASS.test(t) || t.indexOf(PREFIX) === 0 || t.indexOf(proxyOrigin + PREFIX) === 0;
  }

  // --------------------------------------------------------------------------
  // Frame-guard: honour upstream X-Frame-Options / frame-ancestors when a page
  // is framed by another proxied page (the proxy strips those headers so the
  // UI shell can display pages).

  (function frameGuard() {
    if (!cfg.frameGuard || window.parent === window) return;
    var allowed = false;
    try {
      var p = window.parent;
      var ppath = p.location.pathname;
      // Directly inside the proxy UI (which may itself be embedded in a host site).
      if (/^\/(__px\/?)?$/.test(ppath) || /^(\/__px)?\/ai\/?$/.test(ppath)) allowed = true;
      else if (cfg.frameGuard === 'sameorigin') {
        var pr = unproxy(p.location.href);
        allowed = !!pr && pr.origin === currentReal().origin;
      }
    } catch (e) {
      allowed = false;
    }
    if (!allowed) {
      try {
        window.stop();
      } catch (e) {}
      location.replace('about:blank');
    }
  })();

  // --------------------------------------------------------------------------
  // Network APIs

  if (nativeFetch) {
    window.fetch = function (input, init) {
      try {
        if (typeof Request !== 'undefined' && input instanceof Request) {
          var next = rewrite(input.url);
          if (next !== input.url) input = new Request(next, input);
        } else {
          input = rewrite(input instanceof URL ? input.href : input);
        }
      } catch (e) {}
      return nativeFetch(input, init);
    };
  }

  var xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    try {
      args[1] = rewrite(url instanceof URL ? url.href : url);
    } catch (e) {}
    return xhrOpen.apply(this, args);
  };

  function wrapCtor(name, kind) {
    var Native = window[name];
    if (typeof Native !== 'function' || typeof Proxy === 'undefined') return;
    try {
      window[name] = new Proxy(Native, {
        construct: function (target, args, newTarget) {
          if (args.length > 0) args[0] = rewrite(args[0] instanceof URL ? args[0].href : args[0], kind);
          return Reflect.construct(target, args, newTarget);
        },
      });
    } catch (e) {}
  }
  wrapCtor('WebSocket', 'ws');
  wrapCtor('EventSource');
  wrapCtor('Worker');
  wrapCtor('SharedWorker');

  if (navigator.sendBeacon) {
    var beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      return beacon(rewrite(url), data);
    };
  }

  // Service workers are refused by the server; fail fast and quietly here.
  if (navigator.serviceWorker && navigator.serviceWorker.register) {
    try {
      navigator.serviceWorker.register = function () {
        return Promise.reject(new DOMException('Service workers are disabled by the proxy', 'SecurityError'));
      };
    } catch (e) {}
  }

  var nativeOpen = window.open;
  window.open = function (url) {
    var args = Array.prototype.slice.call(arguments);
    if (args.length > 0 && args[0] != null && args[0] !== '') args[0] = rewrite(args[0]);
    return nativeOpen.apply(window, args);
  };

  ['pushState', 'replaceState'].forEach(function (fn) {
    var native = history[fn];
    history[fn] = function (state, title, url) {
      var args = Array.prototype.slice.call(arguments);
      if (args.length > 2 && args[2] != null) args[2] = rewrite(args[2] instanceof URL ? args[2].href : args[2]);
      var r = native.apply(history, args);
      report();
      return r;
    };
  });

  // --------------------------------------------------------------------------
  // DOM properties and attributes

  var URL_ATTRS = {
    href: ['A', 'AREA', 'LINK', 'BASE'],
    src: ['IMG', 'SCRIPT', 'IFRAME', 'FRAME', 'EMBED', 'SOURCE', 'AUDIO', 'VIDEO', 'TRACK', 'INPUT'],
    action: ['FORM'],
    formaction: ['BUTTON', 'INPUT'],
    poster: ['VIDEO'],
    data: ['OBJECT'],
  };

  function attrNeedsRewrite(el, name) {
    name = String(name).toLowerCase();
    if (name === 'srcset' || name === 'imagesrcset') return 'srcset';
    if (name === 'xlink:href' || (name === 'href' && el.namespaceURI === 'http://www.w3.org/2000/svg')) return 'url';
    var tags = URL_ATTRS[name];
    return tags && tags.indexOf(el.tagName) >= 0 ? 'url' : null;
  }

  function hookProp(Ctor, prop, kind) {
    if (!Ctor || !Ctor.prototype) return;
    var d = Object.getOwnPropertyDescriptor(Ctor.prototype, prop);
    if (!d || !d.set || !d.configurable) return;
    Object.defineProperty(Ctor.prototype, prop, {
      configurable: true,
      enumerable: d.enumerable,
      get: d.get,
      set: function (v) {
        d.set.call(this, kind === 'srcset' ? rewriteSrcset(v) : rewrite(v));
      },
    });
  }
  hookProp(window.HTMLAnchorElement, 'href');
  hookProp(window.HTMLAreaElement, 'href');
  hookProp(window.HTMLLinkElement, 'href');
  hookProp(window.HTMLBaseElement, 'href');
  hookProp(window.HTMLImageElement, 'src');
  hookProp(window.HTMLImageElement, 'srcset', 'srcset');
  hookProp(window.HTMLSourceElement, 'src');
  hookProp(window.HTMLSourceElement, 'srcset', 'srcset');
  hookProp(window.HTMLScriptElement, 'src');
  hookProp(window.HTMLIFrameElement, 'src');
  hookProp(window.HTMLEmbedElement, 'src');
  hookProp(window.HTMLMediaElement, 'src');
  hookProp(window.HTMLTrackElement, 'src');
  hookProp(window.HTMLInputElement, 'src');
  hookProp(window.HTMLInputElement, 'formAction');
  hookProp(window.HTMLButtonElement, 'formAction');
  hookProp(window.HTMLFormElement, 'action');
  hookProp(window.HTMLVideoElement, 'poster');
  hookProp(window.HTMLObjectElement, 'data');

  var nativeSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    var k = attrNeedsRewrite(this, name);
    if (k === 'url') value = rewrite(value);
    else if (k === 'srcset') value = rewriteSrcset(value);
    return nativeSetAttr.call(this, name, value);
  };
  var nativeSetAttrNS = Element.prototype.setAttributeNS;
  Element.prototype.setAttributeNS = function (ns, name, value) {
    if (/(^|:)href$/i.test(String(name))) value = rewrite(value);
    return nativeSetAttrNS.call(this, ns, name, value);
  };

  // Markup inserted via innerHTML / insertAdjacentHTML / document.write
  // bypasses the hooks above; fix it up as it lands.
  var SELECTOR = '[href],[src],[srcset],[action],[formaction],[poster],[data],[imagesrcset]';
  function fixElement(el) {
    if (!el || el.nodeType !== 1) return;
    var names = ['href', 'src', 'srcset', 'action', 'formaction', 'poster', 'data', 'imagesrcset', 'xlink:href'];
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (!el.hasAttribute(n)) continue;
      var kind = attrNeedsRewrite(el, n);
      if (!kind) continue;
      var v = el.getAttribute(n);
      if (kind === 'url' && isProxied(v)) continue;
      var nv = kind === 'srcset' ? rewriteSrcset(v) : rewrite(v);
      if (nv !== v) nativeSetAttr.call(el, n, nv);
    }
  }
  function fixTree(root) {
    fixElement(root);
    if (root.querySelectorAll) {
      var list = root.querySelectorAll(SELECTOR);
      for (var i = 0; i < list.length; i++) fixElement(list[i]);
    }
  }
  try {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) if (added[j].nodeType === 1) fixTree(added[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  // Last line of defence for navigations the hooks missed.
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href],area[href]') : null;
      if (a) fixElement(a);
    },
    true,
  );
  document.addEventListener(
    'submit',
    function (e) {
      if (e.target && e.target.tagName === 'FORM') fixElement(e.target);
      if (e.submitter) fixElement(e.submitter);
    },
    true,
  );

  // Chromium: catch script-driven navigations (location.href = "https://...")
  // that would otherwise leave the proxy.
  if (window.navigation && window.navigation.addEventListener) {
    window.navigation.addEventListener('navigate', function (e) {
      try {
        if (e.hashChange || e.downloadRequest || !e.cancelable) return;
        var u = new URL(e.destination.url);
        if (u.origin !== proxyOrigin && /^https?:$/.test(u.protocol)) {
          e.preventDefault();
          location.assign(encode(u));
        }
      } catch (err) {}
    });
  }

  // --------------------------------------------------------------------------
  // postMessage: every proxied frame shares the proxy origin, so translate
  // target origins and present the sender's real origin to listeners.

  var nativePost = window.postMessage;
  window.postMessage = function (message, targetOrigin, transfer) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof targetOrigin === 'string' && targetOrigin !== '*' && targetOrigin !== '/') {
      args[1] = cfg.mode === 'sandbox' ? '*' : proxyOrigin;
    } else if (targetOrigin && typeof targetOrigin === 'object' && targetOrigin.targetOrigin && targetOrigin.targetOrigin !== '*') {
      args[1] = Object.assign({}, targetOrigin, { targetOrigin: cfg.mode === 'sandbox' ? '*' : proxyOrigin });
    }
    return nativePost.apply(window, args);
  };
  try {
    var originDesc = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'origin');
    if (originDesc && originDesc.get) {
      Object.defineProperty(MessageEvent.prototype, 'origin', {
        configurable: true,
        get: function () {
          var o = originDesc.get.call(this);
          if (o === proxyOrigin) {
            try {
              var r = this.source && unproxy(this.source.location.href);
              if (r) return r.origin;
            } catch (e) {}
          }
          return o;
        },
      });
    }
  } catch (e) {}

  // --------------------------------------------------------------------------
  // document.cookie emulation. Real cookies live in the server-side jar; the
  // page sees only its site's non-HttpOnly cookies, and writes are sent to the
  // server so they accompany later requests.

  var jar = {};
  String(cfg.cookies || '')
    .split(/;\s*/)
    .forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i > 0) jar[pair.slice(0, i)] = pair.slice(i + 1);
    });
  try {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: function () {
        return Object.keys(jar)
          .map(function (k) {
            return k + '=' + jar[k];
          })
          .join('; ');
      },
      set: function (v) {
        v = String(v);
        var first = v.split(';')[0];
        var i = first.indexOf('=');
        var name = (i >= 0 ? first.slice(0, i) : '').trim();
        var value = (i >= 0 ? first.slice(i + 1) : first).trim();
        var expired = /;\s*max-age\s*=\s*(-\d+|0)\b/i.test(v);
        var exp = /;\s*expires\s*=\s*([^;]+)/i.exec(v);
        if (exp && Date.parse(exp[1]) < Date.now()) expired = true;
        if (expired) delete jar[name];
        else jar[name] = value;
        if (cfg.cookieApi && cfg.mode !== 'sandbox' && nativeFetch) {
          nativeFetch('/__px/cookie', {
            method: 'POST',
            credentials: 'same-origin',
            keepalive: true,
            // The server checks the page's site via Referer; send it even if the
            // page chose a stricter referrer policy.
            referrer: location.href,
            referrerPolicy: 'same-origin',
            headers: { 'content-type': 'application/json', 'x-px-req': '1' },
            body: JSON.stringify({ url: currentReal().href, cookie: v }),
          }).catch(function () {});
        }
      },
    });
  } catch (e) {}

  // --------------------------------------------------------------------------
  // Storage namespacing: every proxied site shares one origin, so keys are
  // prefixed per real origin to avoid collisions between sites. (Convenience
  // only; not an isolation boundary.)

  function namespacedStorage(getNative) {
    var nat = null;
    try {
      nat = getNative();
    } catch (e) {}
    var mem = {};
    var pfx = '__px:' + currentReal().origin + ':';
    function keys() {
      var out = [];
      if (nat) {
        for (var i = 0; i < nat.length; i++) {
          var k = nat.key(i);
          if (k && k.indexOf(pfx) === 0) out.push(k.slice(pfx.length));
        }
      } else out = Object.keys(mem);
      return out;
    }
    var api = {
      getItem: function (k) {
        k = String(k);
        if (nat) return nat.getItem(pfx + k);
        return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
      },
      setItem: function (k, v) {
        if (nat) nat.setItem(pfx + String(k), String(v));
        else mem[String(k)] = String(v);
      },
      removeItem: function (k) {
        if (nat) nat.removeItem(pfx + String(k));
        else delete mem[String(k)];
      },
      clear: function () {
        keys().forEach(function (k) {
          api.removeItem(k);
        });
      },
      key: function (i) {
        var k = keys()[i];
        return k === undefined ? null : k;
      },
    };
    return new Proxy(api, {
      get: function (t, p) {
        if (p === 'length') return keys().length;
        if (Object.prototype.hasOwnProperty.call(t, p)) return t[p];
        if (typeof p === 'string') {
          var v = t.getItem(p);
          return v === null ? undefined : v;
        }
        return undefined;
      },
      set: function (t, p, v) {
        if (typeof p === 'string') t.setItem(p, v);
        return true;
      },
      deleteProperty: function (t, p) {
        if (typeof p === 'string') t.removeItem(p);
        return true;
      },
      has: function (t, p) {
        return typeof p === 'string' && (Object.prototype.hasOwnProperty.call(t, p) || t.getItem(p) !== null);
      },
      ownKeys: function () {
        return keys();
      },
      getOwnPropertyDescriptor: function (t, p) {
        if (typeof p !== 'string') return undefined;
        var v = t.getItem(p);
        return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true };
      },
    });
  }
  if (typeof Proxy !== 'undefined') {
    ['localStorage', 'sessionStorage'].forEach(function (name) {
      try {
        var d = Object.getOwnPropertyDescriptor(window, name) || Object.getOwnPropertyDescriptor(Window.prototype, name);
        if (!d || !d.get) return;
        var wrapped = namespacedStorage(function () {
          return d.get.call(window);
        });
        Object.defineProperty(window, name, { configurable: true, get: function () { return wrapped; } });
      } catch (e) {}
    });
  }

  // --------------------------------------------------------------------------
  // Ad blocker (in-page part). Ad and tracker requests are already blocked on
  // the server; this hides the empty ad slots they leave behind and, on
  // YouTube, backs up the server-side removal of video ads.

  if (cfg.adblock) {
    var AD_CSS = [
      // Generic ad containers (kept conservative so real content isn't hidden)
      'ins.adsbygoogle', '.adsbygoogle', '[id^="div-gpt-ad"]', '[id^="google_ads_iframe"]',
      'iframe[id^="google_ads_iframe"]', '[data-google-query-id]', '[data-ad-slot]', 'amp-ad',
      'amp-embed[type="taboola"]', '[id^="taboola-"]', '.trc_rbox_container', '.OUTBRAIN', '[data-widget-id^="AR_"]',
      '.ad-slot', '.ad-banner', '.adsbox', '.ad-container', '[aria-label="Advertisement"]',
    ];
    var YT_CSS = [
      // YouTube ad slots, promoted results and the anti-adblock dialog
      'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-sparkles-text-search-renderer', 'ytd-display-ad-renderer', 'ytd-promoted-video-renderer',
      'ytd-compact-promoted-video-renderer', 'ytd-banner-promo-renderer', 'ytd-statement-banner-renderer',
      'ytd-search-pyv-renderer', 'ytd-companion-slot-renderer', 'ytd-action-companion-ad-renderer',
      'ytd-player-legacy-desktop-watch-ads-renderer', 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
      '#masthead-ad', '#player-ads', '.ytd-merch-shelf-renderer', 'ytd-merch-shelf-renderer',
      'ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)', 'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
      '.ytp-ad-module', '.ytp-ad-overlay-container', '.ytp-ad-image-overlay', '.video-ads',
      'ytm-promoted-sparkles-web-renderer', 'ytm-companion-ad-renderer', 'ad-slot-renderer',
      'ytd-enforcement-message-view-model', 'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
    ];
    var host = currentReal().hostname;
    var isYT = /(^|\.)(youtube\.com|youtube-nocookie\.com)$/i.test(host);
    try {
      var st = document.createElement('style');
      st.setAttribute('data-px', 'adblock');
      st.textContent = (isYT ? AD_CSS.concat(YT_CSS) : AD_CSS).join(',\n') + '{display:none!important}';
      (document.head || document.documentElement).appendChild(st);
    } catch (e) {}

    if (isYT) {
      // Backup for ad data that reaches the page some other way (the server
      // already strips it from YouTube's API responses and embedded data).
      var YT_AD_KEYS = { adPlacements: 1, playerAds: 1, adSlots: 1, adBreakHeartbeatParams: 1, enforcementMessageViewModel: 1 };
      var prune = function (o, d) {
        if (!o || typeof o !== 'object' || d > 60) return;
        for (var k in o) {
          if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
          if (YT_AD_KEYS[k]) { try { delete o[k]; } catch (e) {} }
          else if (o[k] && typeof o[k] === 'object') prune(o[k], d + 1);
        }
      };
      var nativeParse = JSON.parse;
      JSON.parse = function () {
        var r = nativeParse.apply(this, arguments);
        try {
          // Only whole player/page responses. Never the player's ad-break answers
          // (no videoDetails/playerResponse): stripping those makes it re-ask in a loop.
          if (r && typeof r === 'object' && (r.videoDetails || r.playerResponse) && (r.adPlacements || r.playerAds || r.adSlots || r.playerResponse)) prune(r, 0);
        } catch (e) {}
        return r;
      };

      // Last resort: if a video ad still starts, mute it and press Skip. A short,
      // separate ad clip is jumped to its end once; nothing else is touched.
      // (Speeding the video up or seeking repeatedly makes Chrome's media
      // pipeline fetch and decode far faster than normal and can crash the tab
      // when YouTube splices the ad into the video's own stream.)
      var SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button';
      var adState = null; // { v, muted, jumped } while an ad is being handled
      setInterval(function () {
        try {
          var player = document.querySelector('.html5-video-player');
          var inAd = !!player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
          var v = player && player.querySelector('video');
          if (inAd && v) {
            if (!adState || adState.v !== v) adState = { v: v, muted: v.muted, jumped: false };
            if (!v.muted) v.muted = true;
            if (!adState.jumped && isFinite(v.duration) && v.duration > 0 && v.duration <= 60 && v.currentTime < v.duration - 1) {
              adState.jumped = true;
              v.currentTime = v.duration - 0.1;
            }
            var b = document.querySelector(SKIP);
            if (b) b.click();
          } else if (adState) {
            try { adState.v.muted = adState.muted; } catch (e2) {}
            adState = null;
          }
          // Close the "ad blockers are not allowed" dialog if it ever appears.
          var enf = document.querySelector('ytd-enforcement-message-view-model');
          if (enf) {
            var dlg = enf.closest('tp-yt-paper-dialog');
            var blocking = !!dlg;
            (dlg || enf).remove(); // removed, so this runs once per popup
            var bd = document.querySelector('tp-yt-iron-overlay-backdrop');
            if (bd) bd.remove();
            // The popup pauses the video; resume it once (never fight the user's own pause).
            var mv = document.querySelector('#movie_player video');
            if (blocking && mv && mv.paused) mv.play().catch(function () {});
          }
        } catch (e) {}
      }, 250);
    }
  }

  // --------------------------------------------------------------------------
  // Tell the proxy UI (if we're displayed inside it) where we are.

  function report(type) {
    try {
      // Only the UI shell listens (it checks the message source); nested
      // frames posting to a proxied parent page are simply ignored there.
      if (window.parent === window) return;
      window.parent.postMessage(
        { __px: 1, type: type || 'nav', url: currentReal().href, title: document.title || '' },
        cfg.mode === 'sandbox' ? '*' : proxyOrigin,
      );
    } catch (e) {}
  }
  report('nav');
  document.addEventListener('DOMContentLoaded', function () {
    report('nav');
    try {
      var titleEl = document.querySelector('title');
      if (titleEl) new MutationObserver(function () { report('nav'); }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {}
  });
  window.addEventListener('load', function () {
    report('loaded');
  });
  window.addEventListener('popstate', function () {
    report('nav');
  });
  window.addEventListener('hashchange', function () {
    report('nav');
  });
  window.addEventListener('pagehide', function () {
    report('unload');
  });
})();
