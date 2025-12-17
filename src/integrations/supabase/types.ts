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
        ]
      }
      turmas: {
        Row: {
          ano_letivo: number
          created_at: string | null
          curso: string | null
          disciplina: string | null
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
          disciplina?: string | null
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
          disciplina?: string | null
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
      [_ in never]: never
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
