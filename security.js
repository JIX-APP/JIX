/*
 * JIX — طبقة الحماية (Security Layer)
 */
const JixSecurity = (() => {

  // منع هجمات XSS وتعقيم النصوص
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
  }

  // إزالة محارف التحكم الخفية
  function stripControlChars(str) {
    return String(str || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\u202A-\u202E]/g, '');
  }

  // تقييد الطول
  function clampLength(str, max) {
    return stripControlChars(str).slice(0, max);
  }

  // تعقيم الروابط
  function sanitizeUrl(url) {
    try {
      const u = new URL(String(url), window.location.href);
      if (['http:', 'https:'].includes(u.protocol)) return u.href;
    } catch (e) {}
    return '';
  }

  // التحقق من صحة البريد
  function isValidEmail(email) {
    return /^[^\s@<>"'\r\n]+@[^\s@<>"'\r\n]+\.[^\s@<>"'\r\n]{2,}$/.test(String(email || '').trim());
  }

  // التحقق من اسم المستخدم
  function isValidHandle(handle) {
    return /^[a-z0-9_\u0621-\u064A]{3,20}$/i.test(String(handle || '').trim());
  }

  // مولد أرقام عشوائية مشفرة
  function secureId() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // منع السبام والضغط الزائد
  class RateLimiter {
    constructor() { this.hits = new Map(); }
    allow(key, maxCalls, windowMs) {
      const now = Date.now();
      const arr = (this.hits.get(key) || []).filter(t => now - t < windowMs);
      if (arr.length >= maxCalls) { this.hits.set(key, arr); return false; }
      arr.push(now);
      this.hits.set(key, arr);
      return true;
    }
  }
  const rateLimiter = new RateLimiter();

  // التخزين الآمن في LocalStorage
  const safeStorage = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem('jix:' + key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('jix:' + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem('jix:' + key); } catch (e) {} }
  };

  return {
    escapeHtml, stripControlChars, clampLength, sanitizeUrl,
    isValidEmail, isValidHandle, secureId, RateLimiter, rateLimiter,
    safeStorage
  };
})();
