# 🎉 Davomat Pro V3 — Maktab tizimiga aylandi!

## ✨ Yangi imkoniyatlar

### 📚 To'liq dars jadvali tizimi
- **Paralar (1-dars, 2-dars...)** — vaqtlar bir marta belgilanadi
- **Fanlar** — Matematika, Ona tili, Fizika va boshqalar
- **Dars jadvali** — Fan + Sinf + O'qituvchi + Kun + Para

### 🎯 Aqlli yo'qlama tizimi
- **Dars boshlanganda kamera avtomatik ochiladi** (5 daqiqaga)
- **5 daqiqa o'tgach kamera o'chadi** — yo'qlama tugaydi
- **Kelmaganlar avtomatik "Kelmadi"** deb belgilanadi
- Countdown — yo'qlama qachon yopilishini o'qituvchi ko'rib turadi

### 👨‍🏫 O'qituvchi uchun sodda panel
- O'qituvchi tizimga kirsa — to'g'ridan-to'g'ri **"Bugungi darslar"** sahifasi
- Faqat o'z darslarini ko'radi
- Dars boshlangach **"Yo'qlama olish"** tugmasi paydo bo'ladi
- Boshqa hech qanday menyu yo'q — sodda va aniq

### 📊 Excel + ZIP orqali ommaviy yuklash
- Excel jadvalida o'quvchilar ro'yxati
- ZIP arxivda rasmlar
- **Avtomatik login va parol** har bir o'quvchi uchun
- Yakunda barcha login/parollar ro'yxatini yuklab olasiz

### 🔐 Avtomatik akkaunt yaratish
- Talaba qo'shilganda **avtomatik login** (`aliyev_s` formatida)
- **Avtomatik 8-belgili parol**
- Admin har doim parolni ko'rib tura oladi

---

## 📋 Yangilashga qadamma-qadam

### 1. Eski versiyani to'xtatish

```bash
cd C:\Users\User\Desktop\davomat-pro
docker compose down
```

### 2. Eski papkani saqlash (zaxira)

```bash
cd ..
ren davomat-pro davomat-pro-old-v3
```

### 3. Yangi ZIP'ni Desktop'ga oching

`Desktop\davomat-pro` paydo bo'ladi.

### 4. Eski sozlamalarni va modellarni ko'chiring

```bash
copy davomat-pro-old-v3\.env davomat-pro\.env
xcopy davomat-pro-old-v3\public\models davomat-pro\public\models /E /I /Y
xcopy davomat-pro-old-v3\public\uploads davomat-pro\public\uploads /E /I /Y
```

### 5. Build qiling

```bash
cd davomat-pro
docker compose up -d --build
```

⏳ ~3-5 daqiqa.

### 6. ⚠️ DATABASE'NI YANGILASH (eng muhim)

> Bu safar **katta o'zgarishlar bor** (yangi `Period`, `Lesson`, `Subject` modellari).

```bash
docker compose exec app npx prisma db push --accept-data-loss
```

**Eslatma**: Hozir sxemada eski `Group.startTime` va `Group.lessonDays` o'chirildi (chunki endi vaqtlar `Period` modelida saqlanadi). Eski talabalar va admin/o'qituvchi akkauntlari saqlanib qoladi.

### 7. Yangi seed (paralar, fanlar, dars jadvali)

```bash
docker compose exec app npx tsx prisma/seed.ts
```

Quyidagi qo'shiladi:
- **6 ta para** (1-dars 08:00-08:45, 2-dars 08:50-09:35, ...)
- **8 ta fan**: Matematika, Ona tili, Fizika, Kimyo, Biologiya, Tarix, Ingliz tili, Geografiya
- **3 ta sinf**: 5-A, 5-B, 6-A
- **Dars jadvali**: 5-B sinf uchun Du/Se/Cho kunlarida to'liq jadval

---

## 🧪 Sinov

### Brauzerda **Ctrl + Shift + R** bilan saytni yangilang

### Test 1: Admin paneli

```
admin / admin123
```

Chap menyu:
- 🏠 **Bosh sahifa**
- 📅 **Dars jadvali**
- 📝 **Davomat tarixi**
- 👥 **Talabalar**
- 📤 **Excel orqali yuklash** ← YANGI!
- 🎓 **Sinflar**
- 📚 **Fanlar**
- ⏰ **Paralar** ← YANGI!
- 👨‍🏫 **O'qituvchilar**
- ❤️ **Ota-onalar**
- 📊 **Hisobotlar**

### Test 2: O'qituvchi paneli (asosiy o'zgarish!)

```
aliyev / teacher123
```

Avtomatik **/today** sahifasi ochiladi. Chap menyuda faqat:
- 📸 **Bugungi darslar**
- 📅 **Dars jadvali**
- 📝 **Davomat tarixi**

