/* ============================================================
   JIX LIVE — إعدادات غرف البث المرئي والصوتي
   ============================================================ */

const JixLiveConfig = {
  // مزوّد البث الخارجي الحقيقي (خيارات: 'demo' للمحاكاة المحلية، أو 'agora' / 'livekit' للبث الفعلي)
  provider: 'demo', 

  // مفاتيح الاتصال بخوادم البث (تُستخدم عند تحويل التطبيق للوضع الإنتاجي الفعلي)
  agora: {
    appId: 'YOUR_AGORA_APP_ID_HERE',
    token: null // يتم توليده عبر الخادم لحماية غرف البث
  },

  livekit: {
    url: 'wss://your-livekit-project.livekit.cloud',
    token: null
  },

  // أقصى مدة مسموحة للبث التجريبي المجاني (بالثواني)
  maxDemoDuration: 1800, // 30 دقيقة

  // خيارات جودة الفيديو الافتراضية لشاشات الجوال
  videoSettings: {
    width: { ideal: 720 },
    height: { ideal: 1280 },
    frameRate: { ideal: 30 },
    facingMode: 'user' // الكاميرا الأمامية افتراضياً
  }
};

// إدارة تشغيل المعاينة المباشرة للكاميرا والميكروفون في الواجهة
window.JixLive = {
  activeStream: null,

  async start(videoElement, mode, roomId) {
    console.log(`📡 بدء إعداد غرفة بث JIX بنمط: ${mode} للغرفة: ${roomId}`);
    
    try {
      // طلب صلاحيات الكاميرا والمايك من المتصفح
      const constraints = {
        audio: true,
        video: mode === 'video' ? JixLiveConfig.videoSettings : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;

      if (videoElement && mode === 'video') {
        videoElement.srcObject = stream;
        videoElement.play().catch(e => console.error("خطأ في تشغيل الفيديو التلقائي:", e));
      }

      return { broadcasting: false, streamId: roomId };
    } catch (error) {
      console.error("فشل الوصول إلى أجهزة الوسائط:", error);
      throw error;
    }
  },

  stop() {
    console.log("🛑 إنهاء البث المباشر وإغلاق الكاميرا.");
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(track => track.stop());
      this.activeStream = null;
    }
  }
};

// تصدير الإعدادات للنافذة العامة لضمان تكاملها مع ملف app.js
window.JixLiveConfig = JixLiveConfig;
