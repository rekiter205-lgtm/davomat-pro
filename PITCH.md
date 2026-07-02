# Davomat Pro — Pitch hujjati

> Bu fayl pitch kuni uchun tayyor material: muammo → yechim → demo ssenariysi →
> biznes model → e'tirozlarga javoblar. Slaydlar shu tartibda tuziladi.

---

## 1. Bir jumlada

**Davomat Pro — maktab davomatini AI yuz tanish orqali 3 soniyada avtomatlashtiruvchi,
ota-onani real vaqtda xabardor qiluvchi tizim.**

---

## 2. Muammo

- O'zbekistonda o'qituvchi **har darsda 5–10 daqiqa** yo'qlamaga sarflaydi —
  yiliga bitta o'qituvchi uchun **~60+ soat** yo'qolgan dars vaqti.
- Qog'oz jurnal: xatolar, "do'stiga qo'l ko'tarish", keyin statistika yig'ish azobi.
- Ota-ona farzandi maktabga yetib borganini **bilmaydi** — xavfsizlik tashvishi.
- Rahbariyat davomat statistikasini **oy oxirida, qo'lda** yig'adi.

## 3. Yechim

O'quvchi sinfga kiradi → kameraga qaraydi → **3 soniyada**:
1. Tizim yuzini taniydi va aynan shu darsga PRESENT deb yozadi;
2. Ota-onaga Telegram/SMS xabar ketadi;
3. Rahbariyat dashboardida jonli statistika yangilanadi.

Yo'qlama oynasi yopilgach, qolganlar **avtomatik ABSENT** — o'qituvchi umuman
aralashmaydi (xohlasa qo'lda tuzatadi).

## 4. Nega aynan biz (differensiatsiya)

| | Qog'oz jurnal | Turniket/karta | **Davomat Pro** |
|---|---|---|---|
| Dars darajasida aniqlik | ± | ✗ (faqat binoga kirish) | ✓ har bir dars |
| Kartani unutish/berish | — | muammo | yuzni unutib bo'lmaydi |
| Qo'shimcha qurilma | — | qimmat turniket | **oddiy webcam yetadi** |
| Ota-ona xabari | ✗ | ba'zida | ✓ real vaqtda |
| Narx | arzon lekin qimmat (vaqt) | $$$ | $ (softwarega obuna) |

Texnik afzalliklar:
- Yuz tanish **brauzerda** ishlaydi (face-api.js) — server GPU shart emas, arzon infratuzilma.
- Suratlar emas, **128 raqamli matematik belgi** saqlanadi — maxfiylik (suratni qayta tiklab bo'lmaydi).
- To'liq o'zbek tilida, maktab realiyasiga mos (paralar, sinflar, ota-ona roli).
- O'z serverida (on-premise) ham, bulutda ham ishlaydi.

## 5. Demo ssenariysi (5 daqiqa)

Oldindan tayyorlash: `npm run dev`, seed bajarilgan, 2–3 o'quvchiga yuz yozilgan,
bugungi kunga jadval qo'yilgan, `NEXT_PUBLIC_DEMO_CREDENTIALS=1`.

1. **Landing sahifa** (30 s) — mahsulot va qiymat taklifini ko'rsatish, "Demo ko'rish".
2. **Admin dashboard** (45 s) — jonli statistika, 7 kunlik trend.
3. **Yulduzcha: yuz skaneri** (2 min) — o'qituvchi sifatida kirish → "Bugungi darslar" →
   kamerani ochish → ko'ngilli kameraga qaraydi → PRESENT + toast + (agar sozlangan bo'lsa)
   Telegram xabari ekranda.
4. **Ota-ona ko'zi bilan** (45 s) — parent akkauntida farzand davomati.
5. **Audit jurnali + hisobot** (45 s) — "kim nima qilgani ko'rinadi" + Excel eksport tugmasi.
6. Yakun: "Bitta maktabda allaqachon ishlashga tayyor. Keyingi qadam — 10 ta maktab pilotı."

Zaxira rejasi: kamera ishlamasa — qo'lda belgilash oynasini ko'rsatish (bu ham feature:
"texnika pand bersa ham tizim ishlayveradi").

## 6. Biznes model (taklif)

- **SaaS obuna, maktab boshiga:** oyiga narxlash o'quvchi soniga bog'liq
  (masalan, 300 o'quvchigacha / 300–800 / 800+ — uch tarif).
- **On-premise litsenziya** — davlat maktablari uchun bir martalik + yillik support.
- Qo'shimcha daromad: SMS-paketlar (Eskiz.uz orqali marja), o'rnatish/trening xizmati.
- CAC past: viloyat xalq ta'limi boshqarmalari orqali klasterli sotuv.

## 7. Bozor (O'zbekiston)

- ~10 000+ umumta'lim maktabi, ~6 mln o'quvchi; xususiy maktablar va o'quv
  markazlari segmenti tez o'smoqda (ular — birinchi mijozlar).
- Boshlanish: xususiy maktablar + o'quv markazlari (to'lovga qodir, qaror tez).
- Keyin: davlat pilotlari, so'ng qo'shni bozorlar (QZ, KG, TJ — o'xshash tuzilma).

## 8. Hozirgi holat (traction/tayyorgarlik)

- ✅ MVP to'liq ishlaydi: 4 rol, jadval, yuz tanish, avto-ABSENT, hisobotlar, Excel import/eksport.
- ✅ Production darajasi: Docker, CI (typecheck/lint/test/build), 29 avtotest, health-check,
  rate limiting, audit log, xavfsizlik sarlavhalari.
- ⏭ Keyingi bosqich: 1–3 maktabda pilot → metrikalar (tejalgan vaqt, ota-ona qoniqishi).

## 9. Roadmap

| Bosqich | Nima | Nega |
|---|---|---|
| 0–3 oy | Pilot maktablar, liveness (ko'z ochib-yumish) anti-spoofing | Ishonch + firibgarlikka qarshi |
| 3–6 oy | Multi-tenant SaaS, mobil PWA, Telegram-bot chuqur integratsiya | Masshtab |
| 6–12 oy | Kiosk rejim (kirish eshigi), baholar/uyga vazifa moduli | O'rtacha chek o'sishi |

## 10. Kutiladigan e'tirozlar va javoblar

- **"Maxfiylik-chi? Bolalar yuzi!"** — Suratlar emas, qaytarib bo'lmaydigan 128 ta raqam
  saqlanadi; ma'lumot maktab serveridan chiqmaydi; O'zR "Shaxsiy ma'lumotlar" qonuniga mos
  (ma'lumotlar mahalliy saqlanadi).
- **"Egizaklar/o'xshash yuzlar?"** — threshold sozlanadi; shubhali holatda o'qituvchi
  bir klik bilan tasdiqlaydi; pilot metrikalarida false-positive < 1% ni ko'rsatamiz.
- **"Internet yo'q maktablar?"** — tizim lokal tarmoqda (on-premise) to'liq ishlaydi,
  faqat SMS/Telegram uchun internet kerak.
- **"Suratsiz aldash (telefondagi rasm)?"** — roadmapda liveness detection (0–3 oy);
  hozircha yo'qlama o'qituvchi nazorati ostida o'tadi.
- **"Nega turniket emas?"** — turniket binoni biladi, biz **darsni** bilamiz; narx 10x arzon.

---

*Texnik tafsilotlar: [README.md](README.md). Demo login: `NEXT_PUBLIC_DEMO_CREDENTIALS=1` bo'lsa admin/admin123.*
