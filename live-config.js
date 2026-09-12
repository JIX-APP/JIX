/*
 * JIX — إعداد مزوّد البث المباشر
 * ------------------------------------------------------------------
 * البث الحقيقي بين عدة مستخدمين (أنت تُرسل صوت/فيديو والآخرون يستقبلونه
 * مباشرة) يحتاج بنية وسيطة لتوزيع الوسائط (SFU/RTC) لا يمكن تشغيلها من
 * صفحة ويب وحدها. الخيارات الجاهزة الشائعة:
 *
 *   1) Agora.io      -> https://www.agora.io      (باقة مجانية شهرية)
 *   2) LiveKit Cloud  -> https://livekit.io         (مفتوح المصدر + سحابي)
 *   3) Daily.co       -> https://www.daily.co
 *
 * الخطوات لتفعيل بث حقيقي بين مستخدمين:
 *   1. أنشئ حساب عند أحد المزودين أعلاه واحصل على App ID / API Key.
 *   2. ضع القيم بالأسفل في LIVE_PROVIDER_CONFIG.
 *   3. حمّل SDK المزوّد بوسم <script> داخل index.html (راجع تعليق المزوّد).
 *   4. نفّذ دوال connect/publish/subscribe داخل JixLive.provider حسب
 *      توثيق ذلك المزوّد الرسمي (لكل مزوّد واجهة برمجية مختلفة).
 *
 * ⚠️ لا تضع مفاتيح سرّية (Secret/API Secret) هنا أبداً — هذا كود يعمل
 * بمتصفح المستخدم ومرئي للجميع. أي توليد لتوكن دخول للبث (Token) يجب أن
 * يتم من خادم خلفي (Edge Function في Supabase مثلاً) وليس من المتصفح.
 *
 * حتى يتم ربط مزوّد، يعمل التطبيق بوضع "معاينة محلية": يعرض كاميرا/مايك
 * الجهاز نفسه فعلياً (تجربة واجهة حقيقية للمُذيع)، لكن بدون بث للمشاهدين
 * الآخرين عبر الشبكة.
 */

const LIVE_PROVIDER_CONFIG = {
  provider: 'none',        // غيّرها إلى 'agora' أو 'livekit' بعد التجهيز
  appId: '',                // App ID / API Key العام فقط (غير السرّي)
  tokenEndpoint: '',        // رابط خادمك الخلفي الذي يولّد توكن دخول آمن
};

const JixLive = (() => {
  let localStream = null;

  const isConfigured = () => LIVE_PROVIDER_CONFIG.provider !== 'none' && !!LIVE_PROVIDER_CONFIG.appId;

  async function startLocalPreview(videoEl, mode) {
    const constraints = mode === 'audio'
      ? { audio: true, video: false }
      : { audio: true, video: { facingMode: 'user' } };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoEl && mode !== 'audio') {
      videoEl.srcObject = localStream;
    }
    return localStream;
  }

  function stopLocalPreview() {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
  }

  /**
   * نقطة الدخول لبدء بث حقيقي بين مستخدمين. إن لم يُضبط مزوّد بعد،
   * نستخدم المعاينة المحلية ونُعلم الواجهة بذلك بوضوح (بدون خداع المستخدم).
   */
  async function start(videoEl, mode, roomName) {
    await startLocalPreview(videoEl, mode);
    if (!isConfigured()) {
      return { broadcasting: false, reason: 'no_provider' };
    }
    // TODO: عند ضبط LIVE_PROVIDER_CONFIG، نفّذ هنا نداء SDK المزوّد الفعلي:
    // مثال عام (يختلف بالتفصيل حسب كل مزوّد):
    //   const token = await fetch(LIVE_PROVIDER_CONFIG.tokenEndpoint + '?room=' + roomName).then(r => r.json());
    //   await provider.connect(LIVE_PROVIDER_CONFIG.appId, token, roomName);
    //   await provider.publish(localStream);
    return { broadcasting: false, reason: 'not_implemented' };
  }

  function stop() {
    stopLocalPreview();
    // TODO: عند وجود مزوّد فعلي، افصل الغرفة هنا: provider.disconnect();
  }

  return { start, stop, isConfigured };
})();
