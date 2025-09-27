const textarea = document.getElementById("blocklist");
const saveBtn = document.getElementById("save");
const clearBtn = document.getElementById("clear");
const status = document.getElementById("status");

function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.style.color = isError ? "crimson" : "green";
  setTimeout(() => { status.textContent = ""; }, 3000);
}

// load current blocklist
chrome.storage.local.get({ blocklist: [] }, (items) => {
  textarea.value = (items.blocklist || []).join("\n");
});

saveBtn.addEventListener("click", () => {
  const lines = textarea.value.split("\n").map(l => l.trim()).filter(Boolean);
  chrome.runtime.sendMessage({ action: "setBlocklist", list: lines }, (resp) => {
    if (chrome.runtime.lastError) {
      showStatus("Error saving: " + chrome.runtime.lastError.message, true);
    } else showStatus("Saved!");
  });
});

clearBtn.addEventListener("click", () => {
  textarea.value = "";
  chrome.runtime.sendMessage({ action: "setBlocklist", list: [] }, (resp) => {
    if (chrome.runtime.lastError) {
      showStatus("Error clearing: " + chrome.runtime.lastError.message, true);
    } else showStatus("Cleared!");
  });
});
