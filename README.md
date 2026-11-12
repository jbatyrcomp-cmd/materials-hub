# Oquw / Materials Hub

Guruh bo'lib o'quv materiallarini saqlash, konspekt yuritish, vaqt chegarali testlar topshirish, SM-2 flashcards takrorlash va taqvimni boshqarish uchun mo'ljallangan veb-sayt (`O'zbek` va `Türkmençe` tillarida).

## Asosiy imkoniyatlar

- **Ism + Familiya + Parol va Admin Tasdig'i**:
  - Har kim **Ism**, **Familiya** va o'z **Paroli** bilan ro'yxatdan o'tadi.
  - Birinchi ro'yxatdan o'tgan foydalanuvchi avtomatik `ADMIN` bo'ladi; keyingi a'zolar `PENDING` holatida yaratiladi va Admin `/admin` panelida tasdiqlaganidan keyin materiallarni ko'ra oladi.
- **Materiallar va Versiyalar tarixi**:
  - Fayllar (PDF/rasmlar brauzerda ko'rinadi; Cloudflare R2 / S3 presigned URL orqali 50 MB gacha bevosita yuklash + lokal `./uploads` qo'llab-quvvatlovi).
  - Sayt ichidagi Markdown + KaTeX formulali konspektlar.
  - YouTube / Google Drive / Telegram / veb havolalar (YouTube va Drive inline pleyerda ochiladi).
  - Versiyalar tarixi (`v1`, `v2`, ...) va eski versiyani tiklash, teglar, tezkor qidiruv, izohlar (reply bilan), like va saqlanganlar.
- **Rasmiy Testlar va Reyting**:
  - Faqat `ADMIN` tuzadigan vaqt chegarali va **1 urinishli** testlar (`SINGLE` va `MULTI` savollar, server-tomonlama taymer).
  - Rasmiy test ballariga asoslangan guruh reyting jadvali (Leaderboard).
- **SM-2 Flashcards & Taqvim**:
  - Har bir a'zo to'plam tuzishi (`Savol | Javob` bulk import bilan) va SuperMemo-2 bo'yicha takrorlashi mumkin.
  - Uy vazifalar va imtihonlar taqvimi hamda shaxsiy bajarilganlik belgilari.

---

## Vercel + PostgreSQL + Cloudflare R2 ga Deploy Qilish

1. **PostgreSQL baza oching** (masalan, [Neon](https://neon.tech) yoki [Supabase](https://supabase.com) bepul tier) va `DATABASE_URL` ni oling.
2. **Cloudflare R2 (yoki S3) bucket oching**:
   - Bucket CORS sozlamasida sayt domeningizdan `PUT` va `GET` so'rovlariga ruxsat bering (`AllowedMethods: ["GET", "PUT", "HEAD"]`, `AllowedHeaders: ["*"]`).
   - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` ni oling.
3. **GitHub'ga yuklang va Vercel'ga ulang**:
   - Vercel Environment Variables ga quyidagilarni kiriting:
     - `DATABASE_URL`
     - `SESSION_SECRET` (kamida 32 belgili maxfiy satr)
     - `STORAGE_PROVIDER="s3"`
     - `S3_ENDPOINT`, `S3_REGION="auto"`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
     - `MAX_UPLOAD_SIZE_MB="50"`
4. **Bazaga jadvallarni yozing** (o'z kompyuteringizdan `.env` ga `DATABASE_URL` ni qo'yib bir marta ishga tushiring):
   ```bash
   npx prisma db push
   npm run db:seed   # Ixtiyoriy: namuna fanlar va boshlang'ich Admin/Talaba yaratadi
   ```

> `prisma/seed.ts` orqali yaratiladigan namuna hisoblar:
> - **Admin**: `Azizbek` `Karimov` / parol: `admin123`
> - **Talaba**: `Myrat` `Gurbanow` / parol: `talaba123`

---

## Lokal kompyuterda oflayn (SQLite) sinab ko'rish

Agar kompyuteringizda PostgreSQL bo'lmasa, tayyor [prisma/schema.sqlite.prisma](prisma/schema.sqlite.prisma) orqali sinashingiz mumkin:

```bash
npm run db:sqlite:generate
npm run db:sqlite:push
npm run db:seed
npm run dev
```

Avtomatik testlar va tip tekshiruvi:

```bash
npm test
npm run typecheck
npm run build
```
