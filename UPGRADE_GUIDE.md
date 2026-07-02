# 🎉 Davomat Pro — V2: O'quvchi va Ota-ona rollari qo'shildi

## ✨ Yangi imkoniyatlar

### Endi 4 ta rol mavjud:

| Rol | Imkoniyatlar |
|-----|--------------|
| **🔴 Administrator** | Hammasini boshqaradi |
| **🔵 O'qituvchi** | Faqat **o'z guruhlari** uchun va **dars kuni** davomat ola oladi |
| **🟢 O'quvchi** | Faqat **o'z davomatini** ko'radi (statistika bilan) |
| **🟡 Ota-ona** | Bog'langan **farzand(lar)i** davomatini ko'radi |

### Yangi sahifalar:
- `/parents` — Admin uchun ota-onalarni boshqarish
- `/my-attendance` — O'quvchi uchun shaxsiy davomat
- `/my-children` — Ota-ona uchun farzandlar davomati

### Yangi funksiyalar:
- **Dars kunlari (Du, Se, Cho...)** — har guruhga maxsus belgilash
- O'qituvchi **dars kunidan tashqari** davomat ololmaydi
- Talabaga **bir bosishda akkaunt yaratish** (avtomatik parol)
- Ota-onaga **bir nechta farzandni bog'lash**

---

## 📋 Yangilashga qadamma-qadam qoʻllanma

### 1-qadam: Eski konteynerni to'xtating

```bash
cd C:\Users\User\Desktop\davomat-pro
docker compose down
```

> ⚠️ `docker compose down -v` ishlatmang! Bu ma'lumotlarni o'chiradi. Oddiy `down` esa ma'lumotlar bazasini saqlab qoladi.

### 2-qadam: Eski papkani saqlang (zaxira)

```bash
cd ..
ren davomat-pro davomat-pro-old
```

### 3-qadam: Yangi ZIP'ni oching

Yuqoridagi yangi `davomat-pro.zip` faylni `Desktop`'ga oching. Yangi `davomat-pro` papka paydo bo'ladi.

### 4-qadam: Eski .env va public/models'ni ko'chirib o'tkazing

```bash
copy davomat-pro-old\.env davomat-pro\.env
xcopy davomat-pro-old\public\models davomat-pro\public\models /E /I /Y
```

### 5-qadam: Yangi versiyani build qiling

```bash
cd davomat-pro
docker compose up -d --build
```

⏳ ~3-5 daqiqa.

### 6-qadam: Database sxemasini yangilang

Bu eng muhim qadam. Yangi field'lar (lessonDays, userId, va h.k.) qo'shiladi:

```bash
docker compose exec app npx prisma db push --accept-data-loss
```

> `--accept-data-loss` faqat ishlatilmaydigan ustunlarni o'zgartirish uchun. Sizning **mavjud** ma'lumotlaringiz (admin, o'qituvchilar, talabalar, davomat tarixi) **saqlanib qoladi**.

Quyidagi xabar chiqishi kerak:
```
🚀  Your database is now in sync with your Prisma schema.
```

### 7-qadam: Namunaviy STUDENT/PARENT akkauntlarni qo'shing (ixtiyoriy)

```bash
docker compose exec app npx tsx prisma/seed.ts
```

Yangi qo'shiladi:
- `jasur / student123` — STUDENT (Abdullayev Jasur)
- `ota_jasur / parent123` — PARENT (Jasurning otasi)

Eski admin/teacher akkauntlari **buzilmaydi**.

### 8-qadam: Brauzerda sinab ko'ring

🌐 **http://localhost:3000**

#### Sinov akkauntlari:

| Login | Parol | Rol | Nimani ko'radi |
|-------|-------|-----|----------------|
| `admin` | `admin123` | ADMIN | Hammasini |
| `aliyev` | `teacher123` | TEACHER | O'z guruhlarini |
| `jasur` | `student123` | STUDENT | Faqat o'z davomatini |
| `ota_jasur` | `parent123` | PARENT | Farzandlari davomatini |

---

## 💡 Ishlatish qo'llanmasi

### O'quvchiga akkaunt yaratish (admin sifatida)

1. **Talabalar** sahifasiga kiring
2. Talaba kartasida **🔑 ikonkani** bosing
3. Modal'da:
   - Username avtomatik taklif qilinadi (yoki o'zingiz yozing)
   - Parol avtomatik yaratiladi (yoki o'zingiz yozing)
   - **📋 Nusxa olish** tugmalari yordamida login va parolni nusxa oling
4. **Yaratish** tugmasini bosing
5. Login va parolni o'quvchiga bering

### Ota-ona qo'shish

1. **Ota-onalar** sahifasiga kiring (faqat admin)
2. **+ Yangi ota-ona** tugmasini bosing
3. Ma'lumotlarni to'ldiring (F.I.Sh, username, parol)
4. **Farzandlar** ro'yxatidan kerakli o'quvchilarni belgilang (bir nechtasini ham mumkin)
5. **Yaratish**

### Dars kunlarini sozlash (guruh)

1. **Guruhlar** sahifasiga kiring
2. Guruhni **tahrirlash**
3. **Dars kunlari** bo'limida kerakli kunlarni bosing (Du, Se, Cho...)
4. Saqlang

> ⚠️ **Muhim:** O'qituvchi **faqat shu kunlarda** "Yuz orqali davomat" sahifasidan foydalana oladi. Boshqa kunlarda xato xabari chiqadi.

### O'qituvchining cheklovi

O'qituvchi `/attendance/scan` sahifasini ochsa va:
- Bugun uning guruhlaridan biriga dars yo'q bo'lsa → **"Bugun sizda dars yo'q"** xabari
- O'z guruhi emas talaba kameraga qarasa → tan olinmaydi
- Boshqa o'qituvchining guruhini tanlamoqchi bo'lsa → **"Bu guruh sizga tegishli emas"**

---

## 🔍 Muammolar va yechimlar

### "Yuz orqali davomat" sahifasiga kira olmayapman (o'qituvchi)
- Sizga guruh tayinlanganmi? Admin bilan bog'laning.
- Bugun sizning guruhingizda dars bormi? Guruh sozlamalarida `lessonDays` ni tekshiring.

### O'quvchi/ota-ona "Mening davomatim" ga kirsa "Profil topilmadi" deyapti
- Admin sifatida kirib, o'sha o'quvchi/ota-onaga akkaunt to'g'ri bog'langaniga ishonch hosil qiling.
- O'quvchi bo'lsa: Talabalar sahifasida 🔑 tugmasini bosib akkaunt qaytadan yarating.
- Ota-ona bo'lsa: Ota-onalar sahifasida farzand bog'langaniga ishonch hosil qiling.

### "Yangi rollar yangilash xatosi"
Yangilashda muammo bo'lsa, eski versiyaga qaytish:
```bash
cd ..
docker compose -f davomat-pro\docker-compose.yml down
rmdir /s /q davomat-pro
ren davomat-pro-old davomat-pro
cd davomat-pro
docker compose up -d --build
```

---

## 🚀 Tabriklayman!

Endi sizda to'liq professional davomat tizimi bor:
- 4 ta foydalanuvchi roli
- Yuz orqali avtomatik davomat
- Dars kunlari bo'yicha cheklov
- Shaxsiy davomat statistika
- Ota-ona portali

Savol bo'lsa, doim yozing! 💬
