-- Fix search_path on fn_log_reagendamento
CREATE OR REPLACE FUNCTION public.fn_log_reagendamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    IF OLD.data_aula IS DISTINCT FROM NEW.data_aula 
       OR OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio THEN
        INSERT INTO public.logs_preditivos (user_id, aula_id, tipo_alteracao)
        VALUES (NEW.user_id, NEW.id, 'Aula reagendada');
    END IF;
    RETURN NEW;
END;
$function$;

-- Fix search_path on fn_log_evento_preditivo
CREATE OR REPLACE FUNCTION public.fn_log_evento_preditivo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    IF OLD.status_aula IS DISTINCT FROM 'Cancelada' AND NEW.status_aula = 'Cancelada' THEN
        INSERT INTO public.logs_preditivos (user_id, aula_id, tipo_alteracao, custo_adicional)
        VALUES (NEW.user_id, NEW.id, 'Aula cancelada', 0);
        NEW.status_financeiro := 'Bloqueado';
    END IF;

    IF OLD.professor_id IS DISTINCT FROM NEW.professor_id AND OLD.professor_id IS NOT NULL THEN
        INSERT INTO public.logs_preditivos (user_id, aula_id, tipo_alteracao, custo_adicional)
        VALUES (NEW.user_id, NEW.id, 'Professor substituído', NEW.valor_calculado);
    END IF;

    RETURN NEW;
END;
$function$;

-- Fix search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;