-- =====================================================================
-- JIX — مخطط قاعدة البيانات + سياسات الحماية (Row Level Security)
-- شغّل هذا الملف كاملاً داخل Supabase → SQL Editor على مشروع جديد.
-- هذا هو الجزء "الحقيقي" من الحماية: حتى لو عدّل شخص كود المتصفح،
-- قاعدة البيانات نفسها ترفض أي عملية لا يسمح بها صاحبها.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- الملفات الشخصية ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'مستخدم JIX',
  username text unique not null,
  bio text default '',
  avatar_url text default '',
  coins integer not null default 100,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- المنشورات ----------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  video_url text not null,
  caption text default '',
  allow_comments boolean not null default true,
  allow_share boolean not null default true,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- الإعجابات ----------
create table if not exists likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------- التعليقات ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now()
);

-- ---------- المتابعة ----------
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------- الدردشة الجماعية ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'global',
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text not null,
  message_text text not null check (char_length(message_text) between 1 and 300),
  created_at timestamptz not null default now()
);

-- ---------- الرسائل الخاصة ----------
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ---------- الإشعارات ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('like','comment','follow','gift','system')),
  actor_id uuid references profiles(id) on delete set null,
  post_id uuid references posts(id) on delete set null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- سجل الهدايا (المصدر الوحيد الموثوق لرصيد العملات هو هذا الجدول + الخادم) ----------
create table if not exists gifts_log (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  gift_id text not null,
  coins integer not null check (coins > 0),
  post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- التحديات ----------
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  hashtag text not null,
  title text not null,
  prize_coins integer not null default 0,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- تفعيل Row Level Security على كل الجداول (إلزامي — بدونه أي شخص
-- يملك مفتاح anon العام يستطيع قراءة/تعديل كل شيء)
-- =====================================================================
alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table messages enable row level security;
alter table direct_messages enable row level security;
alter table notifications enable row level security;
alter table gifts_log enable row level security;
alter table challenges enable row level security;

-- ---------- profiles ----------
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- ---------- posts ----------
create policy "posts_select_all" on posts for select using (true);
create policy "posts_insert_own" on posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on posts for delete using (auth.uid() = user_id);

-- ---------- likes ----------
create policy "likes_select_all" on likes for select using (true);
create policy "likes_insert_own" on likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on likes for delete using (auth.uid() = user_id);

-- ---------- comments ----------
create policy "comments_select_all" on comments for select using (true);
create policy "comments_insert_own" on comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on comments for delete using (auth.uid() = user_id);

-- ---------- follows ----------
create policy "follows_select_all" on follows for select using (true);
create policy "follows_insert_own" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows for delete using (auth.uid() = follower_id);

-- ---------- messages (الدردشة الجماعية) ----------
create policy "messages_select_all" on messages for select using (true);
create policy "messages_insert_own" on messages for insert with check (auth.uid() = user_id);

-- ---------- direct_messages: فقط طرفا المحادثة يريان الرسالة ----------
create policy "dm_select_participant" on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "dm_insert_own" on direct_messages for insert with check (auth.uid() = sender_id);

-- ---------- notifications: كل مستخدم يرى إشعاراته فقط ----------
create policy "notif_select_own" on notifications for select using (auth.uid() = user_id);
create policy "notif_update_own" on notifications for update using (auth.uid() = user_id);

-- ---------- gifts_log ----------
create policy "gifts_select_all" on gifts_log for select using (true);
create policy "gifts_insert_own" on gifts_log for insert with check (auth.uid() = sender_id);

-- ---------- challenges: قراءة عامة فقط (الإدارة تُدخلها من لوحة تحكم بصلاحيات مرتفعة) ----------
create policy "challenges_select_all" on challenges for select using (true);

-- =====================================================================
-- دالة إرسال هدية آمنة من طرف الخادم (Server-side) — هذه أهم نقطة أمان
-- بخصوص العملات: بدلاً من أن يخصم المتصفح العملات مباشرة (قابل للتلاعب)،
-- الدالة تعمل داخل قاعدة البيانات بمعاملة واحدة atomic تمنع التلاعب أو
-- السباق (Race Condition) عند إرسال هدايا متعددة بسرعة.
-- =====================================================================
create or replace function send_gift(p_receiver uuid, p_gift_id text, p_coins integer, p_post_id uuid default null)
returns void
language plpgsql
security definer
as $$
begin
  if p_coins <= 0 then
    raise exception 'invalid coin amount';
  end if;

  update profiles set coins = coins - p_coins
  where id = auth.uid() and coins >= p_coins;

  if not found then
    raise exception 'insufficient balance';
  end if;

  insert into gifts_log (sender_id, receiver_id, gift_id, coins, post_id)
  values (auth.uid(), p_receiver, p_gift_id, p_coins, p_post_id);

  insert into notifications (user_id, type, actor_id, post_id, message)
  values (p_receiver, 'gift', auth.uid(), p_post_id, 'أرسل لك أحدهم هدية 🎁');
end;
$$;

-- =====================================================================
-- Storage: أنشئ Bucket باسم "videos" من لوحة Supabase → Storage، واجعله
-- Public للقراءة، ثم فعّل سياسة رفع تسمح فقط لصاحب المجلد بالكتابة فيه:
--   Policy (INSERT): bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
-- =====================================================================
