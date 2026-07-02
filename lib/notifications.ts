/**
 * Optional notification senders.
 * If env vars are not configured, these are no-ops.
 */

interface AttendanceNotification {
  studentName: string;
  groupName: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  time: string;
  parentPhone?: string | null;
}

export async function sendTelegramNotification(payload: AttendanceNotification): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const statusEmoji = payload.status === 'PRESENT' ? '✅' : payload.status === 'LATE' ? '⏰' : '❌';
  const statusText  = payload.status === 'PRESENT' ? 'Keldi' : payload.status === 'LATE' ? 'Kech qoldi' : 'Kelmadi';
  const text = [
    `${statusEmoji} *Davomat*`,
    `👤 ${payload.studentName}`,
    `👥 ${payload.groupName}`,
    `📊 ${statusText}`,
    `🕓 ${payload.time}`,
  ].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    return res.ok;
  } catch (err) {
    console.error('Telegram send failed:', err);
    return false;
  }
}

/**
 * SMS via Eskiz.uz (Uzbekistan provider).
 * Stub — fill in `getEskizToken` if/when the credentials are configured.
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  const email = process.env.SMS_PROVIDER_EMAIL;
  const password = process.env.SMS_PROVIDER_PASSWORD;
  if (!email || !password) return false;

  try {
    // 1. Authenticate
    const authRes = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!authRes.ok) return false;
    const { data } = await authRes.json();
    const token: string = data?.token;
    if (!token) return false;

    // 2. Send
    const form = new FormData();
    form.append('mobile_phone', phone.replace(/\D/g, ''));
    form.append('message', message);
    form.append('from', process.env.SMS_FROM || '4546');

    const sendRes = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return sendRes.ok;
  } catch (err) {
    console.error('SMS send failed:', err);
    return false;
  }
}

export async function notifyAttendance(payload: AttendanceNotification) {
  // Fire-and-forget — never block the API response.
  void sendTelegramNotification(payload);
  if (payload.parentPhone) {
    const msg = `${payload.studentName} — ${payload.status === 'LATE' ? 'kech qoldi' : 'keldi'} (${payload.time}). Davomat Pro`;
    void sendSms(payload.parentPhone, msg);
  }
}
