/*
 * JIX — نظام الهدايا (30 هدية حقيقية)
 * كل هدية: id ثابت، اسم، أيقونة، سعر بالعملات، وطبقة (tier) تتحكم بشدة
 * التأثير الصوتي والبصري. الأصوات مولَّدة إجرائياً عبر Web Audio API —
 * لا حاجة لملفات صوت خارجية، وهذا يجعلها تعمل فوراً بدون تحميل أي أصول.
 */
const JIX_GIFTS = [
  { id: 'rose',      name: 'وردة',        icon: '🌹', price: 1,    tier: 1 },
  { id: 'clap',      name: 'تصفيق',       icon: '👏', price: 5,    tier: 1 },
  { id: 'heart',     name: 'قلب',         icon: '❤️', price: 5,    tier: 1 },
  { id: 'star',      name: 'نجمة',        icon: '⭐', price: 10,   tier: 1 },
  { id: 'balloon',   name: 'بالون',       icon: '🎈', price: 10,   tier: 1 },
  { id: 'butterfly', name: 'فراشة',       icon: '🦋', price: 20,   tier: 1 },
  { id: 'flowers',   name: 'باقة ورد',    icon: '💐', price: 25,   tier: 1 },
  { id: 'giftbox',   name: 'صندوق هدايا', icon: '🎁', price: 30,   tier: 2 },
  { id: 'mic',       name: 'ميكروفون',    icon: '🎤', price: 40,   tier: 2 },
  { id: 'apple',     name: 'تفاحة ذهبية', icon: '🍎', price: 60,   tier: 2 },
  { id: 'cake',      name: 'كيكة',        icon: '🎂', price: 15,   tier: 2 },
  { id: 'guitar',    name: 'غيتار',       icon: '🎸', price: 90,   tier: 2 },
  { id: 'crown',     name: 'تاج',         icon: '👑', price: 50,   tier: 2 },
  { id: 'rainbow',   name: 'قوس قزح',     icon: '🌈', price: 150,  tier: 3 },
  { id: 'watch',     name: 'ساعة فاخرة',  icon: '⌚', price: 250,  tier: 3 },
  { id: 'diamond',   name: 'ألماسة',      icon: '💎', price: 100,  tier: 3 },
  { id: 'trophy',    name: 'كأس بطولة',   icon: '🏆', price: 350,  tier: 3 },
  { id: 'fireworks', name: 'ألعاب نارية', icon: '🎆', price: 400,  tier: 3 },
  { id: 'rocket',    name: 'صاروخ',       icon: '🚀', price: 200,  tier: 3 },
  { id: 'car',       name: 'سيارة فاخرة', icon: '🚗', price: 300,  tier: 4 },
  { id: 'ring',      name: 'خاتم ماسي',   icon: '💍', price: 700,  tier: 4 },
  { id: 'plane',     name: 'طائرة خاصة',  icon: '✈️', price: 500,  tier: 4 },
  { id: 'meteor',    name: 'وابل نيزكي',  icon: '☄️', price: 1200, tier: 4 },
  { id: 'yacht',     name: 'يخت',         icon: '🛥️', price: 1000, tier: 4 },
  { id: 'castle',    name: 'قلعة',        icon: '🏰', price: 1500, tier: 5 },
  { id: 'lion',      name: 'أسد الملوك',  icon: '🦁', price: 2000, tier: 5 },
  { id: 'throne',    name: 'العرش',       icon: '🪑', price: 3000, tier: 5 },
  { id: 'dragon',    name: 'التنين',      icon: '🐉', price: 5000, tier: 5 },
  { id: 'galaxy',    name: 'المجرة',      icon: '🌌', price: 8000, tier: 5 },
  { id: 'jix_crown', name: 'تاج JIX الملكي', icon: '👑✨', price: 9999, tier: 5 },
];

const JixFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // نغمة واحدة قصيرة
  function tone(ac, freq, start, dur, type, gainPeak) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + start);
    gain.gain.setValueAtTime(0, ac.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + dur + 0.05);
  }

  // كل طبقة (tier) لها "توقيع صوتي" مختلف: عدد نغمات، مدى ترددي، شكل موجة
  function playGiftSound(gift) {
    try {
      const ac = getCtx();
      const base = 220 + gift.tier * 90;
      const waveByTier = ['sine', 'sine', 'triangle', 'triangle', 'sawtooth'];
      const type = waveByTier[Math.min(gift.tier - 1, 4)];
      const notes = gift.tier; // كلما ارتفعت قيمة الهدية زاد عدد النغمات (أرپيجيو)
      for (let i = 0; i < notes; i++) {
        const freq = base * Math.pow(1.26, i); // سلم صاعد
        tone(ac, freq, i * 0.09, 0.35 + gift.tier * 0.05, type, 0.18);
      }
      // لمسة "بريق" إضافية للهدايا الكبيرة جداً
      if (gift.tier >= 4) {
        for (let i = 0; i < 6; i++) {
          tone(ac, base * (2 + Math.random() * 2), 0.1 + i * 0.05, 0.2, 'sine', 0.06);
        }
      }
    } catch (e) { /* الصوت اختياري ولا يجب أن يكسر التطبيق إن فشل */ }
  }

  // تأثير بصري: أيقونة الهدية تطفو وتتلاشى فوق الشاشة، بحجم يتناسب مع قيمتها
  function playGiftVisual(container, gift) {
    const el = document.createElement('div');
    el.className = 'gift-fx tier-' + gift.tier;
    el.textContent = gift.icon;
    el.style.left = (20 + Math.random() * 60) + '%';
    container.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function celebrate(container, gift) {
    playGiftSound(gift);
    playGiftVisual(container, gift);
  }

  return { celebrate, playGiftSound, playGiftVisual };
})();
