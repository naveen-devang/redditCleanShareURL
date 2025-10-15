// ==UserScript==
// @name         Reddit Share Link Cleaner
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-strip UTM trackers from Reddit share links on copy
// @author       You (adapted from UTM stripper gists)
// @match        https://*.reddit.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function cleanUrl(url) {
        return url.split('?')[0].replace(/\/+$/, ''); // Strips query params and trailing slashes
    }

    // Override navigator.clipboard.writeText if available
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        if (window.location.hostname.includes('reddit.com') && text.includes('utm_')) {
            const clean = cleanUrl(text);
            console.log('Cleaned Reddit link:', clean);
            return originalWriteText.call(this, clean);
        }
        return originalWriteText.call(this, text);
    };

    // Fallback: Hook into Reddit's share button events (for older browsers)
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-testid="post-share-button"], .share-button *')) {
            setTimeout(() => {
                const selection = window.getSelection().toString();
                if (selection && selection.includes('utm_')) {
                    const clean = cleanUrl(selection);
                    navigator.clipboard.writeText(clean).catch(console.error);
                }
            }, 100);
        }
    }, true);

    // Clean address bar on load if dirty
    if (window.location.search.includes('utm_')) {
        const clean = cleanUrl(window.location.href);
        window.history.replaceState({}, '', clean);
    }
})();
