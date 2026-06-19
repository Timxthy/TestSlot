-- 0009_delivery_fixes.sql — fix notification delivery (code review).
--
-- 1. Late admin approvals were never emailed: the cron filtered on the post's
--    created_at, but a post approved >LOOKBACK after creation never matched.
--    Track approved_at and filter on it instead.
-- 2. Failed sends were never retried: the unique (user, post, channel) index
--    turned the re-insert into a no-op. Track attempts so the cron can retry a
--    failed delivery up to a cap (logic in packages/shared decideDelivery()).
--
-- COMPLIANCE unchanged: deliveries fire only on user-submitted, moderated
-- community cancellation posts — never on DVSA scanning.

alter table cancellation_posts add column if not exists approved_at timestamptz;

-- Backfill: existing approved posts are treated as approved at creation time.
update cancellation_posts
set approved_at = created_at
where moderation_status = 'approved' and approved_at is null;

-- Retry accounting for the delivery cron.
alter table notification_deliveries add column if not exists attempts int not null default 0;
