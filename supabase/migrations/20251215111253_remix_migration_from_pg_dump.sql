CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    turma_id uuid,
    nome text NOT NULL,
    turno text NOT NULL,
    curso text NOT NULL,
    data_inicio date NOT NULL,
    data_termino date NOT NULL,
    carga_horaria_diaria integer DEFAULT 60 NOT NULL,
    carga_horaria_total integer,
    dias_uteis integer,
    dias_subtraidos integer DEFAULT 0,
    nome_professor text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT disciplinas_turno_check CHECK ((turno = ANY (ARRAY['Matutino'::text, 'Vespertino'::text, 'Noturno'::text])))
);


--
-- Name: feriados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feriados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    data date NOT NULL,
    nome text NOT NULL,
    tipo text DEFAULT 'feriado'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: presencas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presencas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    disciplina_id uuid,
    student_id uuid,
    data date NOT NULL,
    status text NOT NULL,
    justificativa text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT presencas_status_check CHECK ((status = ANY (ARRAY['presente'::text, 'ausente'::text, 'atrasado'::text, 'justificado'::text])))
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    matricula text NOT NULL,
    nome text NOT NULL,
    data_nascimento date,
    cpf text,
    rg text,
    titulo_eleitoral text,
    local_nascimento text,
    estado_nascimento text,
    nome_pai text,
    nome_mae text,
    telefone text,
    email text,
    endereco text,
    data_matricula date DEFAULT CURRENT_DATE NOT NULL,
    turma_id uuid,
    status text DEFAULT 'Ativo'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: turmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turmas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    ano_letivo integer NOT NULL,
    periodo text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'Ativa'::text,
    curso text,
    disciplina text,
    CONSTRAINT turmas_status_check CHECK ((status = ANY (ARRAY['Ativa'::text, 'Inativa'::text, 'Aguardando'::text])))
);


--
-- Name: disciplinas disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_pkey PRIMARY KEY (id);


--
-- Name: feriados feriados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feriados
    ADD CONSTRAINT feriados_pkey PRIMARY KEY (id);


--
-- Name: presencas presencas_disciplina_id_student_id_data_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas
    ADD CONSTRAINT presencas_disciplina_id_student_id_data_key UNIQUE (disciplina_id, student_id, data);


--
-- Name: presencas presencas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas
    ADD CONSTRAINT presencas_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_user_id_matricula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_matricula_key UNIQUE (user_id, matricula);


--
-- Name: turmas turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_pkey PRIMARY KEY (id);


--
-- Name: disciplinas update_disciplinas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_disciplinas_updated_at BEFORE UPDATE ON public.disciplinas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: presencas update_presencas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_presencas_updated_at BEFORE UPDATE ON public.presencas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: turmas update_turmas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: disciplinas disciplinas_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinas
    ADD CONSTRAINT disciplinas_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE;


--
-- Name: presencas presencas_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas
    ADD CONSTRAINT presencas_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id) ON DELETE CASCADE;


--
-- Name: presencas presencas_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas
    ADD CONSTRAINT presencas_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE SET NULL;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: turmas turmas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: disciplinas Users can create their own disciplinas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own disciplinas" ON public.disciplinas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feriados Users can create their own feriados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own feriados" ON public.feriados FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: presencas Users can create their own presencas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own presencas" ON public.presencas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: students Users can create their own students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own students" ON public.students FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: turmas Users can create their own turmas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own turmas" ON public.turmas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: disciplinas Users can delete their own disciplinas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own disciplinas" ON public.disciplinas FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: feriados Users can delete their own feriados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own feriados" ON public.feriados FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: presencas Users can delete their own presencas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own presencas" ON public.presencas FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: students Users can delete their own students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own students" ON public.students FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: turmas Users can delete their own turmas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own turmas" ON public.turmas FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: disciplinas Users can update their own disciplinas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own disciplinas" ON public.disciplinas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: feriados Users can update their own feriados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own feriados" ON public.feriados FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: presencas Users can update their own presencas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own presencas" ON public.presencas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: students Users can update their own students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own students" ON public.students FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: turmas Users can update their own turmas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own turmas" ON public.turmas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: disciplinas Users can view their own disciplinas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own disciplinas" ON public.disciplinas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: feriados Users can view their own feriados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own feriados" ON public.feriados FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: presencas Users can view their own presencas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own presencas" ON public.presencas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: students Users can view their own students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own students" ON public.students FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: turmas Users can view their own turmas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own turmas" ON public.turmas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: disciplinas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

--
-- Name: feriados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

--
-- Name: presencas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: turmas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


