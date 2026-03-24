export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: "admin" | "sub_admin" | "store_manager" | "employee";
          status: "active" | "inactive" | "terminated";
          full_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "sub_admin" | "store_manager" | "employee";
          status?: "active" | "inactive" | "terminated";
          full_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          full_name: string;
          role: "admin" | "sub_admin" | "store_manager" | "employee";
          status: "active" | "inactive" | "terminated";
          updated_at: string;
        }>;
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          timezone?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          timezone: string;
          is_active: boolean;
          updated_at: string;
        }>;
        Relationships: [];
      };
      user_store_assignments: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<{
          is_primary: boolean;
        }>;
        Relationships: [];
      };
      employee_profiles: {
        Row: {
          id: string;
          user_id: string;
          employee_code: string;
          pin_hash: string | null;
          hourly_rate: number | null;
          overtime_eligible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_code: string;
          pin_hash?: string | null;
          hourly_rate?: number | null;
          overtime_eligible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          employee_code: string;
          pin_hash: string | null;
          hourly_rate: number | null;
          overtime_eligible: boolean;
          updated_at: string;
        }>;
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          employee_id: string;
          store_id: string;
          clock_in_at: string;
          clock_out_at: string | null;
          status: "clocked_in" | "on_break" | "clocked_out" | "flagged";
          regular_hours: number;
          ot_hours: number;
          dt_hours: number;
          payroll_approved_at: string | null;
          payroll_approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          store_id: string;
          clock_in_at: string;
          clock_out_at?: string | null;
          status?: "clocked_in" | "on_break" | "clocked_out" | "flagged";
          regular_hours?: number;
          ot_hours?: number;
          dt_hours?: number;
          payroll_approved_at?: string | null;
          payroll_approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          clock_out_at: string | null;
          status: "clocked_in" | "on_break" | "clocked_out" | "flagged";
          regular_hours: number;
          ot_hours: number;
          dt_hours: number;
          payroll_approved_at: string | null;
          payroll_approved_by: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      time_events: {
        Row: {
          id: string;
          employee_id: string;
          store_id: string;
          event_type: "clock_in" | "clock_out" | "break_start" | "break_end" | "admin_manual";
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          store_id: string;
          event_type: "clock_in" | "clock_out" | "break_start" | "break_end" | "admin_manual";
          occurred_at?: string;
          created_at?: string;
        };
        Update: Partial<{
          occurred_at: string;
        }>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string;
          entity_name: string;
          entity_id: string | null;
          action: string;
          old_value: Json | null;
          new_value: Json | null;
          reason_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id: string;
          entity_name: string;
          entity_id?: string | null;
          action: string;
          old_value?: Json | null;
          new_value?: Json | null;
          reason_code?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          old_value: Json | null;
          new_value: Json | null;
        }>;
        Relationships: [];
      };
      pto_requests: {
        Row: {
          id: string;
          employee_id: string;
          store_id: string;
          request_type: "vacation" | "sick" | "personal";
          start_date: string;
          end_date: string;
          note: string | null;
          status: "pending" | "approved" | "denied" | "cancelled";
          reviewed_by: string | null;
          reviewed_at: string | null;
          manager_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          store_id: string;
          request_type?: "vacation" | "sick" | "personal";
          start_date: string;
          end_date: string;
          note?: string | null;
          status?: "pending" | "approved" | "denied" | "cancelled";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          note: string | null;
          status: "pending" | "approved" | "denied" | "cancelled";
          reviewed_by: string | null;
          reviewed_at: string | null;
          manager_note: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      scheduled_shifts: {
        Row: {
          id: string;
          store_id: string;
          employee_id: string;
          start_at: string;
          end_at: string;
          shift_template: "morning" | "evening" | "overnight" | "custom";
          role_label: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          employee_id: string;
          start_at: string;
          end_at: string;
          shift_template?: "morning" | "evening" | "overnight" | "custom";
          role_label?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          start_at: string;
          end_at: string;
          shift_template: "morning" | "evening" | "overnight" | "custom";
          role_label: string | null;
          notes: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      policy_configs: {
        Row: {
          id: string;
          store_id: string | null;
          overtime_daily_threshold: number;
          double_time_daily_threshold: number;
          overtime_weekly_threshold: number;
          auto_clock_out_hours: number;
          rounding_mode: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string | null;
          overtime_daily_threshold?: number;
          double_time_daily_threshold?: number;
          overtime_weekly_threshold?: number;
          auto_clock_out_hours?: number;
          rounding_mode?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          overtime_daily_threshold: number;
          double_time_daily_threshold: number;
          overtime_weekly_threshold: number;
          auto_clock_out_hours: number;
          rounding_mode: string;
          updated_by: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: {
      active_time_entries_view: {
        Row: {
          id: string;
          employee_id: string;
          employee_name: string;
          employee_code: string;
          store_id: string;
          store_name: string;
          status: "clocked_in" | "on_break" | "clocked_out" | "flagged";
          regular_hours: number;
          ot_hours: number;
          dt_hours: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      apply_clock_event: {
        Args: {
          p_employee_id: string;
          p_store_id: string;
          p_event_type: "clock_in" | "clock_out" | "break_start" | "break_end" | "admin_manual";
          p_occurred_at?: string;
          p_method?: string;
          p_reason?: string;
          p_note?: string;
        };
        Returns: string;
      };
    };
  };
};
