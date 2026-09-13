/*
 * إعدادات البث المباشر (Live Streaming Configuration)
 * ------------------------------------------------------------------
 * لبدء بث صوتي أو مرئي حقيقي بين مستخدمين عبر الإنترنت،
 * ضع بيانات مزود البث هنا (Agora أو LiveKit أو WebRTC Signaling):
 */

const JIX_LIVE_CONFIG = {
  // مزود البث المختار: 'mock' أو 'agora' أو 'livekit'
  provider: 'mock',

  agora: {
    appId: '', // ضع Agora App ID هنا
    token: ''  // رمز التوثيق المؤقت
  },

  livekit: {
    wsUrl: '', // مثال: wss://your-livekit-server.com
    token: ''
  }
};
