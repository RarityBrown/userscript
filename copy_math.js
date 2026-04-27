// ==UserScript==
// @name         One-Click Formula Copier
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Click to copy equations as raw LaTeX on Wikipedia, Wikiwand, Zhihu, CSDN, and IEEE Xplore
// @author       Rarity, Codex
// @credit       flaribbit, jasongzy
// @match        http://*.wikipedia.org/*
// @match        https://*.wikipedia.org/*
// @match        http://www.wikiwand.com/*
// @match        https://www.wikiwand.com/*
// @match        https://www.zhihu.com/*
// @match        https://zhuanlan.zhihu.com/p/*
// @match        https://blog.csdn.net/*/article/*
// @match        https://ieeexplore.ieee.org/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const host = document.location.host;
    const CLICK_TITLE = 'Click to copy formula';
    const BOUND_ATTR = 'latexCopyBound';

    const style = document.createElement('style');
    style.textContent = `
        @keyframes aniclick {
            0% { background: #03A9F400; }
            20% { background: #03A9F47F; }
            100% { background: #03A9F400; }
        }
    `;
    document.head.appendChild(style);

    function clearAnimation() {
        this.style.animation = '';
    }

    function copyText(text, el) {
        navigator.clipboard.writeText(text);
        el.style.animation = 'aniclick .4s';
    }

    function markClickable(el, handler) {
        if (el.dataset[BOUND_ATTR] === '1') return;

        el.dataset[BOUND_ATTR] = '1';
        el.onclick = handler;
        el.addEventListener('animationend', clearAnimation);
        el.title = CLICK_TITLE;
        el.style.cursor = 'pointer';
    }

    function observeDynamicContent(scan) {
        let scheduled = false;

        function scheduleScan() {
            if (scheduled) return;

            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                scan();
            });
        }

        scan();

        const target = document.body || document.documentElement;
        const observer = new MutationObserver(scheduleScan);

        observer.observe(target, {
            childList: true,
            subtree: true
        });

        document.addEventListener('visibilitychange', scheduleScan);
    }

    function scanWikipedia() {
        const eqs = document.querySelectorAll(
            '.mwe-math-fallback-image-inline, .mwe-math-fallback-image-display'
        );

        for (const eq of eqs) {
            markClickable(eq, function () {
                if (!this.alt) return;
                copyText(this.alt, this);
            });
        }
    }

    function scanWikiwand() {
        const eqs = document.querySelectorAll('.mwe-math-element');

        for (const eq of eqs) {
            markClickable(eq, function () {
                const math = this.getElementsByTagName('math')[0];
                if (!math) return;

                const tex = math.getAttribute('alttext');
                if (!tex) return;

                copyText(tex, this);
            });
        }
    }

    function scanZhihu() {
        if (document.visibilityState !== 'visible') return;

        const eqs = document.querySelectorAll('.ztext-math');

        for (const eq of eqs) {
            markClickable(eq, function () {
                const tex = this.getAttribute('data-tex');
                if (!tex) return;

                copyText(tex, this);
            });
        }
    }

    function scanCsdn() {
        const eqs = document.querySelectorAll('.katex');

        for (const eq of eqs) {
            markClickable(eq, function () {
                const annotation = this.querySelector('annotation');
                if (!annotation) return;

                const tex = annotation.textContent.trim();
                if (!tex) return;

                copyText(tex, this);
            });
        }
    }

    function cleanIEEEText(text) {
        return (text || '').replace(/\u00a0/g, ' ').trim();
    }

    function getIEEELatex(root) {
        const source = root.querySelector('tex-math script[type^="math/tex"], script[type^="math/tex"]');
        if (source) {
            const tex = cleanIEEEText(source.textContent);
            if (tex) return tex;
        }

        const fallback = root.querySelector('.tex.tex2jax_ignore');
        if (!fallback) return '';

        return cleanIEEEText(fallback.textContent);
    }

    function getIEEEClickTarget(root) {
        return root.querySelector('.MathJax_Display, .MathJax, .formula') || root;
    }

    function scanIEEE() {
        const eqs = document.querySelectorAll('inline-formula, disp-formula, tex-math');

        for (const eq of eqs) {
            const root = eq.closest('inline-formula, disp-formula') || eq;
            const tex = getIEEELatex(root);
            if (!tex) continue;

            const target = getIEEEClickTarget(root);
            markClickable(target, function () {
                copyText(tex, this);
            });
        }
    }

    const siteAdapters = [
        {
            name: 'Wikipedia',
            matches: () => host.includes('wikipedia'),
            start: () => scanWikipedia()
        },
        {
            name: 'Wikiwand',
            matches: () => host.includes('wikiwand'),
            start: () => observeDynamicContent(scanWikiwand)
        },
        {
            name: 'Zhihu',
            matches: () => host.includes('zhihu'),
            start: () => {
                observeDynamicContent(scanZhihu);
                setTimeout(scanZhihu, 3000);
            }
        },
        {
            name: 'CSDN',
            matches: () => host.includes('blog.csdn'),
            start: () => scanCsdn()
        },
        {
            name: 'IEEE',
            matches: () => host.includes('ieeexplore.ieee.org'),
            start: () => observeDynamicContent(scanIEEE)
        }
    ];

    const adapter = siteAdapters.find(site => site.matches());

    if (adapter) {
        adapter.start();
    }
})();
