// ==UserScript==
// @name         eetop mobile links formater in search results
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Converts EETop forum mobile links to desktop format in Google search results;
// @author       Rarity
// @match        https://www.google.com/search*
// @match        https://google.com/search*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function processLinks() {
        const links = document.querySelectorAll('a');

        links.forEach(link => {
            if (link.href && link.href.includes('bbs.eetop.cn/forum.php?mod=viewthread&tid=')) {
                // Extract thread ID using regex
                const tidMatch = link.href.match(/tid=(\d+)/);

                if (tidMatch && tidMatch[1]) {
                    const threadId = tidMatch[1];

                    // Extract page number if present
                    let pageNum = 1;
                    const pageMatch = link.href.match(/page=(\d+)/);
                    if (pageMatch && pageMatch[1]) {
                        pageNum = pageMatch[1];
                    }

                    // Create new URL in desktop format
                    const newUrl = `https://bbs.eetop.cn/thread-${threadId}-${pageNum}-1.html`;
                    link.href = newUrl;


                    if (!link.querySelector('.eetop-modified')) {
                        const indicator = document.createElement('span');
                        indicator.className = 'eetop-modified';
                        indicator.style.color = 'green';
                        indicator.style.fontSize = 'x-small';
                        indicator.style.marginLeft = '3px';
                        indicator.textContent = '[desktop]';
                        link.appendChild(indicator);
                    }
                }
            }
        });
    }

    processLinks();
    const observer = new MutationObserver(function(mutations) {
        processLinks();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
