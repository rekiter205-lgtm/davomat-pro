/**
 * Telegram sozlamasini tekshiradi va sinov xabari yuboradi.
 * Run with: npx tsx scripts/test-telegram.ts
 *
 * Chat ID bilmasangiz — botga Telegram'da istalgan xabar yozing, keyin shu
 * skriptni ishga tushiring: u chat ID'ni o'zi topib beradi.
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID;

const api = (method: string) => `https://api.telegram.org/bot${token}/${method}`;

async function main() {
  if (!token) {
    console.error('❌  TELEGRAM_BOT_TOKEN bo\'sh.');
    console.error('    @BotFather ga /newbot yozing va tokenni .env ga qo\'ying.');
    process.exit(1);
  }

  // 1. Token haqiqiymi?
  const meRes = await fetch(api('getMe'));
  const me = await meRes.json();
  if (!me.ok) {
    console.error('❌  Token yaroqsiz:', me.description);
    process.exit(1);
  }
  console.log(`✓  Bot: @${me.result.username} (${me.result.first_name})`);

  // 2. Chat ID yo'q bo'lsa — oxirgi xabarlardan topamiz
  if (!chatId) {
    const updRes = await fetch(api('getUpdates'));
    const upd = await updRes.json();
    const chats = new Map<string, string>();
    for (const u of upd.result ?? []) {
      const c = u.message?.chat ?? u.channel_post?.chat;
      if (c) chats.set(String(c.id), `${c.title ?? ''}${c.first_name ?? ''} (${c.type})`);
    }
    if (!chats.size) {
      console.error('❌  TELEGRAM_CHAT_ID bo\'sh va botga hech kim yozmagan.');
      console.error(`    Telegram'da @${me.result.username} ni oching, /start bosing, keyin qayta urinib ko'ring.`);
      process.exit(1);
    }
    console.log('\n📋  Topilgan chatlar — kerakligini .env dagi TELEGRAM_CHAT_ID ga yozing:');
    for (const [id, name] of chats) console.log(`    ${id}  —  ${name}`);
    chatId = Array.from(chats.keys())[0];
    console.log(`\n→  Sinov uchun birinchisini ishlataman: ${chatId}`);
  }

  // 3. Sinov xabari — real davomat xabari bilan bir xil ko'rinishda
  const text = [
    '✅ *Davomat*',
    '👤 Test Oʻquvchi',
    '👥 11-25 — Biologiya',
    '📊 Keldi',
    `🕓 ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`,
  ].join('\n');

  const sendRes = await fetch(api('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  const sent = await sendRes.json();

  if (!sent.ok) {
    console.error('❌  Yuborilmadi:', sent.description);
    process.exit(1);
  }
  console.log(`\n✅  Sinov xabari yuborildi (chat ${chatId}). Telefoningizni tekshiring.`);
}

main().catch((e) => {
  console.error('❌  Xato:', e.message);
  process.exit(1);
});
