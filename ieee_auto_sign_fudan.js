// ==UserScript==
// @name         IEEE Auto Sign For Fudan
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Detects the "Institutional Sign In" link and redirects IEEE abstract and document pages to the Fudan login page. Stops after 3 attempts to prevent infinite loops.
// @match        *://ieeexplore.ieee.org/abstract/document/*
// @match        *://ieeexplore.ieee.org/document/*
// @match        *://ieeexplore.ieee.org/*
// @grant        none
// ==/UserScript==

(function () {
    if (window.institutionShown) {
        return;
    }

    // Query for the institutional sign in link
    const instLink = document.querySelector('a.inst-sign-in');

    if (instLink) {
        // Construct a unique key for the current page to track redirect attempts
        const pathKey = 'ieee_redirect_count_' + window.location.pathname;
        
        // Get the current redirect count for this page, default to 0
        let redirectCount = parseInt(window.sessionStorage.getItem(pathKey) || '0', 10);

        // Check if the redirect has already been performed 3 times
        if (redirectCount >= 3) {
            console.warn('IEEE Auto Sign: already been performed 3 times');
            return;
        }

        // Increment and store the redirect count
        window.sessionStorage.setItem(pathKey, redirectCount + 1);
        window.institutionShown = true;

        // Construct the redirect URL for Fudan University
        const redirectUrl = `https://ieeexplore.ieee.org/servlet/wayf.jsp?entityId=https://idpfudan.fudan.edu.cn/idp/shibboleth&url=${encodeURIComponent(window.location.href)}`;

        // Redirect to the desired location
        window.location.href = redirectUrl;
    }
})();
