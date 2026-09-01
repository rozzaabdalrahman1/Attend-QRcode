-- مرجع بنية قاعدة البيانات. لا تحتاج لتشغيله إذا كانت الجداول المذكورة في ملف التسليم موجودة بالفعل.
create table if not exists public.att_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.att_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.att_groups(id) on delete cascade,
  number_in_group integer not null check (number_in_group > 0),
  name text not null,
  parent_phone text,
  created_at timestamptz not null default now(),
  unique (group_id, number_in_group)
);

create table if not exists public.att_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.att_students(id) on delete cascade,
  date date not null,
  time time not null,
  whatsapp_status text not null default 'pending'
    check (whatsapp_status in ('pending','sent','failed','skipped')),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create table if not exists public.att_monthly_exports (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  file_path text not null,
  row_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- أنشئ Storage bucket باسم monthly-reports واجعله Public من لوحة Supabase.

-- المعلمون المسموح لهم بالدخول برقم الهاتف
create table if not exists public.att_teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- مثال: أضف رقم المعلم بصيغة دولية
-- insert into public.att_teachers (name, phone) values ('اسم المعلم', '+201012345678');
