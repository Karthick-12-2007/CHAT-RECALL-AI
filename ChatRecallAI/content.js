/**
 * ChatRecall AI - Content Script
 * Executes safely within ChatGPT, Claude, and Perplexity web pages.
 * Inspects visible conversation history, detects authentication status,
 * filters matching subjects using ChatRecallUtils, and responds to extension queries.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__CHAT_RECALL_CONTENT_SCRIPT_LOADED__) {
    return;
  }
  window.__CHAT_RECALL_CONTENT_SCRIPT_LOADED__ = true;

  const utils = window.ChatRecallUtils || (typeof globalThis !== 'undefined' ? globalThis.ChatRecallUtils : null);

  /**
   * Identifies the current AI platform from hostname.
   */
  function getCurrentPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('chatgpt.com') || host.includes('openai.com')) {
      return 'chatgpt';
    }
    if (host.includes('claude.ai')) {
      return 'claude';
    }
    if (host.includes('perplexity.ai')) {
      return 'perplexity';
    }
    return 'unknown';
  }

  /**
   * Determines if the user is authenticated on the current platform.
   */
  function checkAuthStatus(platform) {
    const bodyText = document.body ? document.body.innerText : '';

    if (platform === 'chatgpt') {
      // Signed-in checks: prompt textarea, user profile button, or conversation history links
      const hasPromptBox = Boolean(document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]'));
      const hasNav = Boolean(document.querySelector('nav') || document.querySelector('a[href^="/c/"]'));
      const hasProfile = Boolean(document.querySelector('button[data-testid="profile-button"]') || document.querySelector('img[alt*="User"]'));
      const hasLoginPrompt = Boolean(document.querySelector('a[href*="/login"]') || document.querySelector('button[data-testid="login-button"]'));

      const isSignedIn = (hasPromptBox || hasNav || hasProfile) && !hasLoginPrompt;
      return {
        platform,
        isSignedIn,
        canAccessHistory: hasNav || Boolean(document.querySelector('a[href^="/c/"]')),
        url: window.location.href
      };
    }

    if (platform === 'claude') {
      const hasChatInput = Boolean(document.querySelector('div[contenteditable="true"]') || document.querySelector('fieldset'));
      const hasNav = Boolean(document.querySelector('nav') || document.querySelector('a[href*="/chat/"]'));
      const hasUserMenu = Boolean(document.querySelector('button[aria-label*="User"]') || document.querySelector('button[aria-label*="account"]'));
      const hasLoginPrompt = Boolean(document.querySelector('a[href*="/login"]') || document.querySelector('button[data-testid="login-button"]'));

      const isSignedIn = (hasChatInput || hasNav || hasUserMenu) && !hasLoginPrompt;
      return {
        platform,
        isSignedIn,
        canAccessHistory: hasNav || Boolean(document.querySelector('a[href*="/chat/"]')),
        url: window.location.href
      };
    }

    if (platform === 'perplexity') {
      const hasInput = Boolean(document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]'));
      const hasHistory = Boolean(document.querySelector('a[href*="/search/"]') || document.querySelector('a[href*="/thread/"]') || document.querySelector('a[href*="/library"]'));
      const hasLogin = bodyText.includes('Sign in to continue') || Boolean(document.querySelector('button:has-text("Sign In")'));

      const isSignedIn = (hasInput || hasHistory) && !hasLogin;
      return {
        platform,
        isSignedIn,
        canAccessHistory: hasHistory,
        url: window.location.href
      };
    }

    return {
      platform,
      isSignedIn: false,
      canAccessHistory: false,
      url: window.location.href
    };
  }

  /**
   * Scrapes visible conversation links and titles from ChatGPT.
   */
  function scrapeChatGPTConversations() {
    const results = [];
    const seenUrls = new Set();

    // Selectors for ChatGPT conversation anchors
    const selectors = [
      'nav a[href^="/c/"]',
      'nav a[href*="/c/"]',
      'ol li a[href*="/c/"]',
      'a[data-discover="true"]',
      'a[href*="/c/"]'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach(el => {
      let href = el.getAttribute('href');
      if (!href) return;

      if (!href.startsWith('http')) {
        href = window.location.origin + (href.startsWith('/') ? href : '/' + href);
      }

      if (seenUrls.has(href)) return;

      // Extract title text cleanly
      // Ignore badges, buttons, options dots
      let title = '';
      const titleSpan = el.querySelector('.truncate') || el.querySelector('div.relative') || el.querySelector('span');
      if (titleSpan) {
        title = titleSpan.textContent.trim();
      } else {
        // Fallback to textContent without buttons
        const clone = el.cloneNode(true);
        const buttons = clone.querySelectorAll('button, svg');
        buttons.forEach(b => b.remove());
        title = clone.textContent.trim();
      }

      // Filter out headers like "Today", "Yesterday", "Previous 7 days"
      if (!title || title.length < 2 || title === 'Today' || title === 'Yesterday' || title.startsWith('Previous')) {
        return;
      }

      seenUrls.add(href);
      results.push({
        id: href,
        title,
        url: href,
        platform: 'chatgpt'
      });
    });

    return results;
  }

  /**
   * Scrapes visible conversation links and titles from Claude.
   */
  function scrapeClaudeConversations() {
    const results = [];
    const seenUrls = new Set();

    const selectors = [
      'nav a[href*="/chat/"]',
      'aside a[href*="/chat/"]',
      'a[href*="/chat/"]',
      'a[href^="/chat/"]'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach(el => {
      let href = el.getAttribute('href');
      if (!href) return;

      if (!href.startsWith('http')) {
        href = window.location.origin + (href.startsWith('/') ? href : '/' + href);
      }

      if (seenUrls.has(href)) return;

      let title = '';
      const textContainer = el.querySelector('p') || el.querySelector('span') || el.querySelector('div');
      if (textContainer) {
        title = textContainer.textContent.trim();
      } else {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button, svg').forEach(b => b.remove());
        title = clone.textContent.trim();
      }

      if (!title || title.length < 2 || title.toLowerCase() === 'recents' || title.toLowerCase() === 'chats') {
        return;
      }

      seenUrls.add(href);
      results.push({
        id: href,
        title,
        url: href,
        platform: 'claude'
      });
    });

    return results;
  }

  /**
   * Scrapes visible conversation links and titles from Perplexity.
   */
  function scrapePerplexityConversations() {
    const results = [];
    const seenUrls = new Set();

    const selectors = [
      'a[href*="/search/"]',
      'a[href*="/thread/"]',
      'nav a[href*="/search/"]',
      'aside a[href*="/search/"]'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach(el => {
      let href = el.getAttribute('href');
      if (!href) return;

      if (!href.startsWith('http')) {
        href = window.location.origin + (href.startsWith('/') ? href : '/' + href);
      }

      if (seenUrls.has(href)) return;

      // Extract title
      let title = el.getAttribute('title') || '';
      if (!title) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button, svg, span[class*="badge"]').forEach(b => b.remove());
        title = clone.textContent.trim();
      }

      if (!title || title.length < 2 || title.toLowerCase() === 'library' || title.toLowerCase() === 'discover') {
        return;
      }

      seenUrls.add(href);
      results.push({
        id: href,
        title,
        url: href,
        platform: 'perplexity'
      });
    });

    return results;
  }

  /**
   * Performs the in-page conversation search and matching.
   */
  function searchPageHistory(subject, keywords = [], maxCount = 5) {
    const platform = getCurrentPlatform();
    const auth = checkAuthStatus(platform);

    if (!auth.isSignedIn) {
      return {
        success: false,
        platform,
        status: 'SIGN_IN_REQUIRED',
        message: `Sign in to ${platform.toUpperCase()} to scan past conversations.`,
        matches: [],
        totalScanned: 0
      };
    }

    let allConversations = [];
    if (platform === 'chatgpt') {
      allConversations = scrapeChatGPTConversations();
    } else if (platform === 'claude') {
      allConversations = scrapeClaudeConversations();
    } else if (platform === 'perplexity') {
      allConversations = scrapePerplexityConversations();
    }

    const totalScanned = allConversations.length;
    const matches = [];

    allConversations.forEach(conv => {
      // Match using the shared utils matching logic
      if (utils && typeof utils.matchConversation === 'function') {
        const matchResult = utils.matchConversation(conv.title, subject, keywords);
        if (matchResult.isMatch) {
          matches.push({
            id: conv.id,
            platform,
            title: conv.title,
            url: conv.url,
            matchedKeywords: matchResult.matchedKeywords,
            score: matchResult.score,
            timestamp: Date.now()
          });
        }
      } else {
        // Fallback basic keyword matching if utils not available
        const normTitle = (conv.title || '').toLowerCase();
        const normSub = (subject || '').toLowerCase();
        if (normTitle.includes(normSub)) {
          matches.push({
            id: conv.id,
            platform,
            title: conv.title,
            url: conv.url,
            matchedKeywords: [subject],
            score: 100,
            timestamp: Date.now()
          });
        }
      }
    });

    // Sort by relevance score descending
    matches.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Limit to maxCount
    const limitedMatches = matches.slice(0, maxCount);

    return {
      success: true,
      platform,
      status: limitedMatches.length > 0 ? 'MATCHES_FOUND' : 'NO_MATCHES',
      matches: limitedMatches,
      totalScanned,
      sidebarVisible: totalScanned > 0,
      timestamp: Date.now()
    };
  }

  /**
   * Generates a platform-native search URL or opens search dialog.
   */
  function getManualSearchFallback(platform, subject) {
    const encoded = encodeURIComponent(subject || '');
    if (platform === 'perplexity') {
      return `https://www.perplexity.ai/search?q=${encoded}`;
    }
    if (platform === 'chatgpt') {
      return `https://chatgpt.com/?q=${encoded}`;
    }
    if (platform === 'claude') {
      return `https://claude.ai/`;
    }
    return '';
  }

  // Listen for messages from extension popup or background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      const platform = getCurrentPlatform();

      if (request.action === 'PING') {
        sendResponse({ pong: true, platform, url: window.location.href });
        return true;
      }

      if (request.action === 'CHECK_AUTH') {
        const auth = checkAuthStatus(platform);
        sendResponse(auth);
        return true;
      }

      if (request.action === 'SEARCH_CONVERSATIONS') {
        const { subject, keywords, maxCount } = request;
        const result = searchPageHistory(subject, keywords, maxCount || 5);
        result.manualSearchUrl = getManualSearchFallback(platform, subject);
        sendResponse(result);
        return true;
      }

      if (request.action === 'GET_MANUAL_SEARCH_URL') {
        const url = getManualSearchFallback(platform, request.subject);
        sendResponse({ manualUrl: url });
        return true;
      }
    } catch (err) {
      sendResponse({
        success: false,
        error: err.message || 'Unknown content script error'
      });
    }

    return true; // Keep channel open for async response
  });
})();
