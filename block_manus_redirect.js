// ==UserScript==
// @name         Block manus.im redirect to /verify-phone
// @namespace    https://manus.im/
// @version      1.0
// @description  Prevent the page from redirecting to /verify-phone, by intercepting the fetch requests.
// @author       Andy
// @match        https://manus.im/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BLOCKED_PATH = '/verify-phone';
    const SCRIPT_NAME = '[Block Redirect]';

    if (window.redirectBlockerInitialized) return;
    window.redirectBlockerInitialized = true;

    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = (input instanceof Request) ? input.url : String(input);
        try {
            if (new URL(url, location.href).pathname.startsWith(BLOCKED_PATH)) {
                return new Promise(() => {});
            }
        } catch (e) {
        }

        return originalFetch.apply(this, arguments);
    };
})();
