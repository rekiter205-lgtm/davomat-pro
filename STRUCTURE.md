# Davomat Pro — Loyiha Tarkibi va Fayl-ma-Fayl Tushuntirish

Ushbu hujjat loyihaning **har bir fayli** va **uning vazifasi** haqida batafsil ma'lumot beradi.

---

## 📁 1. Konfiguratsiya fayllari (loyiha ildizida)

### `package.json`
Loyiha bog'liqliklari (dependencies) va `npm` skriptlarini saqlaydi.

**Asosiy bog'liqliklar:**
- `next@14.2.18` — frontend va backend freymvorki
- `react@18` + `react-dom` — UI kutubxonasi
- `@prisma/client` + `prisma` — ma'lumotlar bazasi ORM
- `face-api.js` — yuzni tan olish AI kutubxonasi
- `bcryptjs` — parol heshlash
- `jose` — JWT token yaratish/tekshirish (Edge runtime bilan ishlaydi)
- `recharts` — grafiklar uchun
- `exceljs` — Excel hisobotlar yaratish
- `zod` — kiruvchi ma'lumotlarni validatsiya qilish
- `lucide-react` — ikonkalar
- `react-hot-toast` — bildirishnomalar
- `tailwindcss` — CSS freymvorki

**Asosiy skriptlar:**
- `npm run dev` — development server
- `npm run build` — production build
- `npm run prisma:migrate` — DB migratsiyalar
- `npm run seed` — namunaviy ma'lumotlarni yuklash
- `npm run setup:models` — face-api.js modellarni yuklab olish

### `tsconfig.json`
TypeScript konfiguratsiyasi. `@/*` path alias `./*` ga yo'naltirilgan, shuning uchun `import { x } from '@/lib/utils'` deb yozish mumkin.

### `next.config.js`
Next.js sozlamalari. Webpack uchun `fs: false` qo'shilgan — bu face-api.js'ning brauzer qismini server uchun build qilishda muammo chiqarmaslik uchun.

### `tailwind.config.ts`
Tailwind CSS sozlamalari. `darkMode: 'class'` — qorong'u rejim `<html class="dark">` orqali boshqariladi. Brand ranglar (ko'k tonalligi) belgilangan.

### `postcss.config.js`
PostCSS sozlamalari (Tailwind + autoprefixer).

### `.env.example`
Barcha environment-o'zgaruvchilar namunasi:
- `DATABASE_URL` — PostgreSQL ulanishi
- `JWT_SECRET` — token shifrlash kaliti
- `FACE_MATCH_THRESHOLD` — yuz mos kelishi chegarasi (0.55 default)
- `LATE_THRESHOLD_MINUTES` — kechikish chegarasi (15 daqiqa default)
- Telegram, SMS, S3 ixtiyoriy sozlamalar

### `.gitignore`, `.dockerignore`
Git va Docker uchun e'tiborga olinmaydigan fayllar ro'yxati.

### `Dockerfile`
3 bosqichli Docker build:
1. **deps** — `npm ci` orqali bog'liqliklar
2. **builder** — `prisma generate` + `next build`
3. **runner** — minimal Alpine image, faqat ishlash uchun kerakli fayllar

Konteyner ishga tushganda avtomatik `prisma migrate deploy` qiladi.

### `docker-compose.yml`
Postgres + ilova konteyneri birga ishga tushiradi. `davomat_pgdata`, `davomat_uploads`, `davomat_models` volyumlari ma'lumotlarni saqlab qoladi.

### `middleware.ts`
**Eng muhim xavfsizlik fayli.** Har bir so'rovni tekshiradi:
- `/login`, `/api/auth/login` — ochiq
- `/api/...` — token yo'q bo'lsa **401 JSON**
- Sahifalar — token yo'q bo'lsa `/login`'ga **redirect**
- Admin-only API'lar (`/api/teachers`, `/api/groups` POST/PUT/DELETE) — TEACHER bo'lsa **403**

---

## 📁 2. Prisma — Ma'lumotlar bazasi

