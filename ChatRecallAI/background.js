/**
 * ChatRecall AI - Background Service Worker (Manifest V3)
 * Coordinates multi-platform search, manages Chrome tabs without duplicates,
 * handles script injection, and enforces platform limits and security boundaries.
 */

import './utils.js';

const utils = globalThis.ChatRecallUtils;

const PLATFORM_CONFIG = {
  chatgpt: {
    name: 'ChatGPT',
    urlMatches: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
    homeUrl: 'https://chatgpt.com/'
  },
  claude: {
    name: 'Claude',
    urlMatches: ['*://claude.ai/*', '*://*.claude.ai/*'],
    homeUrl: 'https://claude.ai/'
  },
  perplexity: {
    name: 'Perplexity',
    urlMatches: ['*://www.perplexity.ai/*', '*://perplexity.ai/*'],
    homeUrl: 'https://www.perplexity.ai/'
  }
};

/**
 * Finds all open browser tabs matching a platform's URL patterns.
 */
async function getTabsForPlatform(platformKey) {
  const config = PLATFORM_CONFIG[platformKey];
  if (!config) return [];

  const allTabs = [];
  for (const matchPattern of config.urlMatches) {
    try {
      const tabs = await chrome.tabs.query({ url: matchPattern });
      tabs.forEach(t => {
        if (!allTabs.some(existing => existing.id === t.id)) {
          allTabs.push(t);
        }
      });
    } catch (e) {
      console.warn(`Query failed for pattern ${matchPattern}:`, e);
    }
  }
  return allTabs;
}

/**
 * Injects content script and utils into a tab if not already present.
 */
async function ensureContentScriptInjected(tabId) {
  try {
    // Ping to see if already responding
    const response = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
    if (response && response.pong) {
      return true;
    }
  } catch {
    // Needs injection
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['utils.js', 'content.js']
    });
    // Brief settle time
    await new Promise(r => setTimeout(r, 150));
    return true;
  } catch (err) {
    console.warn(`Failed to inject script into tab ${tabId}:`, err);
    return false;
  }
}

/**
 * Searches a single platform by querying its open tabs or returning honest state.
 */
async function searchPlatform(platformKey, subject, keywords, maxCount, demoMode) {
  const config = PLATFORM_CONFIG[platformKey];
  if (!config) {
    return {
      success: false,
      platform: platformKey,
      status: 'ERROR',
      message: 'Unknown platform requested'
    };
  }

  const tabs = await getTabsForPlatform(platformKey);

  // If live tabs exist, query the most active/relevant tab
  if (tabs.length > 0) {
    const targetTab = tabs[0];
    const injected = await ensureContentScriptInjected(targetTab.id);

    if (injected) {
      try {
        const response = await chrome.tabs.sendMessage(targetTab.id, {
          action: 'SEARCH_CONVERSATIONS',
          subject,
          keywords,
          maxCount
        });

        if (response) {
          // If live matches found, return them
          if (response.matches && response.matches.length > 0) {
            return {
              ...response,
              platform: platformKey,
              platformName: config.name,
              tabId: targetTab.id,
              isLive: true
            };
          }

          // If signed in but no matches found in visible history
          if (response.status === 'NO_MATCHES') {
            return {
              ...response,
              platform: platformKey,
              platformName: config.name,
              tabId: targetTab.id,
              isLive: true
            };
          }

          // If sign in required
          if (response.status === 'SIGN_IN_REQUIRED') {
            return {
              ...response,
              platform: platformKey,
              platformName: config.name,
              isLive: true
            };
          }
        }
      } catch (err) {
        console.warn(`Error messaging content script on tab ${targetTab.id}:`, err);
      }
    }
  }

  // If no live tab was found or live tab couldn't be read:
  // If demo mode is active (useful for hackathon demo and testing):
  if (demoMode && utils) {
    const sampleAll = utils.getSampleConversations(subject);
    const platformSamples = sampleAll
      .filter(c => c.platform === platformKey)
      .slice(0, maxCount);

    return {
      success: true,
      platform: platformKey,
      platformName: config.name,
      status: platformSamples.length > 0 ? 'MATCHES_FOUND' : 'NO_MATCHES',
      matches: platformSamples,
      totalScanned: platformSamples.length,
      isDemo: true,
      manualSearchUrl: getPlatformSearchUrl(platformKey, subject),
      message: `Demonstration dataset (No active signed-in ${config.name} tab detected)`
    };
  }

  // Honest access state: Tab not open
  return {
    success: false,
    platform: platformKey,
    platformName: config.name,
    status: 'TAB_NOT_OPEN',
    message: `No active ${config.name} tab detected. Open ${config.name} and sign in to scan your conversation history.`,
    homeUrl: config.homeUrl,
    manualSearchUrl: getPlatformSearchUrl(platformKey, subject),
    matches: [],
    totalScanned: 0
  };
}

