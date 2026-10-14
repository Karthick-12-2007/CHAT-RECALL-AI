/**
 * ChatRecall AI - Automated Unit & Integrity Test Suite
 * Validates domain keyword expansion, matching heuristics, URL validation,
 * deduplication, Manifest V3 format, and popup DOM selector alignment.
 */

const fs = require('fs');
const path = require('path');
const utils = require('./utils.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log('====================================================');
console.log('   ChatRecall AI - Automated Verification Suite     ');
console.log('====================================================\n');

// 1. Test Domain Keyword Expansion
console.log('Test Suite 1: Domain Keyword Generation');
const ccnKeywords = utils.generateKeywords('Computer Communication Networks');
assert(Array.isArray(ccnKeywords) && ccnKeywords.length > 0, 'Generates keyword array for CCN');
assert(ccnKeywords.some(k => k.toLowerCase().includes('tcp') || k.toLowerCase().includes('osi')), 'Contains TCP/IP or OSI model');
assert(ccnKeywords.some(k => k.toLowerCase().includes('routing')), 'Contains routing protocols');

const javaKeywords = utils.generateKeywords('Java Programming');
assert(javaKeywords.some(k => k.toLowerCase().includes('jvm') || k.toLowerCase().includes('collections')), 'Contains JVM/Collections for Java');

const osKeywords = utils.generateKeywords('Operating Systems');
assert(osKeywords.some(k => k.toLowerCase().includes('deadlock') || k.toLowerCase().includes('paging') || k.toLowerCase().includes('scheduling')), 'Contains OS concepts');

// 2. Test Conversation Matching Engine
console.log('\nTest Suite 2: Relevance Matching Engine');
const title1 = 'Computer Communication Networks: Congestion Control Algorithms (TCP Tahoe vs Reno)';
const match1 = utils.matchConversation(title1, 'Computer Communication Networks', ccnKeywords);
assert(match1.isMatch === true, 'Matches exact topic in title');
assert(match1.score >= 100, `High score for exact subject match (score: ${match1.score})`);
assert(match1.matchedKeywords.length > 0, 'Populates matched keywords list');

const titleIrrelevant = 'Baking Chocolate Chip Cookies from Scratch';
const matchIrrelevant = utils.matchConversation(titleIrrelevant, 'Computer Communication Networks', ccnKeywords);
assert(matchIrrelevant.isMatch === false, 'Rejects unrelated conversation title');

const titlePartial = 'TCP/IP vs OSI Model: Layer Architecture and Protocol Comparison';
const matchPartial = utils.matchConversation(titlePartial, 'Computer Communication Networks', ccnKeywords);
assert(matchPartial.isMatch === true, 'Matches topic via domain keywords (TCP/IP & OSI)');

// 3. Test URL Verification & Canonicalization
console.log('\nTest Suite 3: URL Validation & Canonicalization');
assert(utils.isValidConversationUrl('https://chatgpt.com/c/6710a30b-9c4c-8001-9876-123456789abc', 'chatgpt') === true, 'Accepts valid ChatGPT /c/ URL');
assert(utils.isValidConversationUrl('https://chatgpt.com/auth/login', 'chatgpt') === false, 'Rejects ChatGPT login URL');
assert(utils.isValidConversationUrl('https://claude.ai/chat/3b123456-789a-4bcd-ef01-23456789abcd', 'claude') === true, 'Accepts valid Claude /chat/ URL');
assert(utils.isValidConversationUrl('https://claude.ai/settings', 'claude') === false, 'Rejects Claude settings URL');
assert(utils.isValidConversationUrl('https://www.perplexity.ai/search/difference-between-packet-switch-O1kG9xYTTw6f9vA2', 'perplexity') === true, 'Accepts valid Perplexity search thread URL');
assert(utils.isValidConversationUrl('https://www.perplexity.ai/pro', 'perplexity') === false, 'Rejects Perplexity pro pricing URL');

const trackingUrl = 'https://chatgpt.com/c/12345?utm_source=chatgpt.com&ref=sidebar';
const cleanUrl = utils.canonicalizeUrl(trackingUrl);
assert(!cleanUrl.includes('utm_source') && !cleanUrl.includes('ref'), 'Strips tracking parameters from URL');

// 4. Test Deduplication
console.log('\nTest Suite 4: Deduplication Logic');
const duplicates = [
  { id: '1', title: 'TCP/IP Model', url: 'https://chatgpt.com/c/123?utm_source=test', platform: 'chatgpt' },
  { id: '2', title: 'TCP/IP Model', url: 'https://chatgpt.com/c/123', platform: 'chatgpt' },
  { id: '3', title: 'Subnetting Guide', url: 'https://claude.ai/chat/abc', platform: 'claude' }
];
const deduped = utils.deduplicateConversations(duplicates);
assert(deduped.length === 2, `Correctly removes duplicate URL (expected 2, got ${deduped.length})`);

// 5. Test Manifest V3 File Structure
console.log('\nTest Suite 5: Manifest V3 Structure Validation');
const manifestPath = path.join(__dirname, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json exists');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.manifest_version === 3, 'Manifest version is 3');
assert(manifest.action && manifest.action.default_popup === 'popup.html', 'Action default_popup set to popup.html');
assert(manifest.background && manifest.background.service_worker === 'background.js', 'Background service_worker defined');
assert(manifest.permissions.includes('tabs') && manifest.permissions.includes('storage'), 'Required permissions included');
assert(manifest.host_permissions.some(p => p.includes('chatgpt.com')), 'Host permission for ChatGPT present');
assert(manifest.host_permissions.some(p => p.includes('claude.ai')), 'Host permission for Claude present');
assert(manifest.host_permissions.some(p => p.includes('perplexity.ai')), 'Host permission for Perplexity present');

// 6. Test Popup HTML & JS DOM ID Alignment
console.log('\nTest Suite 6: Popup DOM Selector Alignment');
const popupHtml = fs.readFileSync(path.join(__dirname, 'popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');

// Extract all getElementById calls from popup.js
const idMatches = [...popupJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = Array.from(new Set(idMatches));

let missingIds = 0;
uniqueIds.forEach(id => {
  const hasId = popupHtml.includes(`id="${id}"`) || popupHtml.includes(`id='${id}'`);
  if (!hasId) {
    console.error(`  Missing element ID in popup.html: "${id}"`);
    missingIds++;
  }
});
assert(missingIds === 0, `All ${uniqueIds.length} DOM element IDs referenced in popup.js exist in popup.html`);

// 7. Test Icons
console.log('\nTest Suite 7: Icon Assets Verification');
[16, 32, 48, 128].forEach(size => {
  const iconFile = path.join(__dirname, 'icons', `icon${size}.png`);
  assert(fs.existsSync(iconFile) && fs.statSync(iconFile).size > 50, `Icon icon${size}.png exists and is non-empty`);
});

// Summary
console.log('\n====================================================');
console.log(`Results: ${passedTests} Passed, ${failedTests} Failed (Total ${totalTests})`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully!\n');
}
