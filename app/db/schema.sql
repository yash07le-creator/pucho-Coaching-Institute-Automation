-- db/schema.sql — GENERATED from os.yaml by pucho-os (2026-11-03). Idempotent: apply, then apply again.
-- Entity tables are named after os.yaml entities; columns are the declared names in lower case.

-- db/base.sql — the tables every Pucho OS has, whatever os.yaml says: people, sessions, one-time codes, files, jobs, settings, roles.
-- Idempotent (standards §5): safe to apply twice. Entity tables follow in db/schema.sql, generated from os.yaml.
-- Roles (§19.1 least privilege) are created by scripts/db.mjs migrate when the connected user may create roles —
-- `app` (DML on every table), `studio_reader` (SELECT on entity tables only — never users, sessions, otp_codes, files).

CREATE TABLE IF NOT EXISTS users (
  id              text PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  name            text NOT NULL,
  role            text NOT NULL,
  password_hash   text,                       -- $argon2id$… or NULL until the person sets one (one-time code sign-in still works)
  must_change_password boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  deactivated_at  timestamptz,
  deactivated_by  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash      text PRIMARY KEY,           -- SHA-256 of the opaque cookie token; the token itself is never stored
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  user_agent      text
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS otp_codes (
  email           text NOT NULL,
  code_hash       text NOT NULL,              -- HMAC-SHA256(code, AUTH_PEPPER)
  expires_at      timestamptz NOT NULL,
  attempts        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email)
);

CREATE TABLE IF NOT EXISTS files (                -- uploads live in the database (D6), under the plan's storage cap
  id              text PRIMARY KEY,
  name            text NOT NULL,
  mime            text NOT NULL,
  size            bigint NOT NULL,
  data            bytea NOT NULL,
  entity          text,
  record_id       text,
  uploaded_by     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (                 -- a flow that runs longer than the sync window (async: true) is tracked here
  id              text PRIMARY KEY,
  flow            text NOT NULL,
  action          text NOT NULL,
  status          text NOT NULL DEFAULT 'queued', -- queued · done · failed
  payload         jsonb,
  result          jsonb,
  requested_by    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz
);

CREATE TABLE IF NOT EXISTS signin_attempts (      -- sign-in rate limit per account and per address (§19.2)
  key             text PRIMARY KEY,
  count           integer NOT NULL DEFAULT 0,
  window_start    timestamptz NOT NULL DEFAULT now()
);

-- v5.1 · the app's own settings, edited by an administrator in Settings (app_url, inbound_token, inbound_token_prev,
-- inbound_token_prev_until, company_name, app_name, webhook:<FLOW>). A missing key falls back to the environment.
CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), updated_by text);

-- v5.1 · roles (Level 2): a role = label + description + pages, each page `view` or `edit`. base_role = the built-in role it
-- started from (record scope + home). The os.yaml roles are inserted by db/schema.sql (built_in = true), never overwritten.
CREATE TABLE IF NOT EXISTS app_roles (key text PRIMARY KEY, label text NOT NULL, description text NOT NULL DEFAULT '', base_role text NOT NULL,
  pages jsonb NOT NULL DEFAULT '{}', built_in boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by text);

-- ALTERs below every CREATE (§5): a column added after the first release lands here, never above its table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_email boolean NOT NULL DEFAULT false;   -- v5.1 temporary admin (G8)


