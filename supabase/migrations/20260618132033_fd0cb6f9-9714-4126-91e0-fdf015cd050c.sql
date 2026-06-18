DROP POLICY IF EXISTS "System inserts backup" ON public.presencas_backup;
REVOKE EXECUTE ON FUNCTION public.fn_backup_presenca() FROM PUBLIC, anon, authenticated;