// ==UserScript==
// @name         IEEE SSCS Resource Center Link Identifier
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add emoji or styled text to specific links based on path criteria
// @author       Rarity
// @match        https://resourcecenter.sscs.ieee.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const PATH_REGEX = /^\/education\/[^/]+\/[^/]+$/;

    function getPrefixInfo(string1, string2) {
        const tests = [
            { regex: /cicc/i, type: 'html', content: 'CICC:', color: '#008000' },
            { regex: /vlsi/i, type: 'html', content: 'VLSI:', color: '#FF0000' },
            { regex: /webinars/i, type: 'text', emoji: '🌐 ' },
            { regex: /lecture/i, type: 'text', emoji: '👨‍🏫 ' },
            { regex: /podcast/i, type: 'text', emoji: '🎙️ ' },
        ];

        for (const test of tests) {
            if (test.regex.test(string1) || test.regex.test(string2)) {
                return test;
            }
        }
        return { type: 'text', emoji: '🆗 ' };
    }

    const processLinks = (root = document) => {
        root.querySelectorAll('a').forEach(link => {
            if (!PATH_REGEX.test(link.pathname)) return;
            if (link.querySelector('img')) return;

            const pathParts = link.pathname.split('/');
            const string1 = (pathParts[2] || '').trim();
            const string2 = (pathParts[3] || '').trim();

            const prefixInfo = getPrefixInfo(string1, string2);

            let existingPrefix = null;
            if (link.firstChild) {
                if (link.firstChild.nodeType === Node.ELEMENT_NODE && link.firstChild.dataset.prefix) {
                    existingPrefix = link.firstChild;
                } else if (link.firstChild.nodeType === Node.TEXT_NODE) {
                    const emojiList = ['🌐 ', '👨‍🏫 ', '🎙️ ', '🆗 '];
                    if (emojiList.some(e => link.firstChild.textContent.startsWith(e))) {
                        existingPrefix = link.firstChild;
                    }
                }
            }
            if (existingPrefix) link.removeChild(existingPrefix);

            if (prefixInfo.type === 'html') {
                const span = document.createElement('span');
                span.dataset.prefix = 'true';
                span.style.color = prefixInfo.color;
                span.style.fontWeight = '700';
                span.textContent = prefixInfo.content + ' ';
                link.prepend(span);
            } else {
                link.prepend(document.createTextNode(prefixInfo.emoji));
            }
        });
    };

    const handleIframe = (iframe) => {
        const initIframeContent = () => {
            try {
                processLinks(iframe.contentDocument);
                createObserver(iframe.contentDocument);
            } catch (e) {}
        };

        if (iframe.contentDocument?.readyState === 'complete') {
            initIframeContent();
        } else {
            iframe.addEventListener('load', initIframeContent);
        }
    };

    const createObserver = (target = document) => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(({ addedNodes }) => {
                addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'IFRAME') handleIframe(node);
                    else processLinks(node);
                });
            });
        });

        observer.observe(target.documentElement, {
            childList: true,
            subtree: true
        });

        return observer;
    };

    processLinks();
    createObserver();
})();
