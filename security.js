/* ============================================================
   JIX — طبقة الحماية (Security Layer)
   ============================================================ */

const JixSecurity = (() => {

  // 1) منع XSS: تحويل أي نص مستخدم إلى نص آمن قبل عرضه بالصفحة
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  }

  // 2) إزالة محارف التحكم/العرض الخفية التي تُستخدم للتحايل النصي
  function stripControlChars(str) {
    return String(str || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\u202A-\u202E]/g, '');
  }

  // 3) تقييد الطول دائماً في الكود (يمنع تجاوز أداوت المطور)
  function clampLength(str, max) {
    return stripControlChars(str).slice(0, max);
  }

  // 4) تعقيم أي رابط قبل استخدامه (يمنع javascript: و data: كمصدر تنفيذ)
  function sanitizeUrl(url) {
    try {
      const u = new URL(String(url), window.location.href);
      if (['http:', 'https:'].includes(u.protocol)) return u.href;
    } catch (e) { /* رابط غير صالح */ }
    return '';
  }

  // 5) التحقق من البريد الإلكتروني بصيغة محافظة
  function isValidEmail(email) {
    return /^[^\s@<>"'\r\n]+@[^\s@<>"'\r\n]+\.[^\s@<>"'\r\n]{2,}$/.test(String(email || '').trim());
  }

  // 6) التحقق من اسم المستخدم (يمنع حروفاً قد تُستغل في مسارات/استعلامات لاحقة)
  function isValidHandle(handle) {
    return /^[a-z0-9_\u0621-\u064A]{3,20}$/i.test(String(handle || '').trim());
  }

  // 7) توليد معرّفات عشوائية آمنة تعتمد على مولّد عشوائية مشفّر
  function secureId() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 8) مُحدِّد معدّل (Rate Limiter) لمنع إساءة الاستخدام: سبام تعليقات أو هدايا
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

  // 9) قراءة/كتابة آمنة لـ localStorage (لا تكسر التطبيق بالتصفح الخاص)
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

  // 10) منع تضمين الصفحة داخل إطار خارجي (حماية إضافية من Clickjacking)
  function preventFraming() {
    try { if (window.top !== window.self) window.top.location = window.self.location; } catch (e) {}
  }

  // 11) تحقق من صحة كائنات JSON قادمة من الشبكة
  function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  // 12) تقليل خطر Prototype Pollution من مكتبات خارجية
  function hardenGlobals() {
    try { Object.freeze(Object.prototype); } catch (e) {}
  }

  // 13) تحقق من أن مبلغ العملات المُدخل رقم صحيح موجب ضمن حد منطقي
  function isValidCoinAmount(n) {
    return Number.isInteger(n) && n > 0 && n <= 1000000;
  }

  return {
    escapeHtml, stripControlChars, clampLength, sanitizeUrl,
    isValidEmail, isValidHandle, secureId, RateLimiter, rateLimiter,
    safeStorage, preventFraming, isPlainObject, hardenGlobals, isValidCoinAmount
  };
})();

// تفعيل ميزات الحماية الفورية
JixSecurity.preventFraming();
JixSecurity.hardenGlobals();

// تصدير الكائن للنافذة العامة لربطه بملف app.js
window.JixSecurity = JixSecurity;
