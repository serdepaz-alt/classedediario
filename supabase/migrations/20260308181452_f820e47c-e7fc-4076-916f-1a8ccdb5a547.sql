
CREATE TABLE public.cascade_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feriado_data text,
  feriado_nome text,
  total_aulas_realocadas integer DEFAULT 0,
  detalhes jsonb DEFAULT '[]'::jsonb,
  aplicado_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cascade_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cascade_logs" ON public.cascade_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cascade_logs" ON public.cascade_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cascade_logs" ON public.cascade_logs FOR DELETE USING (auth.uid() = user_id);
