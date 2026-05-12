export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anotacoes: {
        Row: {
          conteudo: string
          created_at: string
          disciplina: string | null
          id: string
          observacao_admin: string | null
          prioridade: string
          professor_nome: string | null
          status_acompanhamento: string
          student_id: string
          tipo: string
          titulo: string
          turma_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          disciplina?: string | null
          id?: string
          observacao_admin?: string | null
          prioridade?: string
          professor_nome?: string | null
          status_acompanhamento?: string
          student_id: string
          tipo?: string
          titulo: string
          turma_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          disciplina?: string | null
          id?: string
          observacao_admin?: string | null
          prioridade?: string
          professor_nome?: string | null
          status_acompanhamento?: string
          student_id?: string
          tipo?: string
          titulo?: string
          turma_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          acao: string
          created_at: string
          id: string
          registro_id: string | null
          tabela_afetada: string
          user_id: string
          usuario_responsavel: string
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          registro_id?: string | null
          tabela_afetada: string
          user_id: string
          usuario_responsavel: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          registro_id?: string | null
          tabela_afetada?: string
          user_id?: string
          usuario_responsavel?: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
      }
      backlog_anotacoes: {
        Row: {
          anotacao_id: string
          created_at: string
          descricao: string | null
          id: string
          lido: boolean
          prioridade: string
          professor_id: string | null
          quadro: string
          responsavel_nome: string | null
          responsavel_tipo: string
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anotacao_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          lido?: boolean
          prioridade?: string
          professor_id?: string | null
          quadro?: string
          responsavel_nome?: string | null
          responsavel_tipo?: string
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anotacao_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          lido?: boolean
          prioridade?: string
          professor_id?: string | null
          quadro?: string
          responsavel_nome?: string | null
          responsavel_tipo?: string
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_anotacoes_anotacao_id_fkey"
            columns: ["anotacao_id"]
            isOneToOne: false
            referencedRelation: "anotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_anotacoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "cad_professores"
            referencedColumns: ["id"]
          },
        ]
      }
      cad_disciplinas: {
        Row: {
          carga_horaria: number | null
          created_at: string | null
          curso: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          carga_horaria?: number | null
          created_at?: string | null
          curso?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          carga_horaria?: number | null
          created_at?: string | null
          curso?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      cad_professores: {
        Row: {
          coren: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          disciplinas_lecionar: string | null
          email: string | null
          endereco: string | null
          especialidade: string | null
          experiencia: string | null
          formacao: string | null
          funcao: string | null
          id: string
          indicacao: string | null
          nome: string
          rg: string | null
          senha: string | null
          status: string | null
          telefone: string | null
          telefone2: string | null
          turnos_disponiveis: string | null
          updated_at: string | null
          user_id: string
          valor_hora: number
        }
        Insert: {
          coren?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          disciplinas_lecionar?: string | null
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          experiencia?: string | null
          formacao?: string | null
          funcao?: string | null
          id?: string
          indicacao?: string | null
          nome: string
          rg?: string | null
          senha?: string | null
          status?: string | null
          telefone?: string | null
          telefone2?: string | null
          turnos_disponiveis?: string | null
          updated_at?: string | null
          user_id: string
          valor_hora?: number
        }
        Update: {
          coren?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          disciplinas_lecionar?: string | null
          email?: string | null
          endereco?: string | null
          especialidade?: string | null
          experiencia?: string | null
          formacao?: string | null
          funcao?: string | null
          id?: string
          indicacao?: string | null
          nome?: string
          rg?: string | null
          senha?: string | null
          status?: string | null
          telefone?: string | null
          telefone2?: string | null
          turnos_disponiveis?: string | null
          updated_at?: string | null
          user_id?: string
          valor_hora?: number
        }
        Relationships: []
      }
      cascade_logs: {
        Row: {
          aplicado_em: string
          created_at: string
          detalhes: Json | null
          feriado_data: string | null
          feriado_nome: string | null
          id: string
          total_aulas_realocadas: number | null
          user_id: string
        }
        Insert: {
          aplicado_em?: string
          created_at?: string
          detalhes?: Json | null
          feriado_data?: string | null
          feriado_nome?: string | null
          id?: string
          total_aulas_realocadas?: number | null
          user_id: string
        }
        Update: {
          aplicado_em?: string
          created_at?: string
          detalhes?: Json | null
          feriado_data?: string | null
          feriado_nome?: string | null
          id?: string
          total_aulas_realocadas?: number | null
          user_id?: string
        }
        Relationships: []
      }
      contestacoes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          mes_referencia: string
          professor_id: string | null
          respondido_em: string | null
          respondido_por: string | null
          resposta: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          mes_referencia: string
          professor_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          mes_referencia?: string
          professor_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contestacoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "cad_professores"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo_programatico_aulas: {
        Row: {
          created_at: string | null
          data_aula: string
          disciplina_id: string | null
          disciplina_nome: string
          id: string
          metodologia: string | null
          objetivo: string | null
          observacoes: string | null
          recursos: string | null
          status: string
          tipo_avaliacao: string
          topico: string
          turma_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_aula: string
          disciplina_id?: string | null
          disciplina_nome: string
          id?: string
          metodologia?: string | null
          objetivo?: string | null
          observacoes?: string | null
          recursos?: string | null
          status?: string
          tipo_avaliacao?: string
          topico: string
          turma_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_aula?: string
          disciplina_id?: string | null
          disciplina_nome?: string
          id?: string
          metodologia?: string | null
          objetivo?: string | null
          observacoes?: string | null
          recursos?: string | null
          status?: string
          tipo_avaliacao?: string
          topico?: string
          turma_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_programatico_aulas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_programatico_aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_programatico_aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      conteudo_programatico_docs: {
        Row: {
          created_at: string | null
          descricao: string | null
          disciplina_id: string | null
          id: string
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
          tipo_arquivo: string
          turma_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          disciplina_id?: string | null
          id?: string
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo_arquivo: string
          turma_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          disciplina_id?: string | null
          id?: string
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string
          turma_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_programatico_docs_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_programatico_docs_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_programatico_docs_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      cronograma_mestre: {
        Row: {
          aceite_professor: boolean | null
          created_at: string | null
          data_aula: string
          disciplina_id: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          observacoes: string | null
          professor_id: string | null
          status_aula: string | null
          status_financeiro: string | null
          turma_id: string | null
          updated_at: string | null
          user_id: string
          valor_calculado: number | null
        }
        Insert: {
          aceite_professor?: boolean | null
          created_at?: string | null
          data_aula: string
          disciplina_id?: string | null
          hora_fim: string
          hora_inicio: string
          id?: string
          observacoes?: string | null
          professor_id?: string | null
          status_aula?: string | null
          status_financeiro?: string | null
          turma_id?: string | null
          updated_at?: string | null
          user_id: string
          valor_calculado?: number | null
        }
        Update: {
          aceite_professor?: boolean | null
          created_at?: string | null
          data_aula?: string
          disciplina_id?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          observacoes?: string | null
          professor_id?: string | null
          status_aula?: string | null
          status_financeiro?: string | null
          turma_id?: string | null
          updated_at?: string | null
          user_id?: string
          valor_calculado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_mestre_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "cad_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_mestre_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "cad_professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_mestre_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_mestre_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          carga_horaria_diaria: number
          carga_horaria_total: number | null
          created_at: string
          curso: string
          data_inicio: string
          data_termino: string
          dias_subtraidos: number | null
          dias_uteis: number | null
          id: string
          nome: string
          nome_professor: string | null
          turma_id: string | null
          turno: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carga_horaria_diaria?: number
          carga_horaria_total?: number | null
          created_at?: string
          curso: string
          data_inicio: string
          data_termino: string
          dias_subtraidos?: number | null
          dias_uteis?: number | null
          id?: string
          nome: string
          nome_professor?: string | null
          turma_id?: string | null
          turno: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carga_horaria_diaria?: number
          carga_horaria_total?: number | null
          created_at?: string
          curso?: string
          data_inicio?: string
          data_termino?: string
          dias_subtraidos?: number | null
          dias_uteis?: number | null
          id?: string
          nome?: string
          nome_professor?: string | null
          turma_id?: string | null
          turno?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          id: string
          nome: string
          tipo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          nome: string
          tipo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          nome?: string
          tipo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      folha_fechamento: {
        Row: {
          created_at: string
          fechada_em: string | null
          fechada_por: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fechada_em?: string | null
          fechada_por?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fechada_em?: string | null
          fechada_por?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      logs_preditivos: {
        Row: {
          aula_id: string | null
          created_at: string | null
          custo_adicional: number | null
          descricao: string | null
          id: string
          tipo_alteracao: string
          user_id: string | null
        }
        Insert: {
          aula_id?: string | null
          created_at?: string | null
          custo_adicional?: number | null
          descricao?: string | null
          id?: string
          tipo_alteracao: string
          user_id?: string | null
        }
        Update: {
          aula_id?: string | null
          created_at?: string | null
          custo_adicional?: number | null
          descricao?: string | null
          id?: string
          tipo_alteracao?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_preditivos_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "cronograma_mestre"
            referencedColumns: ["id"]
          },
        ]
      }
      medias_alunos: {
        Row: {
          avaliacoes_travadas: number | null
          bonus: number | null
          created_at: string
          disciplina_id: string
          id: string
          media_final: number | null
          media_parcial: number | null
          situacao: string | null
          student_id: string
          total_avaliacoes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avaliacoes_travadas?: number | null
          bonus?: number | null
          created_at?: string
          disciplina_id: string
          id?: string
          media_final?: number | null
          media_parcial?: number | null
          situacao?: string | null
          student_id: string
          total_avaliacoes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avaliacoes_travadas?: number | null
          bonus?: number | null
          created_at?: string
          disciplina_id?: string
          id?: string
          media_final?: number | null
          media_parcial?: number | null
          situacao?: string | null
          student_id?: string
          total_avaliacoes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medias_alunos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medias_alunos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          bonus: number | null
          created_at: string
          disciplina_id: string
          id: string
          is_locked: boolean
          nome_avaliacao: string
          notificacao_enviada_em: string | null
          notificacao_status: string
          numero_avaliacao: number
          peso: number
          student_id: string
          updated_at: string
          user_id: string
          valor: number | null
          valor_notificado: number | null
        }
        Insert: {
          bonus?: number | null
          created_at?: string
          disciplina_id: string
          id?: string
          is_locked?: boolean
          nome_avaliacao?: string
          notificacao_enviada_em?: string | null
          notificacao_status?: string
          numero_avaliacao?: number
          peso?: number
          student_id: string
          updated_at?: string
          user_id: string
          valor?: number | null
          valor_notificado?: number | null
        }
        Update: {
          bonus?: number | null
          created_at?: string
          disciplina_id?: string
          id?: string
          is_locked?: boolean
          nome_avaliacao?: string
          notificacao_enviada_em?: string | null
          notificacao_status?: string
          numero_avaliacao?: number
          peso?: number
          student_id?: string
          updated_at?: string
          user_id?: string
          valor?: number | null
          valor_notificado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      padroes_disciplinas: {
        Row: {
          carga_horaria_diaria: number
          carga_horaria_total: number
          created_at: string | null
          id: string
          nome: string
          turno: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          carga_horaria_diaria?: number
          carga_horaria_total?: number
          created_at?: string | null
          id?: string
          nome: string
          turno: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          carga_horaria_diaria?: number
          carga_horaria_total?: number
          created_at?: string | null
          id?: string
          nome?: string
          turno?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      periodos_letivos: {
        Row: {
          ano_letivo: number
          ativo: boolean | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          id: string
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      presencas: {
        Row: {
          aula_programatica_id: string | null
          conteudo_ministrado: string | null
          created_at: string
          data: string
          disciplina_id: string | null
          horario_inicio: string | null
          horario_salvamento: string | null
          id: string
          justificativa: string | null
          notificacao_enviada: boolean | null
          observacoes_aula: string | null
          status: string
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aula_programatica_id?: string | null
          conteudo_ministrado?: string | null
          created_at?: string
          data: string
          disciplina_id?: string | null
          horario_inicio?: string | null
          horario_salvamento?: string | null
          id?: string
          justificativa?: string | null
          notificacao_enviada?: boolean | null
          observacoes_aula?: string | null
          status: string
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aula_programatica_id?: string | null
          conteudo_ministrado?: string | null
          created_at?: string
          data?: string
          disciplina_id?: string | null
          horario_inicio?: string | null
          horario_salvamento?: string | null
          id?: string
          justificativa?: string | null
          notificacao_enviada?: boolean | null
          observacoes_aula?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presencas_aula_programatica_id_fkey"
            columns: ["aula_programatica_id"]
            isOneToOne: false
            referencedRelation: "conteudo_programatico_aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_logins: {
        Row: {
          admin_user_id: string
          auth_user_id: string
          created_at: string
          professor_id: string
        }
        Insert: {
          admin_user_id: string
          auth_user_id: string
          created_at?: string
          professor_id: string
        }
        Update: {
          admin_user_id?: string
          auth_user_id?: string
          created_at?: string
          professor_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          cpf: string | null
          created_at: string | null
          data_matricula: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado_nascimento: string | null
          historico_disciplinas: string | null
          id: string
          local_nascimento: string | null
          matricula: string
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          rg: string | null
          status: string | null
          telefone: string | null
          titulo_eleitoral: string | null
          turma_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          data_matricula?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado_nascimento?: string | null
          historico_disciplinas?: string | null
          id?: string
          local_nascimento?: string | null
          matricula: string
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          rg?: string | null
          status?: string | null
          telefone?: string | null
          titulo_eleitoral?: string | null
          turma_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          data_matricula?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado_nascimento?: string | null
          historico_disciplinas?: string | null
          id?: string
          local_nascimento?: string | null
          matricula?: string
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          rg?: string | null
          status?: string | null
          telefone?: string | null
          titulo_eleitoral?: string | null
          turma_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      tabela_valores_hora: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          turno: string
          updated_at: string
          user_id: string
          valor_hora: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          turno?: string
          updated_at?: string
          user_id: string
          valor_hora?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          turno?: string
          updated_at?: string
          user_id?: string
          valor_hora?: number
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          created_at: string | null
          curso: string | null
          data_inicio: string | null
          disciplina: string | null
          horario: string | null
          id: string
          nome: string
          periodo: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ano_letivo: number
          created_at?: string | null
          curso?: string | null
          data_inicio?: string | null
          disciplina?: string | null
          horario?: string | null
          id?: string
          nome: string
          periodo?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ano_letivo?: number
          created_at?: string | null
          curso?: string | null
          data_inicio?: string | null
          disciplina?: string | null
          horario?: string | null
          id?: string
          nome?: string
          periodo?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valores_estagio: {
        Row: {
          ativo: boolean
          created_at: string
          custo_total_calculado: number
          dias_padrao: number
          id: string
          unidade_hospitalar: string
          updated_at: string
          user_id: string
          valor_base: number
          valor_va: number
          valor_vt: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_total_calculado?: number
          dias_padrao?: number
          id?: string
          unidade_hospitalar: string
          updated_at?: string
          user_id: string
          valor_base?: number
          valor_va?: number
          valor_vt?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_total_calculado?: number
          dias_padrao?: number
          id?: string
          unidade_hospitalar?: string
          updated_at?: string
          user_id?: string
          valor_base?: number
          valor_va?: number
          valor_vt?: number
        }
        Relationships: []
      }
    }
    Views: {
      vw_analise_preditiva: {
        Row: {
          custo_com_risco: number | null
          custo_planejado: number | null
          fator_risco: number | null
          indice_volatilidade: number | null
          mes_referencia: string | null
          status_risco: string | null
          turma_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_mestre_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_mestre_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_hotspots_turmas"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      vw_hotspots_turmas: {
        Row: {
          custo_planejado: number | null
          disciplina: string | null
          impacto_financeiro_estimado: number | null
          percentual_substituicoes: number | null
          professor_titular: string | null
          status_risco: string | null
          total_aulas: number | null
          total_substituicoes: number | null
          turma: string | null
          turma_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_for_professor: {
        Args: { _auth_user_id: string }
        Returns: string
      }
      get_professor_nome: { Args: { _auth_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "professor"],
    },
  },
} as const
