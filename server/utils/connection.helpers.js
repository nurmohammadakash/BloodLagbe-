const CAN_DONATE_TO = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"]
};

const canDonate = (donorGroup, recipientGroup) =>
    (CAN_DONATE_TO[donorGroup] || []).includes(recipientGroup);

const isValidName = (value) => /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,99}$/u.test(String(value || "").trim());

const normalizeMobile = (value) => {
    const s = String(value || "").replace(/[\s-]/g, "").replace(/^\+?88/, "");
    return /^01[3-9]\d{8}$/.test(s) ? s : null;
};

const normalizeEmail = (value) => {
    const s = String(value || "").trim().toLowerCase();
    return s.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
};

const normalizeNid = (value) => {
    const s = String(value || "").replace(/[\s-]/g, "");
    return /^(\d{10}|\d{13}|\d{17})$/.test(s) ? s : null;
};

const maskNid = (nid) => {
    const s = String(nid || "");
    return s.length <= 3 ? s : "*".repeat(s.length - 3) + s.slice(-3);
};

const pad = (n) => String(n).padStart(2, "0");

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const isValidDateStr = (value) => {
    const s = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const diffDays = (laterStr, earlierStr) =>
    Math.round((new Date(`${laterStr}T00:00:00Z`) - new Date(`${earlierStr}T00:00:00Z`)) / 86400000);

const addDays = (dateStr, days) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

const ageOn = (dobStr, onStr) => {
    const [by, bm, bd] = dobStr.split("-").map(Number);
    const [ty, tm, td] = onStr.split("-").map(Number);
    return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};

module.exports = {
    canDonate, isValidName, normalizeMobile, normalizeEmail, normalizeNid, maskNid,
    todayStr, isValidDateStr, diffDays, addDays, ageOn
};