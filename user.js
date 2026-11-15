// ==UserScript==
// @name         Reddit Share Link Cleaner
// @namespace    https://github.com/naveen-devang/redditCleanShareURL/
// @version      1.2
// @description  Auto-strip UTM trackers from Reddit share links on copy
// @author       Naveen Devang
// @license      MIT
// @match        https://*.reddit.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/naveen-devang/redditCleanShareURL/main/user.js
// ==/UserScript==

(function() {
    'use strict';

    // Short share links look like /r/<subreddit>/s/<id> and redirect to the real post or comment
    const SHARE_PATH = /^\/(r|u|user)\/[^/]+\/s\/\w+\/?$/;
    const PERMALINK_PATH = /^\/(r|u|user)\/[^/]+\/comments\//;

    // Remove tracking query params (utm_*, share_id) in place; returns true if any were removed
    function removeTrackingParams(url) {
        const tracking = [...url.searchParams.keys()].filter(name => name.startsWith('utm_') || name === 'share_id');
        tracking.forEach(name => url.searchParams.delete(name));
        return tracking.length > 0;
    }

    // Resolve a /s/ link to the full URL of the post or comment it redirects to. The current page
    // URL is not used: it has no domain, and on a feed or for a comment it points to the wrong place.
    // If the link does not resolve to a post or comment, keep Reddit's /s/ link: it still works.
    async function resolveShareLink(url) {
        const response = await fetch(url.href, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        const resolved = new URL(response.url);
        return PERMALINK_PATH.test(resolved.pathname) ? resolved : url;
    }

    // Clean a Reddit link; any other text is returned unchanged
    async function cleanUrl(text) {
        if (!/^https?:\/\/([\w-]+\.)*reddit\.com\/\S*$/i.test(text.trim())) {
            return text;
        }
        let url = new URL(text.trim());
        if (SHARE_PATH.test(url.pathname)) {
            url = await resolveShareLink(url);
        }
        removeTrackingParams(url);
        return url.href;
    }

    // Override navigator.clipboard.writeText, which Reddit's "Copy link" uses
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        let clean = text;
        if (typeof text === 'string') {
            try {
                clean = await cleanUrl(text);
            } catch (err) {
                console.warn('Could not clean Reddit share URL, copying it unchanged:', err);
            }
        }
        if (clean !== text) {
            console.log('Cleaned Reddit share URL:', clean);
        }
        return originalWriteText.call(this, clean);
    };

    // Fallback: Hook into Reddit's share button events (for older browsers)
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-testid="post-share-button"], .share-button *')) {
            setTimeout(() => {
                const selection = window.getSelection().toString();
                if (selection && (selection.includes('utm_') || selection.includes('/s/'))) {
                    navigator.clipboard.writeText(selection).catch(console.error); // cleaned by the override above
                }
            }, 100); // Small delay for copy to trigger
        }
    }, true);

    // Remove trackers from the address bar when the page was opened from a share link
    const pageUrl = new URL(location.href);
    if (removeTrackingParams(pageUrl)) {
        window.history.replaceState(window.history.state, '', pageUrl.href);
    }
})();
