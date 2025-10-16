// ==UserScript==
// @name         Paste Image to File Input
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Allows using Ctrl+V to paste images from the clipboard directly into an <input type="file"> element. You need to click the file input first to set it as the target.
// @author       Rarity
// @match        *://*/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let targetFileInput = null;
    document.addEventListener('click', (event) => {
        if (event.target.tagName === 'INPUT' && event.target.type === 'file') {
            targetFileInput = event.target;
        }
        else if (event.target.tagName === 'LABEL' && event.target.htmlFor) {
            const linkedInput = document.getElementById(event.target.htmlFor);
            if (linkedInput && linkedInput.type === 'file') {
                targetFileInput = linkedInput;
            }
        }
    }, true);

    document.addEventListener('paste', (event) => {
        if (!targetFileInput) {
            return;
        }
        const items = (event.clipboardData || window.clipboardData).items;
        if (!items) return;
        let imageFile = null;
        for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                imageFile = item.getAsFile();
                break;
            }
        }
        if (imageFile) {
            event.preventDefault();
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(imageFile);
            targetFileInput.files = dataTransfer.files;
            const changeEvent = new Event('change', {
                bubbles: true,
                cancelable: true
            });
            targetFileInput.dispatchEvent(changeEvent);
        }
    });

})();