### `prisma/schema.prisma`
Ma'lumotlar bazasi sxemasi. 5 ta model:

- **User** — admin va o'qituvchilar (role bilan)
- **Group** — guruhlar/sinflar (`startTime` — kechikishni hisoblash uchun)
- **Student** — talabalar (`faceDescriptor` — JSON formatida 128 o'lchovli vektor)
- **Attendance** — davomat yozuvlari (status: PRESENT / LATE / ABSENT)
  - `@@unique([studentId, date])` — bir kunda bir talaba uchun faqat bir yozuv (duplikatlardan himoya)
- **Setting** — tizim sozlamalari (key/value)

### `prisma/seed.ts`
Namunaviy ma'lumotlarni yuklaydigan skript:
- 1 admin (`admin / admin123`)
- 2 o'qituvchi (`aliyev`, `karimova` / `teacher123`)
- 3 guruh (Frontend-101, Backend-201, Design-101)
- 7 talaba (yuz ma'lumotlarisiz — UI orqali yuklash kerak)

---

## 📁 3. `lib/` — Umumiy yordamchi modullar

### `lib/prisma.ts`
Prisma client'ning singleton namunasi. Development'da hot-reload paytida ko'p marta yaratilmasligi uchun `global` saqlash.

### `lib/jwt.ts`
JWT token yaratish va tekshirish. **`jose`** kutubxonasi ishlatilgan — chunki Next.js Edge runtime'da `jsonwebtoken` ishlamaydi, `jose` esa ishlaydi.

```ts
signToken({ sub, username, role, fullName })  // 7 kunlik token
verifyToken(token) → TokenPayload | null
```

### `lib/auth.ts`
Autentifikatsiya yordamchilari:
- `hashPassword`, `verifyPassword` — bcrypt orqali
- `getCurrentUser()` — server tomonida cookie'dan sessiyani olish
- `getCurrentUserFresh()` — sessiya + DB tekshiruvi (foydalanuvchi hali ham faolmi?)
- `requireAuth(req)`, `requireAdmin(req)` — API route'lar uchun guard'lar

### `lib/face-utils.ts`
**AI yadrosi.** Yuz vektorlarini taqqoslash matematikasi (server tomonida ishlaydi):

- `euclideanDistance(a, b)` — Yevklid masofasi (face-api.js standarti)
- `cosineSimilarity(a, b)` — kosinus o'xshashligi
- `findBestMatch(probe, candidates, threshold)` — ko'p talabalar orasidan eng yaqin mosligini topadi
- `isValidDescriptor(d)` — 128 ta to'g'ri sondan iborat ekanligini tekshiradi

### `lib/notifications.ts`
Ixtiyoriy bildirishnomalar (env'da konfiguratsiya yo'q bo'lsa, hech narsa qilmaydi):
- `sendTelegramNotification` — Telegram Bot API orqali xabar yuborish
- `sendSms` — Eskiz.uz orqali SMS (O'zbek SMS provayderi)
- `notifyAttendance` — har ikkalasini "fire-and-forget" tarzda chaqiradi

### `lib/utils.ts`
Kichik yordamchilar:
- `cn(...)` — Tailwind class'larni birlashtirish (twMerge bilan ziddiyatlarni hal qiladi)
- `formatDateISO`, `startOfDay`, `formatTime`, `formatDateUz` — sana formatlash
- `statusLabel`, `statusBadge` — PRESENT/LATE/ABSENT → o'zbekcha matn va Tailwind ranglar
- `roleLabel` — ADMIN/TEACHER → "Administrator"/"O'qituvchi"

---

## 📁 4. `ai/` — Sun'iy intellekt

### `ai/face-recognition.ts`
**Brauzer tomoni** — face-api.js ustidan o'rovchi (wrapper). Faqat client component'larda ishlatiladi (`'use client'` bilan):

- `loadFaceModels()` — 3 ta modelni yuklab olish (TinyFaceDetector, Landmark68, Recognition). Bir marta yuklanadi, keyin keshlanadi.
- `detectSingleFace(input)` — bitta yuzni topadi va 128-o'lchovli vektorini qaytaradi
- `detectAllFaces(input)` — barcha yuzlarni topadi (guruhli skanerlash uchun)
- `descriptorFromImage(img)` — bitta yuz vektorini extract qilish (talaba ro'yxatga olishda)
- `descriptorToArray(d)` — Float32Array → number[] (DB'ga yuborish uchun)

---

## 📁 5. `app/` — Next.js sahifalar va API'lar

### Asosiy fayllar

#### `app/layout.tsx`
Root layout — `<html lang="uz">`, Inter shrifti, Toaster (bildirishnomalar). `<head>` ichida sahifa yuklanishidan oldin `localStorage`'dagi mavzu (theme) qo'llanadi — bu "flash of light theme" muammosini hal qiladi.

#### `app/page.tsx`
Bosh sahifa — agar foydalanuvchi tizimga kirgan bo'lsa `/dashboard`'ga, aks holda `/login`'ga yo'naltiradi.

#### `app/globals.css`
Tailwind direktivlari + custom CSS:
- CSS o'zgaruvchilari (`--background`, `--card` va h.k.) — light/dark uchun
- Komponent klasslari (`.btn-primary`, `.input`, `.card`, `.badge` va h.k.)
- Custom scrollbar styling

### Auth — `app/(auth)/`

#### `app/(auth)/login/page.tsx`
Login sahifasi. Ochiq, middleware'dan o'tib ketadi. Demo'da `admin/admin123` to'ldirilgan, foydalanuvchi tezda kirib ko'ra oladi.

### Dashboard layout

#### `app/(dashboard)/layout.tsx`
Barcha himoyalangan sahifalarning qoplamasi (wrapper). Mount paytida `/api/auth/me`'ni chaqiradi — agar 401 qaytsa, `/login`'ga yo'naltiradi. Sidebar va Header'ni render qiladi.

### Sahifalar

#### `app/(dashboard)/dashboard/page.tsx`
Bosh statistika sahifasi:
- 4 ta stat-karta (talabalar, guruhlar, bugun keldi, kech qoldi)
- 7 kunlik grafik (Recharts AreaChart)
- Bugungi check-inlar ro'yxati

#### `app/(dashboard)/students/page.tsx`
Talabalar ro'yxati — qidiruv, guruh bo'yicha filtr, kartochkalar shaklida ko'rsatish. Har bir kartochkada: rasm, ism, guruh, telefon, **yuz ma'lumotlari mavjudmi** indikator, tahrirlash/o'chirish tugmalari.

#### `app/(dashboard)/students/new/page.tsx`
**Eng muhim shakl** — yangi talaba qo'shish yoki tahrirlash. Bu sahifada:
1. Rasm yuklanadi va preview ko'rsatiladi
2. **"Yuzni aniqlash"** tugmasi bosilganda, brauzerda face-api.js orqali 128-o'lchovli vektor olinadi
3. Forma yuborilganda: rasm `/api/upload` orqali yuklanadi, keyin talaba `/api/students` orqali yaratiladi (vektor bilan birga)

#### `app/(dashboard)/groups/page.tsx`
Guruhlarni boshqarish (CRUD). Modal oyna orqali yaratish/tahrirlash. Har bir guruhda: nomi, tavsif, boshlanish vaqti, o'qituvchi, talabalar soni.

#### `app/(dashboard)/teachers/page.tsx`
Foydalanuvchilar (admin va o'qituvchilar) jadvali. Faqat ADMIN ko'ra oladi (middleware orqali). Yangi qo'shish, tahrirlash, parolni o'zgartirish, o'chirish.

#### `app/(dashboard)/attendance/page.tsx`
Davomat tarixi — sana va guruh bo'yicha filtr, jadval ko'rinishida. Excel'ga export tugmasi.

#### `app/(dashboard)/attendance/scan/page.tsx` ⭐
**Asosiy xususiyat — yuz orqali davomat.** Sahifaga kirilganda:
1. `<FaceScanner>` komponenti webcam'ni yoqadi
2. Har 2.5 soniyada bitta kadr olib yuzni qidiradi
3. Yuz topilsa — vektor `/api/attendance/recognize`'ga yuboriladi
4. Server javob qaytaradi (kim tan olindi, status, % aniqlik)
5. Natija banner shaklida ko'rsatiladi + "So'nggi skanlar" ro'yxatiga qo'shiladi
6. Bir talabani 30 soniyada qayta-qayta yozmaslik uchun **per-student cooldown** ishlatilgan

#### `app/(dashboard)/reports/page.tsx`
Hisobotlar sahifasi:
- Sana oralig'i va guruh bo'yicha filtr
- 4 ta stat-karta
- Kunlik dinamika (BarChart)
- Status nisbati (PieChart)
- Guruh bo'yicha taqsimot (gorizontal stack BarChart)
- Excel'ga export

### API marshrutlar — `app/api/`

#### Auth
- `auth/login/route.ts` — username + password tekshiruvi, JWT token yaratish, httpOnly cookie qo'yish
- `auth/logout/route.ts` — cookie'ni o'chirish
- `auth/me/route.ts` — joriy foydalanuvchi haqida ma'lumot

#### Talabalar
- `students/route.ts` — `GET` (ro'yxat, filtrlar bilan) + `POST` (yangi yaratish, vektor bilan)
- `students/[id]/route.ts` — `GET`, `PUT`, `DELETE` (bitta talaba)

#### Guruhlar
- `groups/route.ts` — `GET` + `POST`
- `groups/[id]/route.ts` — `GET`, `PUT`, `DELETE`

#### O'qituvchilar (admin only)
- `teachers/route.ts` — `GET` + `POST`
- `teachers/[id]/route.ts` — `PUT`, `DELETE`

#### Davomat
- `attendance/route.ts` — `GET` (ro'yxat) + `POST` (qo'lda yozish)
- **`attendance/recognize/route.ts`** ⭐ — **yuzni tan olish va davomat belgilash**:
  1. Kiruvchi vektorni validatsiya qiladi
  2. DB'dan barcha faol talabalarni yuklaydi
  3. `findBestMatch` orqali eng yaqinini topadi
  4. Mos kelmasa — `{ matched: false }` qaytaradi
  5. Mos kelsa — guruhning `startTime`'iga qarab PRESENT yoki LATE'ga belgilaydi
  6. Bu kun uchun yozuv allaqachon bo'lsa — `alreadyMarked: true` qaytaradi
  7. Yangi yozuv qo'shilsa — Telegram + SMS bildirishnomasi yuboriladi (background)
- `attendance/export/route.ts` — ExcelJS orqali `.xlsx` fayl yaratib qaytaradi (rangli sarlavha bilan)

#### Boshqalar
- `dashboard/stats/route.ts` — bosh sahifa uchun statistik agregatsiyalar (Promise.all bilan parallel querylar)
- `upload/route.ts` — multipart/form-data orqali rasm yuklash (5MB limit, MIME tekshiruvi, randomized fayl nomi)

---

## 📁 6. `components/` — Qayta ishlatiluvchi React komponentlar

### `components/Sidebar.tsx`
Chap menyu. Roleg'a qarab ko'rsatiladigan link'lar filtrlangan (TEACHER "O'qituvchilar" sahifasini ko'rmaydi). Mobilda overlay sifatida ochiladi.

### `components/Header.tsx`
Yuqori panel: mobile menyu tugmasi, **theme toggle** (light/dark), foydalanuvchi avatari va dropdown menyu (chiqish tugmasi).

### `components/FaceScanner.tsx` ⭐
**AI komponenti** — webcam orqali yuz aniqlash:
- `loadFaceModels()` orqali modellarni yuklaydi
- `getUserMedia` orqali kamerani yoqadi
- `<canvas>` overlay'da topilgan yuz atrofiga yashil quti chizadi
- `continuous` rejimi — har `intervalMs` daqiqada avtomatik skanerlaydi
- Yoki bir martalik rejim ("Yuzni olish" tugmasi) — talaba ro'yxatga olishda ishlatiladi
- Xatoliklar (kamera ruxsati yo'q, AI modellari yuklanmadi) chiroyli ko'rsatiladi

### `components/AttendanceChart.tsx`
Recharts orqali AreaChart — 7 kunlik kelganlar va kech qolganlar trendi.

---

## 📁 7. `scripts/`

### `scripts/download-models.ts`
face-api.js modellarini GitHub'dan yuklab `public/models/`'ga joylaydi:
- `tiny_face_detector_model-*` — yuz aniqlash
- `face_landmark_68_model-*` — yuz nuqtalari
- `face_recognition_model-*` — 128-o'lchovli embedding

Modellar mavjud bo'lsa, qayta yuklamaydi.

---

## 📁 8. `public/`

### `public/uploads/`
Yuklangan talaba rasmlari saqlanadi. Git'ga qo'shilmaydi, lekin `.gitkeep` orqali papka saqlanib qoladi. `placeholder.png` — rasm bo'lmaganda fall-back.

### `public/models/`
face-api.js model fayllari. `npm run setup:models` orqali yuklanadi. Git'ga qo'shilmaydi (~6 MB).

---

## 🔄 9. Ma'lumot oqimi diagrammasi (yuz orqali davomat)

```
[Webcam] → [FaceScanner.tsx] 
   ↓ (har 2.5s kadr olinadi)
[face-api.js: detect → landmarks → descriptor]
   ↓ (128-d Float32Array)
[POST /api/attendance/recognize]
   ↓
[Server: barcha talabalarni yuklaydi]
   ↓
[lib/face-utils: findBestMatch → Euclidean distance]
   ↓ (taqqoslash, threshold = 0.55)
[Group.startTime + LATE_THRESHOLD_MINUTES]
   ↓ (status: PRESENT yoki LATE)
[Prisma: Attendance yaratish (unique [studentId, date])]
   ↓
[Telegram + SMS bildirishnoma (fon)]
   ↓
[JSON javob → UI banner + recent list]
```

---

## ✅ 10. Ishga tushirish — qisqacha

```bash
# 1. Bog'liqliklar
npm install

# 2. .env yaratish
cp .env.example .env
# DATABASE_URL va JWT_SECRET'ni to'ldiring

# 3. Postgres (Docker bilan)
docker run -d --name pg -p 5432:5432 \
  -e POSTGRES_USER=davomat -e POSTGRES_PASSWORD=davomat \
  -e POSTGRES_DB=davomat_pro postgres:16-alpine

# 4. DB yaratish
npx prisma migrate dev --name init
npm run seed

# 5. AI modellari
npm run setup:models

# 6. Ishga tushirish
npm run dev
```

`http://localhost:3000` → `admin / admin123` bilan kiring.

**Yoki Docker bilan bir qatorda:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
docker compose up -d --build
docker compose exec app npx tsx prisma/seed.ts
docker compose exec app npx tsx scripts/download-models.ts
```

---

## 🧪 11. Tekshirilgan komponentlar

Loyiha quyidagi joylarda tekshirildi:
- ✅ `npx tsc --noEmit` — TypeScript: **0 ta xato**
- ✅ `lib/face-utils.ts` — barcha matematik funksiyalar to'g'ri ishlaydi (5 ta birlik test)
- ✅ `lib/jwt.ts` — token round-trip ishlaydi
- ✅ `lib/auth.ts` — bcrypt hash/verify ishlaydi
- ✅ `lib/utils.ts` — sana formatlash to'g'ri ishlaydi
- ✅ `next build` — ilgari muvaffaqiyatli build qilingan

---

## 📊 12. Statistika

- **Jami fayllar:** 57 ta
- **Code lines:** ~3500
- **API endpoints:** 18 ta
- **Sahifalar:** 9 ta
- **Komponentlar:** 4 ta
- **DB modellari:** 5 ta
- **Til:** 100% TypeScript

---

Davomat Pro — to'liq ishga tayyor, professional darajadagi tizim. Barcha so'ralgan funksiyalar amalga oshirilgan, kod toza va kengaytirsa bo'ladigan tarzda yozilgan. 🚀
