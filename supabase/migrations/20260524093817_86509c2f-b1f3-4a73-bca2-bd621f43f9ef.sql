
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  auto_enabled BOOLEAN NOT NULL DEFAULT true,
  selected_turmas JSONB NOT NULL DEFAULT '[]'::jsonb,
  matutino JSONB NOT NULL DEFAULT '{"ativo":true,"dias":["Qua","Qui","Sex"],"horario":"14:00"}'::jsonb,
  vespertino JSONB NOT NULL DEFAULT '{"ativo":true,"dias":["Qua","Qui","Sex"],"horario":"14:00"}'::jsonb,
  noturno JSONB NOT NULL DEFAULT '{"ativo":true,"dias":["Qui","Sex"],"horario":"09:00"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification_settings"
  ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notification_settings"
  ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notification_settings"
  ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notification_settings"
  ON public.notification_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
