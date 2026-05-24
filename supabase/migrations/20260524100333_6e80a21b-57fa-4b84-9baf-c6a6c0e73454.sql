CREATE TABLE IF NOT EXISTS public.notification_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  turno text NOT NULL,
  dispatch_date date NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  trigger_source text NOT NULL DEFAULT 'cron',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, turno, dispatch_date, trigger_source)
);

ALTER TABLE public.notification_dispatch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dispatch log"
  ON public.notification_dispatch_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dispatch log"
  ON public.notification_dispatch_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);