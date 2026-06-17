REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM authenticated;
REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM anon;
GRANT SELECT (token_aceite, aceito_ip) ON public.contratos_professores TO service_role;