
-- 1) audit_trail: remove direct client INSERT; only SECURITY DEFINER paths may write
DROP POLICY IF EXISTS "Users can create audit entries" ON public.audit_trail;

-- 2) contestacoes: allow admins to DELETE their own
CREATE POLICY "Admins can delete their contestacoes"
ON public.contestacoes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3) contestacoes: allow professors to INSERT under their admin's user_id
CREATE POLICY "Professores podem criar contestacoes"
ON public.contestacoes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = public.get_admin_for_professor(auth.uid())
  AND professor_id IN (
    SELECT pl.professor_id FROM public.professor_logins pl
    WHERE pl.auth_user_id = auth.uid()
  )
);