> **Boshqa hech narsa yo'q!** O'qituvchi panel sodda va aniq.

### Test 3: Yo'qlama olish

1. **aliyev** sifatida kiring
2. **Bugungi darslar** sahifasida darslar ko'rinadi
3. Hozirgi vaqtga qarab:
   - 🔒 **"Hali boshlanmagan"** — countdown ko'rsatadi
   - ✅ **"Yo'qlama olish"** tugmasi (faqat 5 daqiqa ichida)
   - 🚫 **"Yo'qlama tugagan"**
4. **Yo'qlama olish** tugmasini bosing → kamera avtomatik ochiladi
5. Countdown ko'rinadi: "Yo'qlamani yopilishigacha 4:32"
6. 5 daqiqa o'tgach kamera avtomatik o'chadi va kelmaganlar "Kelmadi" deb belgilanadi

---

## 📊 Excel orqali talabalarni yuklash

### 1. Shablonni yuklab oling

**Excel orqali yuklash** → **Shablonni yuklab olish** tugmasi

Faylda quyidagi ustunlar:
- **F.I.Sh** — to'liq ism
- **Telefon** — talaba telefoni (ixtiyoriy)
- **Ota-ona telefoni** — (ixtiyoriy)
- **Sinf** — 5-A, 5-B va h.k.
- **Rasm** — rasm fayl nomi (masalan: `jasur.jpg`)

### 2. Rasmlarni ZIP qiling

Barcha rasm fayllarini bitta papkaga yig'ib ZIP qiling. Har bir rasm nomi Excel'dagi "Rasm" ustunidagi nom bilan bir xil bo'lishi kerak.

### 3. Yuklang

- Excel faylni tanlang
- ZIP'ni tanlang (ixtiyoriy)
- **Yuklashni boshlash**

Tizim avtomatik:
- ✅ Har bir o'quvchi uchun **login va parol generatsiya** qiladi
- ✅ **Sinflarni avtomatik yaratadi** (agar yo'q bo'lsa)
- ✅ Yakunda **barcha login/parollar ro'yxati**ni TXT fayl sifatida yuklab olishingiz mumkin

> ⚠️ **Eslatma**: Yuz tan olishni ishlatish uchun har bir o'quvchining yuzini tizimda alohida "scan" qilish kerak. Bu **Talabalar** sahifasida har bir talaba kartasidan amalga oshiriladi.

---

## 🐞 Muammolar va yechimlar

### Eski data yo'qoldi
Database push'da `--accept-data-loss` bayroq bilan yangi sxema qo'llandi. Sizning **mavjud admin va o'qituvchi akkauntlari saqlanadi**, lekin **eski "guruh ichidagi vaqt va dars kunlari"** o'chiriladi (chunki endi bular `Period` va `Lesson` modellarida).

Yangi dars jadvalini **Dars jadvali** sahifasidan qo'shing yoki `seed.ts` ishga tushiring.

### Kamera ochilmayapti
1. Brauzer kamerasiga ruxsat berdingizmi? (manzil qatori yonidagi 🔒 belgisini bosing)
2. **Bugungi darslar** sahifasida dars **"Yo'qlama olish"** holatida bo'lishi kerak (sariq ranglib, hali ochilmagan bo'lsa kutib turing)

### "Bugun darsingiz yo'q"
- O'qituvchi sifatida — siz uchun bugungi kunda dars jadvali yo'q
- Admin sifatida **Dars jadvali** sahifasidan dars qo'shing

### Eskiga qaytish
```bash
cd C:\Users\User\Desktop
docker compose -f davomat-pro\docker-compose.yml down
rmdir /s /q davomat-pro
ren davomat-pro-old-v3 davomat-pro
cd davomat-pro
docker compose up -d --build
```

---

## 🎯 Yakuniy ish jarayoni

1. **Admin**:
   - Paralar belgilaydi (1-dars 08:00-08:45, ...)
   - Fanlarni qo'shadi (Matematika, Ona tili, ...)
   - Sinflarni yaratadi (5-A, 5-B, ...)
   - O'qituvchilarni qo'shadi
   - Excel orqali talabalarni yuklaydi
   - **Dars jadvali** tuzadi: Fan + Sinf + O'qituvchi + Kun + Para

2. **O'qituvchi**:
   - Tizimga kiradi → **Bugungi darslar**
   - Dars boshlanishini kutadi (countdown)
   - **Yo'qlama olish** bosadi → kamera ochiladi
   - Talabalar yuzini kameraga ko'rsatadi
   - 5 daqiqa o'tgach kamera avtomatik o'chadi

3. **O'quvchi/Ota-ona**:
   - O'z davomatini istalgan vaqtda ko'radi
   - Fan bo'yicha statistika

---

Tabriklayman! Sizda endi to'liq maktab davomat tizimi bor 🚀
