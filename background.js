// background.js (service worker)
const BASE_RULE_ID = 1000; // we'll assign rule IDs starting at this

// helper to convert domain/pattern to a declarativeNetRequest rule
function makeRule(id, pattern) {
  // pattern can be domain (example.com) or wildcard (*://*.example.com/*)
  // We'll try to accept plain domains and also full patterns.
  let urlFilter;
  if (/^[a-z0-9.-]+$/i.test(pattern)) {
    // plain domain -> block any scheme + any path for that domain and subdomains
    urlFilter = `*://${pattern}/*`;
    // also block subdomains
    urlFilter = `*://${pattern}/*`;
  } else {
    // assume user provided a pattern acceptable to 'urlFilter'
    urlFilter = pattern;
  }

  return {
    id,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: urlFilter,
      resourceTypes: ["main_frame", "sub_frame"]
    }
  };
}

// update dynamic rules based on an array of patterns (strings)
async function setBlocklist(patterns) {
  // Remove existing dynamic rules we created (ids BASE_RULE_ID ... )
  const removeIds = [];
  for (let i = BASE_RULE_ID; i < BASE_RULE_ID + 10000; i++) removeIds.push(i); // safe sweep
  // But declarativeNetRequest.updateDynamicRules expects a smaller array; we'll remove none-by-none
  // Instead query existing installed rules and remove only those >= BASE_RULE_ID
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const toRemove = existingRules.filter(r => r.id >= BASE_RULE_ID).map(r => r.id);

  const newRules = [];
  let id = BASE_RULE_ID;
  for (const pattern of patterns) {
    if (!pattern || !pattern.trim()) continue;
    newRules.push(makeRule(id, pattern.trim()));
    id++;
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: toRemove,
      addRules: newRules
    });
    console.log("Updated dynamic DNR rules:", newRules);
  } catch (err) {
    console.error("Failed to update rules:", err);
  }
}

// On install, set an empty list
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ blocklist: [] }, (items) => {
    setBlocklist(items.blocklist || []);
  });
});

// Listen for messages from the options page to update the blocklist
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "setBlocklist") {
    const list = Array.isArray(message.list) ? message.list : [];
    chrome.storage.local.set({ blocklist: list }, () => {
      setBlocklist(list);
      sendResponse({ ok: true });
    });
    // Indicate async response
    return true;
  }
});