CREATE TABLE IF NOT EXISTS "leads" (
  "lead_id" text PRIMARY KEY,
  "created_at" timestamptz,
  "name" text,
  "phone" text,
  "email" text,
  "course" text,
  "source" text,
  "notes" text,
  "stage" text,
  "grade" text,
  "score" numeric,
  "ai_summary" text,
  "next_action" text,
  "call_status" text,
  "last_called_at" timestamptz,
  "transcript" text,
  "assigned_to" text,
  "next_followup_at" timestamptz,
  "lost_reason" text,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads" ("stage");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" ("created_at");

CREATE TABLE IF NOT EXISTS "students" (
  "student_id" text PRIMARY KEY,
  "enrolled_at" timestamptz,
  "name" text,
  "student_phone" text,
  "parent_name" text,
  "parent_phone" text,
  "course" text,
  "batch" text,
  "address" text,
  "status" text,
  "attendance_pct" numeric,
  "last_score" numeric,
  "avg_score" numeric,
  "class_rank" numeric,
  "strong_subjects" text,
  "weak_subjects" text,
  "performance_trend" text,
  "fee_status" text,
  "fee_amount_inr" numeric,
  "fee_due_date" date,
  "mentor" text,
  "counsellor" text,
  "issue_type" text,
  "main_issue" text,
  "last_counselled_at" timestamptz,
  "last_report_at" timestamptz,
  "last_parent_call_at" timestamptz,
  "parent_sentiment" text,
  "parent_concern" text,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "students_status_idx" ON "students" ("status");
CREATE INDEX IF NOT EXISTS "students_enrolled_at_idx" ON "students" ("enrolled_at");

CREATE TABLE IF NOT EXISTS "fees" (
  "fee_id" text PRIMARY KEY,
  "created_at" timestamptz,
  "student_id" text,
  "student_name" text,
  "parent_name" text,
  "parent_phone" text,
  "course" text,
  "instalment" text,
  "amount_inr" numeric,
  "paid_inr" numeric,
  "balance_inr" numeric,
  "due_date" date,
  "days_overdue" numeric,
  "status" text,
  "reminder_count" numeric,
  "last_reminder_at" timestamptz,
  "payment_link" text,
  "promise_date" date,
  "parent_response" text,
  "paid_at" timestamptz,
  "payment_mode" text,
  "receipt_no" text,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "fees_status_idx" ON "fees" ("status");
CREATE INDEX IF NOT EXISTS "fees_created_at_idx" ON "fees" ("created_at");

CREATE TABLE IF NOT EXISTS "attendance" (
  "att_id" text PRIMARY KEY,
  "session_id" text,
  "date" timestamptz,
  "batch" text,
  "student_id" text,
  "name" text,
  "course" text,
  "parent_name" text,
  "parent_phone" text,
  "status" text,
  "absences_this_week" numeric,
  "absences_this_month" numeric,
  "call_status" text,
  "reason" text,
  "category" text,
  "needs_followup" text,
  "followup_done" text,
  "marked_by" text,
  _seq bigserial
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_date_student_id_uq" ON "attendance" ("date", "student_id");
CREATE INDEX IF NOT EXISTS "attendance_status_idx" ON "attendance" ("status");
CREATE INDEX IF NOT EXISTS "attendance_date_idx" ON "attendance" ("date");

CREATE TABLE IF NOT EXISTS "tests" (
  "score_id" text PRIMARY KEY,
  "test_date" timestamptz,
  "test_name" text,
  "student_id" text,
  "name" text,
  "course" text,
  "batch" text,
  "subject" text,
  "marks" numeric,
  "max_marks" numeric,
  "score_pct" numeric,
  "status" text,
  "run_id" text,
  _seq bigserial
);
CREATE UNIQUE INDEX IF NOT EXISTS "tests_test_name_student_id_subject_uq" ON "tests" ("test_name", "student_id", "subject");
CREATE INDEX IF NOT EXISTS "tests_test_date_idx" ON "tests" ("test_date");

CREATE TABLE IF NOT EXISTS "calls" (
  "call_id" text PRIMARY KEY,
  "called_at" timestamptz,
  "agent" text,
  "person" text,
  "relation" text,
  "phone" text,
  "lead_id" text,
  "student_id" text,
  "course" text,
  "status" text,
  "duration_sec" numeric,
  "request_id" text,
  "outcome" text,
  "summary" text,
  "transcript" text,
  "grade" text,
  "score" numeric,
  "sentiment" text,
  "concern" text,
  "issue_type" text,
  "reason" text,
  "category" text,
  "needs_followup" text,
  "retry_at" timestamptz,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "calls_status_idx" ON "calls" ("status");
CREATE INDEX IF NOT EXISTS "calls_called_at_idx" ON "calls" ("called_at");

CREATE TABLE IF NOT EXISTS "messages" (
  "msg_id" text PRIMARY KEY,
  "sent_at" timestamptz,
  "to_name" text,
  "to_phone" text,
  "type" text,
  "agent" text,
  "template" text,
  "preview" text,
  "status" text,
  "student_id" text,
  "lead_id" text,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "messages_status_idx" ON "messages" ("status");
CREATE INDEX IF NOT EXISTS "messages_sent_at_idx" ON "messages" ("sent_at");

CREATE TABLE IF NOT EXISTS "alerts" (
  "alert_id" text PRIMARY KEY,
  "raised_at" timestamptz,
  "title" text,
  "detail" text,
  "kind" text,
  "severity" text,
  "student_id" text,
  "lead_id" text,
  "raised_by" text,
  "owner" text,
  "status" text,
  "resolution" text,
  "resolved_at" timestamptz,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts" ("status");
CREATE INDEX IF NOT EXISTS "alerts_raised_at_idx" ON "alerts" ("raised_at");

CREATE TABLE IF NOT EXISTS "team" (
  "member_id" text PRIMARY KEY,
  "name" text,
  "role" text,
  "phone" text,
  "email" text,
  "courses" text,
  "active" boolean,
  _seq bigserial
);

CREATE TABLE IF NOT EXISTS "attendance_sessions" (
  "session_id" text PRIMARY KEY,
  "date" date,
  "batch" text,
  "total_count" numeric,
  "present_count" numeric,
  "absent_count" numeric,
  "absentees" text,
  "marked_by" text,
  "saved_at" timestamptz,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "attendance_sessions_saved_at_idx" ON "attendance_sessions" ("saved_at");

CREATE TABLE IF NOT EXISTS "test_runs" (
  "run_id" text PRIMARY KEY,
  "test_date" date,
  "test_name" text,
  "batch" text,
  "subject" text,
  "max_marks" numeric,
  "total_count" numeric,
  "scored_count" numeric,
  "absent_count" numeric,
  "avg_pct" numeric,
  "marked_by" text,
  "saved_at" timestamptz,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "test_runs_saved_at_idx" ON "test_runs" ("saved_at");

CREATE TABLE IF NOT EXISTS "courses" (
  "course_id" text PRIMARY KEY,
  "name" text,
  "exam" text,
  "duration" text,
  "fee_per_instalment_inr" numeric,
  "instalments" numeric,
  "active" boolean,
  _seq bigserial
);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_name_uq" ON "courses" ("name");

CREATE TABLE IF NOT EXISTS "batches" (
  "batch_id" text PRIMARY KEY,
  "name" text,
  "start_time" text,
  "end_time" text,
  "days" text,
  "courses" text,
  "active" boolean,
  _seq bigserial
);
CREATE UNIQUE INDEX IF NOT EXISTS "batches_name_uq" ON "batches" ("name");

CREATE TABLE IF NOT EXISTS "audit_log" (
  "audit_id" text PRIMARY KEY,
  "at" timestamptz,
  "who" text,
  "flow" text,
  "action" text,
  "entity" text,
  "record_id" text,
  "summary" text,
  _seq bigserial
);
CREATE INDEX IF NOT EXISTS "audit_log_at_idx" ON "audit_log" ("at");

-- ── migrations: every ALTER below every CREATE (§5). A column added to os.yaml after go-live is added here on re-apply;
-- a renamed or removed column is a docs/migrations/<date>.md step (diff_os.py), never done silently.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "created_at" timestamptz;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stage" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "grade" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" numeric;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ai_summary" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "next_action" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "call_status" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "last_called_at" timestamptz;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "transcript" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_to" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "next_followup_at" timestamptz;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lost_reason" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND left(conname, 17) = 'leads_source_v49_' AND conname <> 'leads_source_v49_61f89f06' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'leads', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND conname = 'leads_source_v49_61f89f06') THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_source_v49_61f89f06" CHECK (("source" IN ('Instagram', 'WhatsApp', 'Google Ads', 'Referral', 'Website', 'Walk-in') OR "source" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND left(conname, 16) = 'leads_grade_v49_' AND conname <> 'leads_grade_v49_4f96aecd' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'leads', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND conname = 'leads_grade_v49_4f96aecd') THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_grade_v49_4f96aecd" CHECK (("grade" IN ('Not graded', 'HOT', 'WARM', 'COLD') OR "grade" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND left(conname, 16) = 'leads_score_v49_' AND conname <> 'leads_score_v49_d0dfcb31' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'leads', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND conname = 'leads_score_v49_d0dfcb31') THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_score_v49_d0dfcb31" CHECK ("score" >= 0 AND "score" <= 100) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND left(conname, 22) = 'leads_call_status_v49_' AND conname <> 'leads_call_status_v49_41ed0984' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'leads', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"leads"'::regclass AND conname = 'leads_call_status_v49_41ed0984') THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_call_status_v49_41ed0984" CHECK (("call_status" IN ('Scheduled', 'Calling', 'Completed', 'No Answer', 'Failed') OR "call_status" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "enrolled_at" timestamptz;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "student_phone" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "parent_name" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "parent_phone" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "batch" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "attendance_pct" numeric;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "last_score" numeric;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "avg_score" numeric;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "class_rank" numeric;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "strong_subjects" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "weak_subjects" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "performance_trend" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_status" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_amount_inr" numeric;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fee_due_date" date;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mentor" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "counsellor" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "issue_type" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "main_issue" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "last_counselled_at" timestamptz;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "last_report_at" timestamptz;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "last_parent_call_at" timestamptz;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "parent_sentiment" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "parent_concern" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 28) = 'students_attendance_pct_v49_' AND conname <> 'students_attendance_pct_v49_cfa206fa' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_attendance_pct_v49_cfa206fa') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_attendance_pct_v49_cfa206fa" CHECK ("attendance_pct" >= 0 AND "attendance_pct" <= 100) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 24) = 'students_last_score_v49_' AND conname <> 'students_last_score_v49_afaa9230' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_last_score_v49_afaa9230') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_last_score_v49_afaa9230" CHECK ("last_score" >= 0 AND "last_score" <= 100) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 23) = 'students_avg_score_v49_' AND conname <> 'students_avg_score_v49_dc80528b' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_avg_score_v49_dc80528b') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_avg_score_v49_dc80528b" CHECK ("avg_score" >= 0 AND "avg_score" <= 100) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 24) = 'students_class_rank_v49_' AND conname <> 'students_class_rank_v49_9ffba37e' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_class_rank_v49_9ffba37e') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_class_rank_v49_9ffba37e" CHECK ("class_rank" >= 1) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 31) = 'students_performance_trend_v49_' AND conname <> 'students_performance_trend_v49_f5c6c3a2' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_performance_trend_v49_f5c6c3a2') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_performance_trend_v49_f5c6c3a2" CHECK (("performance_trend" IN ('Improving', 'Stable', 'Declining') OR "performance_trend" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 24) = 'students_fee_status_v49_' AND conname <> 'students_fee_status_v49_3993025e' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_fee_status_v49_3993025e') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_fee_status_v49_3993025e" CHECK (("fee_status" IN ('Paid', 'Partial', 'Due', 'Overdue') OR "fee_status" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 28) = 'students_fee_amount_inr_v49_' AND conname <> 'students_fee_amount_inr_v49_befd7f0d' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_fee_amount_inr_v49_befd7f0d') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_fee_amount_inr_v49_befd7f0d" CHECK ("fee_amount_inr" > 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 24) = 'students_issue_type_v49_' AND conname <> 'students_issue_type_v49_b733d4ac' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_issue_type_v49_b733d4ac') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_issue_type_v49_b733d4ac" CHECK (("issue_type" IN ('ACADEMIC', 'PERSONAL', 'ATTENDANCE', 'FINANCIAL', 'OTHER') OR "issue_type" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"students"'::regclass AND left(conname, 30) = 'students_parent_sentiment_v49_' AND conname <> 'students_parent_sentiment_v49_f3e3fc85' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'students', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"students"'::regclass AND conname = 'students_parent_sentiment_v49_f3e3fc85') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_parent_sentiment_v49_f3e3fc85" CHECK (("parent_sentiment" IN ('Happy', 'Neutral', 'Concerned', 'No Answer') OR "parent_sentiment" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "created_at" timestamptz;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "student_name" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "parent_name" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "parent_phone" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "instalment" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "amount_inr" numeric;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "paid_inr" numeric;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "balance_inr" numeric;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "due_date" date;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "days_overdue" numeric;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "reminder_count" numeric;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "last_reminder_at" timestamptz;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "payment_link" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "promise_date" date;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "parent_response" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "paid_at" timestamptz;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "payment_mode" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS "receipt_no" text;
ALTER TABLE "fees" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND left(conname, 20) = 'fees_amount_inr_v49_' AND conname <> 'fees_amount_inr_v49_dc1ee82e' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'fees', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND conname = 'fees_amount_inr_v49_dc1ee82e') THEN
    ALTER TABLE "fees" ADD CONSTRAINT "fees_amount_inr_v49_dc1ee82e" CHECK ("amount_inr" > 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND left(conname, 18) = 'fees_paid_inr_v49_' AND conname <> 'fees_paid_inr_v49_424345f1' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'fees', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND conname = 'fees_paid_inr_v49_424345f1') THEN
    ALTER TABLE "fees" ADD CONSTRAINT "fees_paid_inr_v49_424345f1" CHECK ("paid_inr" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND left(conname, 22) = 'fees_days_overdue_v49_' AND conname <> 'fees_days_overdue_v49_3d1ed0d9' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'fees', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND conname = 'fees_days_overdue_v49_3d1ed0d9') THEN
    ALTER TABLE "fees" ADD CONSTRAINT "fees_days_overdue_v49_3d1ed0d9" CHECK ("days_overdue" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND left(conname, 24) = 'fees_reminder_count_v49_' AND conname <> 'fees_reminder_count_v49_48d26601' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'fees', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND conname = 'fees_reminder_count_v49_48d26601') THEN
    ALTER TABLE "fees" ADD CONSTRAINT "fees_reminder_count_v49_48d26601" CHECK ("reminder_count" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND left(conname, 22) = 'fees_payment_mode_v49_' AND conname <> 'fees_payment_mode_v49_925760f2' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'fees', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"fees"'::regclass AND conname = 'fees_payment_mode_v49_925760f2') THEN
    ALTER TABLE "fees" ADD CONSTRAINT "fees_payment_mode_v49_925760f2" CHECK (("payment_mode" IN ('UPI', 'Cash', 'Card', 'Bank Transfer', 'Cheque') OR "payment_mode" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "session_id" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "date" timestamptz;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "batch" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "parent_name" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "parent_phone" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "absences_this_week" numeric;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "absences_this_month" numeric;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "call_status" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "needs_followup" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "followup_done" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "marked_by" text;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND left(conname, 34) = 'attendance_absences_this_week_v49_' AND conname <> 'attendance_absences_this_week_v49_34c4633e' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND conname = 'attendance_absences_this_week_v49_34c4633e') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_absences_this_week_v49_34c4633e" CHECK ("absences_this_week" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND left(conname, 35) = 'attendance_absences_this_month_v49_' AND conname <> 'attendance_absences_this_month_v49_e883a55a' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND conname = 'attendance_absences_this_month_v49_e883a55a') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_absences_this_month_v49_e883a55a" CHECK ("absences_this_month" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND left(conname, 27) = 'attendance_call_status_v49_' AND conname <> 'attendance_call_status_v49_058fd9d5' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND conname = 'attendance_call_status_v49_058fd9d5') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_call_status_v49_058fd9d5" CHECK (("call_status" IN ('Present', 'Queued', 'WhatsApp Sent', 'Delivered', 'Failed') OR "call_status" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND left(conname, 24) = 'attendance_category_v49_' AND conname <> 'attendance_category_v49_b0394d05' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND conname = 'attendance_category_v49_b0394d05') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_category_v49_b0394d05" CHECK (("category" IN ('SICK', 'FAMILY', 'TRAVEL', 'PERSONAL', 'OTHER') OR "category" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND left(conname, 30) = 'attendance_needs_followup_v49_' AND conname <> 'attendance_needs_followup_v49_3ced53b3' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND conname = 'attendance_needs_followup_v49_3ced53b3') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_needs_followup_v49_3ced53b3" CHECK (("needs_followup" IN ('Yes', 'No') OR "needs_followup" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND left(conname, 29) = 'attendance_followup_done_v49_' AND conname <> 'attendance_followup_done_v49_8357f919' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance"'::regclass AND conname = 'attendance_followup_done_v49_8357f919') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_followup_done_v49_8357f919" CHECK (("followup_done" IN ('Yes', 'No') OR "followup_done" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "test_date" timestamptz;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "test_name" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "batch" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "marks" numeric;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "max_marks" numeric;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "score_pct" numeric;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "run_id" text;
ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"tests"'::regclass AND left(conname, 16) = 'tests_marks_v49_' AND conname <> 'tests_marks_v49_814a696b' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'tests', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"tests"'::regclass AND conname = 'tests_marks_v49_814a696b') THEN
    ALTER TABLE "tests" ADD CONSTRAINT "tests_marks_v49_814a696b" CHECK ("marks" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"tests"'::regclass AND left(conname, 20) = 'tests_max_marks_v49_' AND conname <> 'tests_max_marks_v49_3e311a57' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'tests', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"tests"'::regclass AND conname = 'tests_max_marks_v49_3e311a57') THEN
    ALTER TABLE "tests" ADD CONSTRAINT "tests_max_marks_v49_3e311a57" CHECK ("max_marks" > 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"tests"'::regclass AND left(conname, 17) = 'tests_status_v49_' AND conname <> 'tests_status_v49_2c0fd0ff' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'tests', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"tests"'::regclass AND conname = 'tests_status_v49_2c0fd0ff') THEN
    ALTER TABLE "tests" ADD CONSTRAINT "tests_status_v49_2c0fd0ff" CHECK (("status" IN ('Scored', 'Absent') OR "status" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "called_at" timestamptz;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "agent" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "person" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "relation" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "lead_id" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "duration_sec" numeric;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "outcome" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "transcript" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "grade" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "score" numeric;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "sentiment" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "concern" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "issue_type" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "needs_followup" text;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "retry_at" timestamptz;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 16) = 'calls_agent_v49_' AND conname <> 'calls_agent_v49_c6ade3a1' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_agent_v49_c6ade3a1') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_agent_v49_c6ade3a1" CHECK (("agent" IN ('Admission', 'Fee', 'Attendance', 'Academic', 'Parent') OR "agent" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 19) = 'calls_relation_v49_' AND conname <> 'calls_relation_v49_07aa1ed8' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_relation_v49_07aa1ed8') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_relation_v49_07aa1ed8" CHECK (("relation" IN ('Lead', 'Parent', 'Student') OR "relation" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 23) = 'calls_duration_sec_v49_' AND conname <> 'calls_duration_sec_v49_ce554b78' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_duration_sec_v49_ce554b78') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_duration_sec_v49_ce554b78" CHECK ("duration_sec" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 16) = 'calls_grade_v49_' AND conname <> 'calls_grade_v49_727f1e00' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_grade_v49_727f1e00') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_grade_v49_727f1e00" CHECK (("grade" IN ('HOT', 'WARM', 'COLD') OR "grade" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 16) = 'calls_score_v49_' AND conname <> 'calls_score_v49_d0dfcb31' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_score_v49_d0dfcb31') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_score_v49_d0dfcb31" CHECK ("score" >= 0 AND "score" <= 100) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 20) = 'calls_sentiment_v49_' AND conname <> 'calls_sentiment_v49_49db3e66' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_sentiment_v49_49db3e66') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_sentiment_v49_49db3e66" CHECK (("sentiment" IN ('Happy', 'Neutral', 'Concerned', 'No Answer') OR "sentiment" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 21) = 'calls_issue_type_v49_' AND conname <> 'calls_issue_type_v49_b733d4ac' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_issue_type_v49_b733d4ac') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_issue_type_v49_b733d4ac" CHECK (("issue_type" IN ('ACADEMIC', 'PERSONAL', 'ATTENDANCE', 'FINANCIAL', 'OTHER') OR "issue_type" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 19) = 'calls_category_v49_' AND conname <> 'calls_category_v49_b0394d05' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_category_v49_b0394d05') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_category_v49_b0394d05" CHECK (("category" IN ('SICK', 'FAMILY', 'TRAVEL', 'PERSONAL', 'OTHER') OR "category" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND left(conname, 25) = 'calls_needs_followup_v49_' AND conname <> 'calls_needs_followup_v49_3ced53b3' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'calls', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"calls"'::regclass AND conname = 'calls_needs_followup_v49_3ced53b3') THEN
    ALTER TABLE "calls" ADD CONSTRAINT "calls_needs_followup_v49_3ced53b3" CHECK (("needs_followup" IN ('Yes', 'No') OR "needs_followup" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sent_at" timestamptz;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "to_name" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "to_phone" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "agent" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "template" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "preview" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "lead_id" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"messages"'::regclass AND left(conname, 18) = 'messages_type_v49_' AND conname <> 'messages_type_v49_aa87caec' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'messages', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"messages"'::regclass AND conname = 'messages_type_v49_aa87caec') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_type_v49_aa87caec" CHECK (("type" IN ('Welcome', 'Fee Reminder', 'Payment Link', 'Absence Alert', 'Weekly Report', 'Staff Alert', 'General Update') OR "type" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"messages"'::regclass AND left(conname, 19) = 'messages_agent_v49_' AND conname <> 'messages_agent_v49_25902c23' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'messages', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"messages"'::regclass AND conname = 'messages_agent_v49_25902c23') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_v49_25902c23" CHECK (("agent" IN ('Admission', 'Fee', 'Attendance', 'Academic', 'Parent', 'Office') OR "agent" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "raised_at" timestamptz;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "detail" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "kind" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "severity" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "student_id" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "lead_id" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "raised_by" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "owner" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "resolution" text;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "resolved_at" timestamptz;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"alerts"'::regclass AND left(conname, 16) = 'alerts_kind_v49_' AND conname <> 'alerts_kind_v49_e00fc490' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'alerts', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"alerts"'::regclass AND conname = 'alerts_kind_v49_e00fc490') THEN
    ALTER TABLE "alerts" ADD CONSTRAINT "alerts_kind_v49_e00fc490" CHECK (("kind" IN ('Fee', 'Attendance', 'Academic', 'Lead', 'Parent') OR "kind" = '')) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"alerts"'::regclass AND left(conname, 20) = 'alerts_severity_v49_' AND conname <> 'alerts_severity_v49_e8381c44' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'alerts', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"alerts"'::regclass AND conname = 'alerts_severity_v49_e8381c44') THEN
    ALTER TABLE "alerts" ADD CONSTRAINT "alerts_severity_v49_e8381c44" CHECK (("severity" IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') OR "severity" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "courses" text;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "active" boolean;
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"team"'::regclass AND left(conname, 14) = 'team_role_v49_' AND conname <> 'team_role_v49_66f73cf6' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'team', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"team"'::regclass AND conname = 'team_role_v49_66f73cf6') THEN
    ALTER TABLE "team" ADD CONSTRAINT "team_role_v49_66f73cf6" CHECK (("role" IN ('Director', 'Office Admin', 'Counsellor', 'Mentor') OR "role" = '')) NOT VALID; END IF;
END $$;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "date" date;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "batch" text;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "total_count" numeric;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "present_count" numeric;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "absent_count" numeric;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "absentees" text;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "marked_by" text;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "saved_at" timestamptz;
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance_sessions"'::regclass AND left(conname, 36) = 'attendance_sessions_total_count_v49_' AND conname <> 'attendance_sessions_total_count_v49_4dc25d50' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance_sessions', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance_sessions"'::regclass AND conname = 'attendance_sessions_total_count_v49_4dc25d50') THEN
    ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_total_count_v49_4dc25d50" CHECK ("total_count" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance_sessions"'::regclass AND left(conname, 38) = 'attendance_sessions_present_count_v49_' AND conname <> 'attendance_sessions_present_count_v49_e08da53d' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance_sessions', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance_sessions"'::regclass AND conname = 'attendance_sessions_present_count_v49_e08da53d') THEN
    ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_present_count_v49_e08da53d" CHECK ("present_count" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"attendance_sessions"'::regclass AND left(conname, 37) = 'attendance_sessions_absent_count_v49_' AND conname <> 'attendance_sessions_absent_count_v49_7fab2443' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'attendance_sessions', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"attendance_sessions"'::regclass AND conname = 'attendance_sessions_absent_count_v49_7fab2443') THEN
    ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_absent_count_v49_7fab2443" CHECK ("absent_count" >= 0) NOT VALID; END IF;
END $$;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "test_date" date;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "test_name" text;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "batch" text;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "max_marks" numeric;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "total_count" numeric;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "scored_count" numeric;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "absent_count" numeric;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "avg_pct" numeric;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "marked_by" text;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS "saved_at" timestamptz;
ALTER TABLE "test_runs" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND left(conname, 24) = 'test_runs_max_marks_v49_' AND conname <> 'test_runs_max_marks_v49_3e311a57' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'test_runs', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND conname = 'test_runs_max_marks_v49_3e311a57') THEN
    ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_max_marks_v49_3e311a57" CHECK ("max_marks" > 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND left(conname, 26) = 'test_runs_total_count_v49_' AND conname <> 'test_runs_total_count_v49_4dc25d50' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'test_runs', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND conname = 'test_runs_total_count_v49_4dc25d50') THEN
    ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_total_count_v49_4dc25d50" CHECK ("total_count" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND left(conname, 27) = 'test_runs_scored_count_v49_' AND conname <> 'test_runs_scored_count_v49_22dd3bca' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'test_runs', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND conname = 'test_runs_scored_count_v49_22dd3bca') THEN
    ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_scored_count_v49_22dd3bca" CHECK ("scored_count" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND left(conname, 27) = 'test_runs_absent_count_v49_' AND conname <> 'test_runs_absent_count_v49_7fab2443' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'test_runs', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND conname = 'test_runs_absent_count_v49_7fab2443') THEN
    ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_absent_count_v49_7fab2443" CHECK ("absent_count" >= 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND left(conname, 22) = 'test_runs_avg_pct_v49_' AND conname <> 'test_runs_avg_pct_v49_42b278b5' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'test_runs', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"test_runs"'::regclass AND conname = 'test_runs_avg_pct_v49_42b278b5') THEN
    ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_avg_pct_v49_42b278b5" CHECK ("avg_pct" >= 0 AND "avg_pct" <= 100) NOT VALID; END IF;
END $$;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "exam" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "duration" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "fee_per_instalment_inr" numeric;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "instalments" numeric;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "active" boolean;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS _seq bigserial;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"courses"'::regclass AND left(conname, 35) = 'courses_fee_per_instalment_inr_v49_' AND conname <> 'courses_fee_per_instalment_inr_v49_d6198425' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'courses', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"courses"'::regclass AND conname = 'courses_fee_per_instalment_inr_v49_d6198425') THEN
    ALTER TABLE "courses" ADD CONSTRAINT "courses_fee_per_instalment_inr_v49_d6198425" CHECK ("fee_per_instalment_inr" > 0) NOT VALID; END IF;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = '"courses"'::regclass AND left(conname, 24) = 'courses_instalments_v49_' AND conname <> 'courses_instalments_v49_c6296d81' LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'courses', r.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"courses"'::regclass AND conname = 'courses_instalments_v49_c6296d81') THEN
    ALTER TABLE "courses" ADD CONSTRAINT "courses_instalments_v49_c6296d81" CHECK ("instalments" >= 1) NOT VALID; END IF;
END $$;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "start_time" text;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "end_time" text;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "days" text;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "courses" text;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "active" boolean;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS _seq bigserial;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "at" timestamptz;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "who" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "flow" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "entity" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "record_id" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS _seq bigserial;

-- ── v5.1 built-in roles (os.yaml roles[]): inserted when missing and not deleted by an administrator (app_settings
-- deleted_role:<key>), never overwritten — the Users & roles page edits them
INSERT INTO app_roles (key, label, description, base_role, pages, built_in) SELECT 'admin', 'Director', 'Runs the institute: what needs action, leads, students, fees, parents and every AI call', 'admin', '{"*": "edit"}'::jsonb, true WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'deleted_role:admin') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_roles (key, label, description, base_role, pages, built_in) SELECT 'office', 'Office admin', 'Marks attendance, enrols students, records fees and sends WhatsApp templates', 'office', '{"attendance": "edit", "students": "edit", "scores": "edit", "fees": "edit", "messages": "edit", "alerts": "edit", "courses": "edit", "batches": "edit", "settings": "edit"}'::jsonb, true WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'deleted_role:office') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_roles (key, label, description, base_role, pages, built_in) SELECT 'counsellor', 'Counsellor', 'Works the leads the AI qualified, follows up absences and parent concerns', 'counsellor', '{"leads": "edit", "calls": "edit", "students": "edit", "parents": "edit", "alerts": "edit", "messages": "edit", "settings": "edit"}'::jsonb, true WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'deleted_role:counsellor') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_roles (key, label, description, base_role, pages, built_in) SELECT 'mentor', 'Mentor', 'Looks after at-risk students: counselling calls, scores and mentor sessions', 'mentor', '{"academic": "edit", "scores": "edit", "students": "edit", "attendance": "edit", "calls": "edit", "settings": "edit"}'::jsonb, true WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'deleted_role:mentor') ON CONFLICT (key) DO NOTHING;

-- ── v5.1 temporary administrator: only on a database that has NEVER had an administrator (no role = 'admin' row at all)
DO $pucho_admin$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
    INSERT INTO users (id, email, name, role, password_hash, must_change_password, must_change_email)
    VALUES ('USR-TEMP-ADMIN', 'admin@pucho.ai', 'Temporary administrator', 'admin', '$argon2id$v=19$m=19456,t=2,p=1$FYacKA5TRCvPnHuDBocMtw$qaGjWVON05qvdIy7B+wpTE7WteZ+KbzUYqUQC8Aoiyc', true, true) ON CONFLICT DO NOTHING;
  END IF;
  -- a real administrator has finished its setup: the pending temporary admin is retired on every apply (never claimable later)
  UPDATE users SET is_active = false, deactivated_at = now(), deactivated_by = 'schema.sql', updated_at = now()
   WHERE email = 'admin@pucho.ai' AND must_change_email AND is_active
     AND EXISTS (SELECT 1 FROM users a WHERE a.role = 'admin' AND a.is_active AND NOT a.must_change_email AND a.email <> 'admin@pucho.ai');
END $pucho_admin$;
