-- Trigger 1: Calcular valor da aula automaticamente ao inserir/atualizar
CREATE TRIGGER trg_calcular_valor_aula
  BEFORE INSERT OR UPDATE ON public.cronograma_mestre
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_calcular_valor_aula();

-- Trigger 2: Logar eventos preditivos (cancelamento, substituição)
CREATE TRIGGER trg_log_evento_preditivo
  BEFORE UPDATE ON public.cronograma_mestre
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_evento_preditivo();

-- Trigger 3: Logar reagendamentos de aula
CREATE TRIGGER trg_log_reagendamento
  BEFORE UPDATE ON public.cronograma_mestre
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_reagendamento();