// ==UserScript==
// @name         IEEE SSCS Resource Center Auto Downloader
// @namespace    http://tampermonkey.net/
// @version      0.10
// @description  Auto-download videos, slides, and transcripts from IEEE SSCS Resource Center (if you have access to)
// @author       Rarity
// @match        https://resourcecenter.sscs.ieee.org/education/*
// @grant        GM_download
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    // Configuration with default value
    let downloadMode = GM_getValue('downloadMode', 'auto'); // Default: auto
    let resourcesFound = { // Keep track of found resources
        video: false,
        slides: false,
        transcript: false
    };

    // Register menu commands for user settings
    GM_registerMenuCommand('Set Download Mode: Pause Sniffing', () => {
        GM_setValue('downloadMode', 'pause');
        downloadMode = 'pause';
        alert('Download mode set to: Pause Sniffing');
    });

    GM_registerMenuCommand('Set Download Mode: Notify for Manual Download', () => {
        GM_setValue('downloadMode', 'notify');
        downloadMode = 'notify';
        alert('Download mode set to: Notify for Manual Download');
    });

    GM_registerMenuCommand('Set Download Mode: Automatic Download', () => {
        GM_setValue('downloadMode', 'auto');
        downloadMode = 'auto';
        alert('Download mode set to: Automatic Download');
    });

    function sanitizeFilename(str) {
        return str.replace(/[/\\?%*:|"<>]/g, '-');
    }

    function extractResourceID(str) {
        const match = str.match(/SSCS[A-Z]*\d+/i);
        return match ? match[0] : '';
    }

    function extractVideoInfo(iframeDocument) {
        console.log("extractVideoInfo called");
        const videoTitle = document.querySelector('.card-title a span')?.textContent;
        const author = document.querySelector('.h4.fw-normal')?.textContent;

        // Extract resourceID from various possible sources
        let resourceID = '';
        if (iframeDocument) {
            const poster = iframeDocument.querySelector('video')?.getAttribute('poster');
            if (poster) {
                resourceID = extractResourceID(poster);
            }
        }
        if (!resourceID) {
            const pdfLink = document.querySelector('.download-pdf a')?.href;
            if (pdfLink) {
                resourceID = extractResourceID(pdfLink);
            }
        }

        // Extract year, prefer the first four digits of resourceID if it starts with SSCS, fallback to web page
        let year = '';
        if (resourceID.startsWith('SSCS')) {
            const potentialYearMatch = resourceID.match(/\d{4}/); // Match the first 4-digit number
            if (potentialYearMatch) {
                const potentialYear = potentialYearMatch[0];
                if (potentialYear >= 1950 && potentialYear <= new Date().getFullYear()) {
                    year = potentialYear;
                }
            }
        }
        if (!year) {
            // Fallback: Extract year from the date string on the page
            const dateString = document.querySelector('.card-text .col-12.mb-0.h5')?.textContent.trim();
            const yearMatch = dateString.match(/\d{4}/); // Match a 4-digit number (year)
            year = yearMatch ? yearMatch[0] : '';
        }

        console.log("Extracted Info:", { videoTitle, author, year, resourceID });
        return { videoTitle, author, year, resourceID };
    }

    function getDownloadLink(iframeDocument) {
        console.log("getDownloadLink called");
        try {
            const videoElement = iframeDocument.querySelector('video source');
            if (videoElement) {
                console.log("Video element found:", videoElement);
                return videoElement.src;
            } else {
                console.log("Video element not found");
                return null;
            }
        } catch (error) {
            console.error("Error in getDownloadLink:", error);
            return null;
        }
    }

    function downloadResource(url, filename) {
        console.log("downloadResource called with:", url, filename);

        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            responseType: 'blob',
            onload: function (response) {
                if (response.status >= 200 && response.status < 300) {
                    const blob = response.response;
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = filename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    console.error('Download error:', response.status, response.statusText);
                    GM_notification({
                        text: `Error downloading resource. Status: ${response.status}`,
                        title: 'Download Error',
                        timeout: 5000,
                    });
                }
            },
            onerror: (err) => {
                console.error('Download error:', err);
                GM_notification({
                    text: 'Error downloading resource. Check console for details.',
                    title: 'Download Error',
                    timeout: 5000,
                });
            }
        });
    }

    function handleResourceLoaded(resourceLink, resourceType, iframeDocument) {
        console.log("handleResourceLoaded called with:", resourceLink, resourceType);

        // Stop checking for this resource type
        resourcesFound[resourceType] = true;

        const { videoTitle, author, year, resourceID } = extractVideoInfo(iframeDocument);
        const extension = resourceLink.split('.').pop().split('?')[0];

        // Sanitize the filename components
        const sanitizedTitle = sanitizeFilename(videoTitle);
        const sanitizedAuthor = sanitizeFilename(author);

        // Determine conference type based on resourceID
        let conferenceType = "ISSCC"; // Default to ISSCC
        if (resourceID.toUpperCase().includes("SSCS")) {
            if (resourceID.toUpperCase().includes("SSCSCICC")) {
                conferenceType = "CICC";
            } else if (resourceID.toUpperCase().includes("SSCSVLSI")) {
                conferenceType = "VLSI";
            }
        }

        // Construct the filename
        let filename = `${conferenceType} ${year} - Tx - ${sanitizedTitle}, ${sanitizedAuthor}`;
        if (resourceID) {
            filename += `, ${resourceID}`;
        }
        filename += `.${extension}`;

        if (downloadMode === 'auto') {
            downloadResource(resourceLink, filename);
        } else if (downloadMode === 'notify') {
            GM_notification({
                text: `${resourceType.toUpperCase()} found: ${filename}\nClick to download.`,
                title: `${resourceType.toUpperCase()} Download Ready`,
                timeout: 10000,
                onclick: () => {
                    downloadResource(resourceLink, filename);
                }
            });
        } else if (downloadMode === 'pause') {
            console.log("Sniffing paused. No action taken.");
        }
    }

    // Function to check for resources periodically
    function checkForResources() {
        if (downloadMode === 'pause') {
            console.log("Sniffing paused. Skipping resource check.");
            return; // Skip checking if paused
        }
        const iframeElement = document.querySelector('.product-accessible iframe');

        //Slides and Transcripts are PDF files
        const pdfLinkElement = document.querySelector('.download-pdf a');

        // Handle Video
        if (iframeElement && !resourcesFound.video) {
            console.log("iframe found:", iframeElement);
            const iframeDocument = iframeElement.contentDocument || iframeElement.contentWindow.document;
            const videoLink = getDownloadLink(iframeDocument);

            if (videoLink) {
                handleResourceLoaded(videoLink, 'video', iframeDocument);
            } else {
                const observer = new MutationObserver((mutations) => {
                    console.log("MutationObserver triggered:", mutations);
                    const updatedVideoLink = getDownloadLink(iframeDocument);
                    if (updatedVideoLink) {
                        handleResourceLoaded(updatedVideoLink, 'video', iframeDocument);
                        observer.disconnect(); // Stop observing after finding the video
                    }
                });

                const targetNode = document.querySelector('.product-accessible');
                if (targetNode) {
                    console.log("Starting MutationObserver on specific target");
                    observer.observe(targetNode, { childList: true, subtree: true });
                    console.log("MutationObserver started");
                } else {
                    console.log("Target node '.product-accessible' not found. Observing document.body instead.");
                    observer.observe(document.body, { childList: true, subtree: true });
                    console.log("MutationObserver started on document.body");
                }
            }
        }

        // Handle Slides and Transcripts
        if (pdfLinkElement && (!resourcesFound.slides || !resourcesFound.transcript)) {
            const pdfLink = pdfLinkElement.href;
            // Check if the link is for slides or transcript based on URL or filename
            if (pdfLink.includes('slides')) {
                if (!resourcesFound.slides) {
                    handleResourceLoaded(pdfLink, 'slides', null);
                }
            } else {
                // Assuming any other PDF link is a transcript if not identified as slides
                if (!resourcesFound.transcript) {
                    handleResourceLoaded(pdfLink, 'transcript', null);
                }
            }
        }
    }

    // Start checking for resources periodically
    console.log("Starting interval to check for resources");
    const resourceCheckInterval = setInterval(checkForResources, 500); // Check every 500ms
    console.log("Interval started");

})();