/**
 * Generates platform fallback direct search URL
 */
function getPlatformSearchUrl(platform, subject) {
  const enc = encodeURIComponent(subject || '');
  if (platform === 'perplexity') {
    return `https://www.perplexity.ai/search?q=${enc}`;
  }
  if (platform === 'chatgpt') {
    return `https://chatgpt.com/?q=${enc}`;
  }
  if (platform === 'claude') {
    return `https://claude.ai/`;
  }
  return 'https://google.com';
}

/**
 * Checks all currently open tabs across all windows to avoid duplicates.
 */
async function getAllOpenTabUrls() {
  const allTabs = await chrome.tabs.query({});
  const urlMap = new Map();
  allTabs.forEach(t => {
    if (t.url) {
      urlMap.set(utils.canonicalizeUrl(t.url), t);
    }
  });
  return urlMap;
}

/**
 * Opens a conversation URL in a tab, focusing it if already open.
 */
async function openOrFocusConversation(url) {
  if (!url) return { success: false, error: 'Empty URL' };
  const cleanUrl = utils.canonicalizeUrl(url);

  const openUrls = await getAllOpenTabUrls();
  const existingTab = openUrls.get(cleanUrl);

  if (existingTab && existingTab.id) {
    // Focus existing tab
    await chrome.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    return { success: true, focused: true, tabId: existingTab.id };
  }

  // Create new tab
  const newTab = await chrome.tabs.create({ url: cleanUrl, active: true });
  return { success: true, focused: false, tabId: newTab.id };
}

/**
 * Opens multiple conversation URLs in separate tabs without duplicates.
 */
async function openBatchConversations(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { openedCount: 0, skippedCount: 0 };
  }

  const openUrls = await getAllOpenTabUrls();
  let openedCount = 0;
  let skippedCount = 0;
  const openedTabIds = [];

  for (const rawUrl of urls) {
    const clean = utils.canonicalizeUrl(rawUrl);
    if (!clean) continue;

    if (openUrls.has(clean)) {
      skippedCount++;
    } else {
      try {
        const tab = await chrome.tabs.create({ url: clean, active: false });
        openUrls.set(clean, tab);
        openedTabIds.push(tab.id);
        openedCount++;
        // Minor throttle to ensure browser handles multiple tabs gracefully
        await new Promise(r => setTimeout(r, 60));
      } catch (e) {
        console.error('Error creating tab for URL:', clean, e);
      }
    }
  }

  return { openedCount, skippedCount, tabIds: openedTabIds };
}

// Runtime message listener for popup and content script requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;

  if (action === 'SEARCH_ALL_PLATFORMS') {
    const { subject, selectedPlatforms, maxCounts, keywordExpansion, demoMode } = request;
    const keywords = keywordExpansion && utils ? utils.generateKeywords(subject) : [];

    const platforms = ['chatgpt', 'claude', 'perplexity'].filter(p => selectedPlatforms[p]);

    // Search all selected platforms concurrently
    Promise.all(
      platforms.map(p =>
        searchPlatform(p, subject, keywords, (maxCounts && maxCounts[p]) || 3, demoMode)
      )
    )
      .then(results => {
        sendResponse({
          success: true,
          subject,
          keywords,
          results
        });
      })
      .catch(err => {
        sendResponse({
          success: false,
          error: err.message || 'Search execution failed'
        });
      });

    return true; // Keep message channel open for async response
  }

  if (action === 'OPEN_SINGLE_CONVERSATION') {
    openOrFocusConversation(request.url)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'OPEN_BATCH_CONVERSATIONS') {
    openBatchConversations(request.urls)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'OPEN_PLATFORM_TAB') {
    const config = PLATFORM_CONFIG[request.platform];
    const url = request.url || (config ? config.homeUrl : 'https://chatgpt.com/');
    chrome.tabs.create({ url, active: true }).then(tab => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  return false;
});
