// lib/store.js
// Permanent API keys: keys.json
// Temporary API keys: in-memory only (session/runtime)

const fs = require("fs");
const path = require("path");

const KEYS_FILE = path.join(process.cwd(), "keys.json");

// Temporary keys created from Admin Panel.
// IMPORTANT: Vercel serverless me ye permanent nahi hote.
const temporaryKeys = new Map();

function readPermanentKeys() {
  try {
    if (!fs.existsSync(KEYS_FILE)) return {};
    const raw = fs.readFileSync(KEYS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (err) {
    console.error("Failed to read keys.json:", err);
    return {};
  }
}

function getKey(key) {
  if (!key) return null;

  // Temporary key first
  if (temporaryKeys.has(key)) {
    return temporaryKeys.get(key);
  }

  // Permanent key
  const keys = readPermanentKeys();
  return keys[key] || null;
}

function setKey(key, data) {
  if (!key) return;

  // If key already exists permanently, don't overwrite keys.json
  const permanent = readPermanentKeys();

  if (permanent[key]) {
    permanent[key] = data;

    // Local development only.
    // Vercel filesystem is not persistent.
    try {
      fs.writeFileSync(
        KEYS_FILE,
        JSON.stringify(permanent, null, 2),
        "utf8"
      );
    } catch (err) {
      console.error("Cannot update keys.json:", err);
    }

    return;
  }

  // New keys created from admin panel are temporary
  temporaryKeys.set(key, data);
}

function deleteKey(key) {
  if (!key) return;

  // Temporary key
  if (temporaryKeys.has(key)) {
    temporaryKeys.delete(key);
    return;
  }

  // Permanent key
  const permanent = readPermanentKeys();

  if (permanent[key]) {
    delete permanent[key];

    try {
      fs.writeFileSync(
        KEYS_FILE,
        JSON.stringify(permanent, null, 2),
        "utf8"
      );
    } catch (err) {
      console.error("Cannot update keys.json:", err);
    }
  }
}

function allKeys() {
  return {
    ...readPermanentKeys(),
    ...Object.fromEntries(temporaryKeys)
  };
}

function recordRequest(key, query, ip) {
  const k = getKey(key);
  if (!k) return;

  const today = new Date().toISOString().slice(0, 10);

  k.totalRequests = (k.totalRequests || 0) + 1;
  k.lastUsed = new Date().toISOString();

  if (!k.dailyUsage) {
    k.dailyUsage = {};
  }

  k.dailyUsage[today] = (k.dailyUsage[today] || 0) + 1;

  const days = Object.keys(k.dailyUsage).sort();

  if (days.length > 30) {
    days
      .slice(0, days.length - 30)
      .forEach(d => delete k.dailyUsage[d]);
  }

  setKey(key, k);
}

function recordRejected(key, query, ip, reason) {
  console.log("Rejected request:", {
    key: key || "—",
    query: query || "—",
    ip: ip || "—",
    reason: reason || "Invalid key"
  });
}

function getLog() {
  return [];
}

function getGlobalUsage() {
  return {};
}

function getRejectedUsage() {
  return {};
}

module.exports = {
  getKey,
  setKey,
  deleteKey,
  allKeys,
  recordRequest,
  recordRejected,
  getLog,
  getGlobalUsage,
  getRejectedUsage
};