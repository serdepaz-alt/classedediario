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
          created_at: string | null
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          status: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
          valor_hora: number
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
          valor_hora?: number
        }
        Update: {
          created_at?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
          valor_hora?: number
        }
        Relationships: []
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
          created_at: string
          data: string
          disciplina_id: string | null
          horario_inicio: string | null
          horario_salvamento: string | null
          id: string
          justificativa: string | null
          notificacao_enviada: boolean | null
          status: string
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          disciplina_id?: string | null
          horario_inicio?: string | null
          horario_salvamento?: string | null
          id?: string
          justificativa?: string | null
          notificacao_enviada?: boolean | null
          status: string
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          disciplina_id?: string | null
          horario_inicio?: string | null
          horario_salvamento?: string | null
          id?: string
          justificativa?: string | null
          notificacao_enviada?: boolean | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      students: {
        Row: {
          cpf: string | null
          created_at: string | null
          data_matricula: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado_nascimento: string | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
