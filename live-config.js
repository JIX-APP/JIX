/*
 * JIX — إعداد مزوّد البث المباشر
 * ------------------------------------------------------------------
 * البث الحقيقي بين عدة مستخدمين (أنت تُرسل صوت/فيديو والآخرون يستقبلونه
 * مباشرة) يحتاج بنية وسيطة لتوزيع الوسائط (SFU/RTC) لا يمكن تشغيلها من
 * صفحة ويب وحدها.
 */

const LIVE_PROVIDER_CONFIG = {
  provider: 'livekit',                                            // تم التفعيل لـ LiveKit
  appId: 'APIRKJs2kcVFnLd',                                        // الـ API Key الخاص بك
  tokenEndpoint: 'wss://jix-live-w9kvkmoe.livekit.cloud',         // رابط خادم البث الخاص بك
};

const JixLive = (() => {
  let localStream = null;
  let activeRoom = null; // لتخزين الغرفة المفتوحة حالياً للتمكن من فصلها لاحقاً

  const isConfigured = () => LIVE_PROVIDER_CONFIG.provider === 'livekit' && !!LIVE_PROVIDER_CONFIG.tokenEndpoint;

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
   * نقطة الدخول لبدء بث حقيقي بين مستخدمين عبر LiveKit Cloud.
   */
  async function start(videoEl, mode, roomName) {
    // 1. تفعيل الكاميرا والمايك محلياً أولاً
    await startLocalPreview(videoEl, mode);
    
    // 2. التحقق من ضبط الإعدادات
    if (!isConfigured()) {
      return { broadcasting: false, reason: 'no_provider' };
    }

    try {
      // 3. تجهيز بيانات الغرفة واسم عشوائي للمشترك لتجنب التداخل
      const targetRoom = roomName || "jix-main-room";
      const participantName = "user_" + Math.floor(Math.random() * 1000);

      // 4. توليد توكن الدخول الآمن مباشرة عبر لوحة تحكم LiveKit السحابية الخاصة بك
      const cleanUrl = LIVE_PROVIDER_CONFIG.tokenEndpoint.replace('wss://', '');
      const tokenUrl = `https://${cleanUrl}/api/token?room=${targetRoom}&identity=${participantName}`;
      
      const token = await fetch(tokenUrl).then(res => res.json()).then(data => data.token || data);

      // 5. إنشاء اتصال حقيقي بالغرفة وبدء البث الحركي
      if (typeof LiveKit === 'undefined') {
        console.error("LiveKit SDK غير محملة في صفحة index.html");
        return { broadcasting: false, reason: 'sdk_missing' };
      }

      activeRoom = new LiveKit.Room();
      await activeRoom.connect(LIVE_PROVIDER_CONFIG.tokenEndpoint, token);

      // 6. مشاركة الصوت والصورة مع بقية المتواجدين في الغرفة
      if (localStream) {
        if (mode !== 'audio') {
          await activeRoom.localParticipant.setCameraEnabled(true);
        }
        await activeRoom.localParticipant.setMicrophoneEnabled(true);
      }

      return { broadcasting: true, roomInstance: activeRoom };
    } catch (error) {
      console.error("خطأ أثناء الاتصال بـ LiveKit:", error);
      return { broadcasting: false, reason: 'connection_failed', error: error.message };
    }
  }

  function stop() {
    stopLocalPreview();
    // 7. إنهاء البث وفصل الغرفة فوراً عند الضغط على إغلاق
    if (activeRoom) {
      activeRoom.disconnect();
      activeRoom = null;
    }
  }

  return { start, stop, isConfigured };
})();
