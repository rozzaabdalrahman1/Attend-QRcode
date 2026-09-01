# سجل الحضور

نظام حضور عربي RTL.

- مجموعات وطلاب.
- رقم الطالب فريد داخل المجموعة.
- تسجيل حضور يومي ومنع التكرار.
- دخول المعلم برقم الهاتف + PIN.
- زر WhatsApp يدوي بجانب الطالب؛ لا يوجد Twilio ولا إرسال تلقائي.
- تقارير CSV شهرية.

## إعداد دخول المعلم

في `public/index.html` عدّل:

```js
const TEACHER_PHONE = "+201000000000";
const TEACHER_PIN = "1234";
```

> هذا دخول على مستوى الواجهة فقط، وليس Supabase Auth.

## WhatsApp

بعد تسجيل الحضور، اضغط «إرسال واتساب». سيفتح WhatsApp/WhatsApp Web برسالة جاهزة إلى رقم ولي الأمر، ويمكن تعديلها قبل الإرسال.

## Supabase

URL:
`https://qbsetixizzzmlmnkaqce.supabase.co`

الجداول:
`att_groups`, `att_students`, `att_attendance`, `att_monthly_exports`

Storage:
`monthly-reports` (Public)

ضع Supabase anon key العام في `public/index.html`.

## Environment Variables

لا توجد أي متغيرات Twilio.

لتشغيل التقرير الشهري على Vercel فقط:

```text
SUPABASE_URL=https://qbsetixizzzmlmnkaqce.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role secret>
```
