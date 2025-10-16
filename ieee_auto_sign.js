// ==UserScript==
// @name         IEEE Auto Sign For ECNUer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Detects the "Institutional Sign In" link and redirects IEEE abstract and document pages to the ECNU login page, then auto-clicks the login button
// @match        *://ieeexplore.ieee.org/abstract/document/*
// @match        *://ieeexplore.ieee.org/document/*
// @match        *://ieeexplore.ieee.org/*
// @match        *://idp.ecnu.edu.cn/*
// @grant        none
// ==/UserScript==


(function () {
    // Check if the current page is the ECNU login page
    if (window.location.href.includes('idp.ecnu.edu.cn')) {
        // Fill in the username and password fields
        const usernameField = document.querySelector('#username');
        const passwordField = document.querySelector('#password');
        if (usernameField && passwordField) {
            usernameField.value = ''; // Replace with your actual username (student ID)
            passwordField.value = ''; // Replace with your actual password (student Password)

            // Find the login button and click it
            const loginButton = document.querySelector('button[name="_eventId_proceed"]');
            const loginButton_2 = document.querySelector('input[type="submit"][name="_eventId_proceed"]');
            if (loginButton) {
                loginButton.click();
            } else if (loginButton_2) {
                loginButton_2.click();
            } else {

            }
        }
        return;
    }

    if (window.institutionShown) {
        return;
    }

    // Query for the institutional sign in link
    const instLink = document.querySelector('a.inst-sign-in');

    if (instLink) {
        // Check if the redirect has already been performed
        if (window.sessionStorage.getItem('ieeexploreRedirected')) {
            return;
        }

        // Get the document ID from the URL
        const urlParts = window.location.href.split('/');
        const documentId = urlParts[urlParts.length - 1];

        // Construct the redirect URL
        const redirectUrl = `https://ieeexplore.ieee.org/servlet/wayf.jsp?entityId=https://idp.ecnu.edu.cn/idp/shibboleth&url=${encodeURIComponent(window.location.href)}`;

        // Redirect to the desired location
        window.location.href = redirectUrl;

        // Store the fact that the redirect has been performed
        window.sessionStorage.setItem('ieeexploreRedirected', true);
        window.institutionShown = true;
    }
})();
