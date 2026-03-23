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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          clock_out_at: string | null;
          status: "clocked_in" | "on_break" | "clocked_out" | "flagged";
          regular_hours: number;
          ot_hours: number;
          dt_hours: number;
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
