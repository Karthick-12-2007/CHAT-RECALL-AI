/**
 * ChatRecall AI - Popup Logic & User Interface Controller
 * Coordinates user input, live keyword generation, background search messaging,
 * tab opening without duplicates, preference persistence, and honest platform state display.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const utils = window.ChatRecallUtils || (typeof globalThis !== 'undefined' ? globalThis.ChatRecallUtils : null);

  // DOM Elements
  const subjectInput = document.getElementById('subjectInput');
  const btnClearInput = document.getElementById('btnClearInput');
  const quickChips = document.getElementById('quickChips');
  const keywordShelf = document.getElementById('keywordShelf');
  const keywordsList = document.getElementById('keywordsList');
  const keywordCount = document.getElementById('keywordCount');

  // Platforms
  const checkChatgpt = document.getElementById('checkChatgpt');
  const checkClaude = document.getElementById('checkClaude');
  const checkPerplexity = document.getElementById('checkPerplexity');
  const limitChatgpt = document.getElementById('limitChatgpt');
  const limitClaude = document.getElementById('limitClaude');
  const limitPerplexity = document.getElementById('limitPerplexity');
  const cardChatgpt = document.getElementById('cardChatgpt');
  const cardClaude = document.getElementById('cardClaude');
  const cardPerplexity = document.getElementById('cardPerplexity');

  // Actions & Progress
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = document.getElementById('btnSearchText');
  const btnCancel = document.getElementById('btnCancel');
  const progressSection = document.getElementById('progressSection');
  const progressTitle = document.getElementById('progressTitle');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');
  const platformStatusChips = document.getElementById('platformStatusChips');

  // Results & Summaries
  const resultsActionBar = document.getElementById('resultsActionBar');
  const totalMatchesBadge = document.getElementById('totalMatchesBadge');
  const totalMatchesText = document.getElementById('totalMatchesText');
  const btnOpenAll = document.getElementById('btnOpenAll');
  const btnOpenAllText = document.getElementById('btnOpenAllText');
  const btnCopyLinks = document.getElementById('btnCopyLinks');
  const resultsSection = document.getElementById('resultsSection');
  const resultsGroups = document.getElementById('resultsGroups');

  // Empty states
  const initialState = document.getElementById('initialState');
  const noMatchesState = document.getElementById('noMatchesState');
  const noMatchesDesc = document.getElementById('noMatchesDesc');
  const cancelledState = document.getElementById('cancelledState');
  const btnTryBroaderTopic = document.getElementById('btnTryBroaderTopic');

  // Modals & Header
  const btnSettings = document.getElementById('btnSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const modalSettings = document.getElementById('modalSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');

  const btnHelp = document.getElementById('btnHelp');
  const btnCloseHelp = document.getElementById('btnCloseHelp');
  const modalHelp = document.getElementById('modalHelp');
  const btnHelpGotIt = document.getElementById('btnHelpGotIt');

  const globalStatusDot = document.getElementById('globalStatusDot');
  const demoBanner = document.getElementById('demoBanner');
  const btnDisableDemo = document.getElementById('btnDisableDemo');
  const footerDemoToggle = document.getElementById('footerDemoToggle');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Settings inputs
  const settingKeywordExpansion = document.getElementById('settingKeywordExpansion');
  const settingAutoOpen = document.getElementById('settingAutoOpen');
  const settingDemoMode = document.getElementById('settingDemoMode');
  const btnLaunchChatgpt = document.getElementById('btnLaunchChatgpt');
  const btnLaunchClaude = document.getElementById('btnLaunchClaude');
  const btnLaunchPerplexity = document.getElementById('btnLaunchPerplexity');

  // Application State
  let currentSearchQuery = '';
  let currentKeywords = [];
  let isSearching = false;
  let searchAbortController = null;
  let currentResults = []; // Flattened active matches
  let appSettings = {
    maxCounts: { chatgpt: 3, claude: 3, perplexity: 3 },
    platforms: { chatgpt: true, claude: true, perplexity: true },
    keywordExpansion: true,
    autoOpenTabs: false,
    demoMode: false
  };

  /**
   * Shows a temporary toast message.
   */
  function showToast(message, duration = 3000) {
    if (!toastNotification || !toastMessage) return;
    toastMessage.textContent = message;
    toastNotification.style.display = 'block';
    setTimeout(() => {
      toastNotification.style.display = 'none';
    }, duration);
  }

  /**
   * Loads saved settings from Chrome storage or defaults.
   */
  async function loadSettings() {
    if (utils && typeof utils.getStoredSettings === 'function') {
      appSettings = await utils.getStoredSettings();
    }

    // Apply to UI
    if (limitChatgpt) limitChatgpt.value = appSettings.maxCounts.chatgpt || 3;
    if (limitClaude) limitClaude.value = appSettings.maxCounts.claude || 3;
    if (limitPerplexity) limitPerplexity.value = appSettings.maxCounts.perplexity || 3;

    if (checkChatgpt) checkChatgpt.checked = appSettings.platforms.chatgpt !== false;
    if (checkClaude) checkClaude.checked = appSettings.platforms.claude !== false;
    if (checkPerplexity) checkPerplexity.checked = appSettings.platforms.perplexity !== false;

    updateCardActiveState(cardChatgpt, checkChatgpt.checked);
    updateCardActiveState(cardClaude, checkClaude.checked);
    updateCardActiveState(cardPerplexity, checkPerplexity.checked);

    if (settingKeywordExpansion) settingKeywordExpansion.checked = appSettings.keywordExpansion;
    if (settingAutoOpen) settingAutoOpen.checked = appSettings.autoOpenTabs;
    if (settingDemoMode) settingDemoMode.checked = appSettings.demoMode;

    updateDemoBanner(appSettings.demoMode);
  }

  /**
   * Persists current settings to Chrome storage.
   */
  async function saveSettingsFromUI() {
    appSettings.maxCounts = {
      chatgpt: parseInt(limitChatgpt.value, 10) || 3,
      claude: parseInt(limitClaude.value, 10) || 3,
      perplexity: parseInt(limitPerplexity.value, 10) || 3
    };

    appSettings.platforms = {
      chatgpt: checkChatgpt.checked,
      claude: checkClaude.checked,
      perplexity: checkPerplexity.checked
    };

    appSettings.keywordExpansion = settingKeywordExpansion.checked;
    appSettings.autoOpenTabs = settingAutoOpen.checked;
    appSettings.demoMode = settingDemoMode.checked;

    if (utils && typeof utils.saveStoredSettings === 'function') {
      await utils.saveStoredSettings(appSettings);
    }

    updateDemoBanner(appSettings.demoMode);
    showToast('Settings saved successfully');
  }

  function updateCardActiveState(card, isChecked) {
    if (!card) return;
    if (isChecked) {
      card.classList.add('checked');
    } else {
      card.classList.remove('checked');
    }
  }

  function updateDemoBanner(isEnabled) {
    if (demoBanner) {
      demoBanner.style.display = isEnabled ? 'flex' : 'none';
    }
    if (footerDemoToggle) {
      footerDemoToggle.textContent = isEnabled ? 'Disable Demo' : 'Enable Demo';
      footerDemoToggle.style.color = isEnabled ? '#f59e0b' : 'var(--brand-purple)';
    }
  }

  /**
   * Live Keyword Generation on Input
   */
  function handleSubjectInputChange() {
    const val = (subjectInput.value || '').trim();
    currentSearchQuery = val;

    if (btnClearInput) {
      btnClearInput.style.display = val.length > 0 ? 'block' : 'none';
    }

    if (!val || val.length < 3 || !appSettings.keywordExpansion || !utils) {
      if (keywordShelf) keywordShelf.style.display = 'none';
      currentKeywords = [];
      return;
    }

    const keywords = utils.generateKeywords(val);
    currentKeywords = keywords;

    if (keywords.length > 0) {
      if (keywordCount) keywordCount.textContent = keywords.length;
      if (keywordsList) {
        keywordsList.innerHTML = keywords
          .slice(0, 10)
          .map(kw => `<span class="kw-tag">${escapeHtml(kw)}</span>`)
          .join('');
      }
      if (keywordShelf) keywordShelf.style.display = 'flex';
    } else {
      if (keywordShelf) keywordShelf.style.display = 'none';
    }
  }

  /**
   * Initiates the multi-platform conversation search.
   */
  async function performSearch() {
    const rawSubject = (subjectInput.value || '').trim();

    if (!rawSubject) {
      subjectInput.focus();
      showToast('Please enter a subject or topic to recall');
      return;
    }

    const selectedPlatforms = {
      chatgpt: checkChatgpt.checked,
      claude: checkClaude.checked,
      perplexity: checkPerplexity.checked
    };

    const hasAnyPlatform = Object.values(selectedPlatforms).some(Boolean);
    if (!hasAnyPlatform) {
      showToast('Please select at least one platform to search');
      return;
    }

    // Set UI into searching state
    isSearching = true;
    btnSearch.disabled = true;
    btnCancel.disabled = false;
    btnSearchText.textContent = 'Searching...';
    globalStatusDot.className = 'brand-indicator busy';

    // Reset views
    initialState.style.display = 'none';
    noMatchesState.style.display = 'none';
    cancelledState.style.display = 'none';
    resultsActionBar.style.display = 'none';
    resultsGroups.innerHTML = '';
    currentResults = [];

    // Show Progress Bar
    progressSection.style.display = 'flex';
    progressBarFill.style.width = '20%';
    progressPercent.textContent = '20%';
    progressTitle.textContent = `Recalling conversations for "${rawSubject}"...`;

    // Render initial progress chips
    const activePlatformKeys = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);
    renderPlatformProgressChips(activePlatformKeys, 'Searching...');

    const maxCounts = {
      chatgpt: parseInt(limitChatgpt.value, 10) || 3,
      claude: parseInt(limitClaude.value, 10) || 3,
      perplexity: parseInt(limitPerplexity.value, 10) || 3
    };

    // Send search message to background service worker
    try {
      progressBarFill.style.width = '60%';
      progressPercent.textContent = '60%';

      chrome.runtime.sendMessage(
        {
          action: 'SEARCH_ALL_PLATFORMS',
          subject: rawSubject,
          selectedPlatforms,
          maxCounts,
          keywordExpansion: appSettings.keywordExpansion,
          demoMode: appSettings.demoMode
        },
        response => {
          if (!isSearching) {
            // User hit cancel while waiting
            return;
          }

          progressBarFill.style.width = '100%';
          progressPercent.textContent = '100%';

          setTimeout(() => {
            progressSection.style.display = 'none';
            finalizeSearchResults(response);
          }, 350);
        }
      );
    } catch (err) {
      console.error('Search initiation error:', err);
      resetSearchUiState();
      showToast('Failed to coordinate search: ' + err.message);
    }
  }

  /**
   * Finalizes and displays search results.
   */
  function finalizeSearchResults(response) {
    resetSearchUiState();

    if (!response || !response.success || !Array.isArray(response.results)) {
      showNoMatches('Failed to retrieve conversation results from background worker.');
      return;
    }

    const platformResults = response.results;
    let allMatches = [];

    platformResults.forEach(pr => {
      if (pr.matches && Array.isArray(pr.matches)) {
        allMatches = allMatches.concat(pr.matches);
      }
    });

    // Deduplicate all collected matches
    if (utils && typeof utils.deduplicateConversations === 'function') {
      allMatches = utils.deduplicateConversations(allMatches);
    }
    currentResults = allMatches;

    // Render groups
    resultsGroups.innerHTML = '';
    platformResults.forEach(pr => {
      renderPlatformGroup(pr);
    });

    if (allMatches.length > 0) {
      resultsActionBar.style.display = 'flex';
      totalMatchesBadge.textContent = allMatches.length;
      totalMatchesText.textContent = allMatches.length === 1 ? 'Matching Conversation Found' : 'Matching Conversations Found';
      btnOpenAllText.textContent = `Open All in Tabs (${allMatches.length})`;

      // If user enabled auto-open in settings
      if (appSettings.autoOpenTabs) {
        openAllMatchesInTabs();
      }
    } else {
      // Check if all platforms failed or had tab not open
      const hasTabNotOpen = platformResults.some(pr => pr.status === 'TAB_NOT_OPEN');
      const hasSignInReq = platformResults.some(pr => pr.status === 'SIGN_IN_REQUIRED');

      if (!hasTabNotOpen && !hasSignInReq) {
        showNoMatches(`No matching conversations found in visible history for "${response.subject || ''}".`);
      }
    }
  }

  /**
   * Renders a platform result group with conversation cards or honest status notices.
   */
  function renderPlatformGroup(platformResult) {
    const { platform, platformName, status, matches, message, manualSearchUrl, isDemo } = platformResult;
    const groupDiv = document.createElement('div');
    groupDiv.className = 'platform-group';

    const matchCount = (matches && matches.length) || 0;
    const badgeClass = matchCount > 0 ? 'count-green' : 'count-amber';
    const badgeLabel = matchCount > 0 ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}` : '0 matches';

    // Platform logo SVG selection
    let logoSvg = '';
    if (platform === 'chatgpt') {
      logoSvg = `<svg class="platform-logo logo-chatgpt" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.28 10.74a5.94 5.94 0 0 0-.48-4.52 6.03 6.03 0 0 0-5.83-3.14 5.95 5.95 0 0 0-4.4-1.99 6.03 6.03 0 0 0-5.6 3.9 5.97 5.97 0 0 0-3.9 2.87 6.04 6.04 0 0 0 .74 6.55 5.96 5.96 0 0 0 .48 4.52 6.03 6.03 0 0 0 5.83 3.14 5.94 5.94 0 0 0 4.4 1.99 6.03 6.03 0 0 0 5.6-3.9 5.97 5.97 0 0 0 3.9-2.87 6.04 6.04 0 0 0-.74-6.55zm-8.8 9.94a4.4 4.4 0 0 1-2.9-1.09l.14-.08 4.8-2.77a.8.8 0 0 0 .4-.69v-6.78l2.03 1.17v5.62a4.42 4.42 0 0 1-4.47 4.62z"/>
      </svg>`;
    } else if (platform === 'claude') {
      logoSvg = `<svg class="platform-logo logo-claude" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7 0 1.25-.33 2.43-.91 3.45l-3.32-3.32a3 3 0 0 0-4.24 0l-3.32 3.32A6.96 6.96 0 0 1 5 12c0-3.87 3.13-7 7-7z"/>
      </svg>`;
    } else {
      logoSvg = `<svg class="platform-logo logo-perplexity" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 4.18l5 2.5v3.82c0 3.82-2.58 7.39-5 8.44-2.42-1.05-5-4.62-5-8.44V8.68l5-2.5z"/>
      </svg>`;
    }

    // Group Header
    const demoTag = isDemo ? '<span class="demo-badge" style="margin-left: 6px;">DEMO DATA</span>' : '';
    groupDiv.innerHTML = `
      <div class="group-header">
        <div class="group-title-side">
          ${logoSvg}
          <span class="group-platform-name">${escapeHtml(platformName || platform)}</span>
          ${demoTag}
          <span class="group-match-count ${badgeClass}">${badgeLabel}</span>
        </div>
        <button type="button" class="group-quick-link" data-platform="${platform}" title="Launch ${platformName}">
          Open ${platformName} &rarr;
        </button>
      </div>
    `;

    // Group Content: Conversations or Notice Box
    if (matches && matches.length > 0) {
      const listDiv = document.createElement('div');
      listDiv.className = 'conversation-list';

      matches.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'conversation-item';

        const kwBadges = (item.matchedKeywords || [])
          .slice(0, 3)
          .map(kw => `<span class="kw-badge">${escapeHtml(kw)}</span>`)
          .join('');

        const scoreText = item.score ? `<span class="score-badge">${item.score} pts</span>` : '';

        itemDiv.innerHTML = `
          <div class="conv-top-row">
            <span class="conv-title" data-url="${escapeHtml(item.url)}" title="Click to open tab">
              ${escapeHtml(item.title)}
            </span>
            <button type="button" class="conv-open-btn" data-url="${escapeHtml(item.url)}" title="Open in separate tab">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open
            </button>
          </div>
          <div class="conv-meta-row">
            <div class="conv-tags">
              ${kwBadges}
              ${scoreText}
            </div>
            <span class="conv-url-preview">${escapeHtml(item.url)}</span>
          </div>
        `;

        // Click listeners on conversation item
        const openBtn = itemDiv.querySelector('.conv-open-btn');
        const titleEl = itemDiv.querySelector('.conv-title');

        const openHandler = () => {
          chrome.runtime.sendMessage({
            action: 'OPEN_SINGLE_CONVERSATION',
            url: item.url
          });
          showToast(`Opening "${truncate(item.title, 32)}"`);
        };

        if (openBtn) openBtn.addEventListener('click', openHandler);
        if (titleEl) titleEl.addEventListener('click', openHandler);

        listDiv.appendChild(itemDiv);
      });

      groupDiv.appendChild(listDiv);
    } else {
      // Honest state notice box
      const noticeDiv = document.createElement('div');
      noticeDiv.className = 'group-notice-box';

      let noticeMessage = message;
      let actionBtnText = `Open ${platformName}`;
      let actionUrl = manualSearchUrl;

      if (status === 'TAB_NOT_OPEN') {
        noticeMessage = `No active ${platformName} tab detected in Chrome. Open ${platformName} and sign in to scan conversation history.`;
        actionBtnText = `Open ${platformName} Tab`;
      } else if (status === 'SIGN_IN_REQUIRED') {
        noticeMessage = `Sign-in required for ${platformName}. Please sign in to allow history search.`;
        actionBtnText = `Sign in to ${platformName}`;
      } else if (status === 'NO_MATCHES') {
        noticeMessage = `Visible sidebar history scanned, but no direct matches were found for your query.`;
        actionBtnText = `Search on ${platformName}`;
      }

      noticeDiv.innerHTML = `
        <p class="group-notice-text">${escapeHtml(noticeMessage)}</p>
        <div class="group-notice-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-group-launch" data-url="${escapeHtml(actionUrl || '')}" data-platform="${platform}">
            ${actionBtnText} &rarr;
          </button>
        </div>
      `;

      const launchBtn = noticeDiv.querySelector('.btn-group-launch');
      if (launchBtn) {
        launchBtn.addEventListener('click', () => {
          chrome.runtime.sendMessage({
            action: 'OPEN_PLATFORM_TAB',
            platform,
            url: actionUrl
          });
        });
      }

      groupDiv.appendChild(noticeDiv);
    }

    // Quick link in header
    const quickLink = groupDiv.querySelector('.group-quick-link');
    if (quickLink) {
      quickLink.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: 'OPEN_PLATFORM_TAB',
          platform
        });
      });
    }

    resultsGroups.appendChild(groupDiv);
  }

  /**
   * Opens all found conversations in separate Chrome tabs without duplicates.
   */
  async function openAllMatchesInTabs() {
    if (!currentResults || currentResults.length === 0) {
      showToast('No matching conversations to open');
      return;
    }

    const urls = currentResults.map(r => r.url).filter(Boolean);
    btnOpenAll.disabled = true;
    btnOpenAllText.textContent = 'Opening Tabs...';

    chrome.runtime.sendMessage(
      {
        action: 'OPEN_BATCH_CONVERSATIONS',
        urls
      },
      res => {
        btnOpenAll.disabled = false;
        btnOpenAllText.textContent = `Open All in Tabs (${currentResults.length})`;

        if (res) {
          const opened = res.openedCount || 0;
          const skipped = res.skippedCount || 0;
          let msg = `Opened ${opened} conversation ${opened === 1 ? 'tab' : 'tabs'}`;
          if (skipped > 0) {
            msg += ` (${skipped} duplicate ${skipped === 1 ? 'tab' : 'tabs'} already open)`;
          }
          showToast(msg);
        }
      }
    );
  }

  /**
   * Copies all matching URLs and titles to clipboard.
   */
  function copyAllLinksToClipboard() {
    if (!currentResults || currentResults.length === 0) {
      showToast('No links to copy');
      return;
    }

    const text = currentResults
      .map(r => `[${r.platform.toUpperCase()}] ${r.title}\n${r.url}`)
      .join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied ${currentResults.length} links to clipboard!`);
    }).catch(err => {
      showToast('Clipboard error: ' + err.message);
    });
  }

  /**
   * Updates platform progress chips during an active search.
   */
  function renderPlatformProgressChips(platforms, statusText) {
    if (!platformStatusChips) return;
    const names = { chatgpt: 'ChatGPT', claude: 'Claude', perplexity: 'Perplexity' };
    platformStatusChips.innerHTML = platforms
      .map(p => `
        <div class="status-chip-row">
          <span>${names[p] || p}</span>
          <span class="chip-status-text searching">${statusText}</span>
        </div>
      `)
      .join('');
  }

  function resetSearchUiState() {
    isSearching = false;
    btnSearch.disabled = false;
    btnCancel.disabled = true;
    btnSearchText.textContent = 'Recall Conversations';
    globalStatusDot.className = 'brand-indicator active';
  }

  function showNoMatches(message) {
    if (noMatchesState) {
      if (noMatchesDesc) noMatchesDesc.textContent = message;
      noMatchesState.style.display = 'flex';
    }
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }

  // ==========================================================================
  // Event Listeners Registration
  // ==========================================================================

  // Input changes
  subjectInput.addEventListener('input', handleSubjectInputChange);

  subjectInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

  btnClearInput.addEventListener('click', () => {
    subjectInput.value = '';
    handleSubjectInputChange();
    subjectInput.focus();
  });

  // Quick subject chips
  quickChips.addEventListener('click', e => {
    const chip = e.target.closest('.chip-item');
    if (!chip) return;
    const subject = chip.getAttribute('data-subject');
    if (subject) {
      subjectInput.value = subject;
      handleSubjectInputChange();
      performSearch();
    }
  });

  // Platform checkbox change updates
  [
    { check: checkChatgpt, card: cardChatgpt },
    { check: checkClaude, card: cardClaude },
    { check: checkPerplexity, card: cardPerplexity }
  ].forEach(item => {
    item.check.addEventListener('change', () => {
      updateCardActiveState(item.card, item.check.checked);
      saveSettingsFromUI();
    });
  });

  [limitChatgpt, limitClaude, limitPerplexity].forEach(input => {
    input.addEventListener('change', saveSettingsFromUI);
  });

  // Search and Cancel Buttons
  btnSearch.addEventListener('click', performSearch);

  btnCancel.addEventListener('click', () => {
    if (isSearching) {
      isSearching = false;
      resetSearchUiState();
      progressSection.style.display = 'none';
      cancelledState.style.display = 'flex';
      showToast('Search cancelled by user');
    }
  });

  // Batch actions
  btnOpenAll.addEventListener('click', openAllMatchesInTabs);
  btnCopyLinks.addEventListener('click', copyAllLinksToClipboard);

  btnTryBroaderTopic.addEventListener('click', () => {
    subjectInput.focus();
    subjectInput.select();
  });

  // Settings Modal Handlers
  btnSettings.addEventListener('click', () => {
    modalSettings.style.display = 'flex';
  });

  btnCloseSettings.addEventListener('click', () => {
    modalSettings.style.display = 'none';
  });

  btnSaveSettings.addEventListener('click', () => {
    saveSettingsFromUI();
    modalSettings.style.display = 'none';
  });

  // Help Modal Handlers
  btnHelp.addEventListener('click', () => {
    modalHelp.style.display = 'flex';
  });

  btnCloseHelp.addEventListener('click', () => {
    modalHelp.style.display = 'none';
  });

  btnHelpGotIt.addEventListener('click', () => {
    modalHelp.style.display = 'none';
  });

  // Quick Launch Platform buttons in Settings
  btnLaunchChatgpt.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_PLATFORM_TAB', platform: 'chatgpt' });
  });

  btnLaunchClaude.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_PLATFORM_TAB', platform: 'claude' });
  });

  btnLaunchPerplexity.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_PLATFORM_TAB', platform: 'perplexity' });
  });

  // Demo Mode Toggles
  function toggleDemoMode() {
    appSettings.demoMode = !appSettings.demoMode;
    if (settingDemoMode) settingDemoMode.checked = appSettings.demoMode;
    updateDemoBanner(appSettings.demoMode);
    if (utils && typeof utils.saveStoredSettings === 'function') {
      utils.saveStoredSettings(appSettings);
    }
    showToast(appSettings.demoMode ? 'Hackathon Demo Mode enabled' : 'Demo Mode disabled');
  }

  if (btnDisableDemo) btnDisableDemo.addEventListener('click', toggleDemoMode);
  if (footerDemoToggle) footerDemoToggle.addEventListener('click', toggleDemoMode);

  // Close modals on Escape key or outside click
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      modalSettings.style.display = 'none';
      modalHelp.style.display = 'none';
    }
  });

  [modalSettings, modalHelp].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Initialize
  await loadSettings();
  subjectInput.focus();
});
