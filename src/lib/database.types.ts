export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          auth_id: string | null;
          name: string;
          email: string;
          role: "admin" | "manager" | "front_desk" | "housekeeping" | "accounting";
          is_active: boolean;
          avatar_url: string | null;
          phone: string | null;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          name: string;
          email: string;
          role?: "admin" | "manager" | "front_desk" | "housekeeping" | "accounting";
          is_active?: boolean;
          avatar_url?: string | null;
          phone?: string | null;
          department?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          role?: "admin" | "manager" | "front_desk" | "housekeeping" | "accounting";
          is_active?: boolean;
          avatar_url?: string | null;
          phone?: string | null;
          department?: string | null;
        };
      };
      room_types: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          base_rate: number;
          max_occupancy: number;
          amenities: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          base_rate?: number;
          max_occupancy?: number;
          amenities?: string[];
        };
        Update: {
          name?: string;
          code?: string;
          description?: string | null;
          base_rate?: number;
          max_occupancy?: number;
          amenities?: string[];
        };
      };
      rooms: {
        Row: {
          id: string;
          number: string;
          floor: number;
          room_type_id: string;
          status: "vacant_clean" | "vacant_dirty" | "occupied" | "out_of_order" | "maintenance";
          housekeeping_status: "clean" | "dirty" | "inspected" | "in_progress" | "out_of_service";
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: string;
          floor?: number;
          room_type_id: string;
          status?: "vacant_clean" | "vacant_dirty" | "occupied" | "out_of_order" | "maintenance";
          housekeeping_status?: "clean" | "dirty" | "inspected" | "in_progress" | "out_of_service";
          is_active?: boolean;
          notes?: string | null;
        };
        Update: {
          number?: string;
          floor?: number;
          room_type_id?: string;
          status?: "vacant_clean" | "vacant_dirty" | "occupied" | "out_of_order" | "maintenance";
          housekeeping_status?: "clean" | "dirty" | "inspected" | "in_progress" | "out_of_service";
          is_active?: boolean;
          notes?: string | null;
        };
      };
      guests: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          id_number: string | null;
          nationality: string | null;
          date_of_birth: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          vip_level: number;
          total_stays: number;
          total_spent: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          id_number?: string | null;
          nationality?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          vip_level?: number;
          notes?: string | null;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          id_number?: string | null;
          nationality?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          vip_level?: number;
          notes?: string | null;
        };
      };
      reservations: {
        Row: {
          id: string;
          confirmation_number: string;
          guest_id: string;
          room_id: string | null;
          room_type_id: string;
          check_in: string;
          check_out: string;
          nights: number;
          adults: number;
          children: number;
          status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
          rate_per_night: number;
          total_amount: number;
          balance: number;
          source: string | null;
          special_requests: string | null;
          created_by: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          confirmation_number: string;
          guest_id: string;
          room_id?: string | null;
          room_type_id: string;
          check_in: string;
          check_out: string;
          nights?: number;
          adults?: number;
          children?: number;
          status?: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
          rate_per_night?: number;
          total_amount?: number;
          balance?: number;
          source?: string | null;
          special_requests?: string | null;
          created_by?: string | null;
        };
        Update: {
          guest_id?: string;
          room_id?: string | null;
          room_type_id?: string;
          check_in?: string;
          check_out?: string;
          nights?: number;
          adults?: number;
          children?: number;
          status?: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
          rate_per_night?: number;
          total_amount?: number;
          balance?: number;
          source?: string | null;
          special_requests?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          cancelled_at?: string | null;
        };
      };
      folios: {
        Row: {
          id: string;
          reservation_id: string;
          guest_id: string;
          room_number: string | null;
          total_charges: number;
          total_payments: number;
          balance: number;
          is_closed: boolean;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reservation_id: string;
          guest_id: string;
          room_number?: string | null;
          total_charges?: number;
          total_payments?: number;
          balance?: number;
          is_closed?: boolean;
        };
        Update: {
          room_number?: string | null;
          total_charges?: number;
          total_payments?: number;
          balance?: number;
          is_closed?: boolean;
          closed_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          folio_id: string;
          reservation_id: string;
          date: string;
          description: string;
          category: string;
          type: "charge" | "payment" | "adjustment";
          amount: number;
          payment_method: "cash" | "credit_card" | "bank_transfer" | "online" | "city_ledger" | null;
          payment_status: "pending" | "completed" | "failed" | "refunded" | null;
          reference: string | null;
          is_night_audit: boolean;
          posted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          folio_id: string;
          reservation_id: string;
          date?: string;
          description: string;
          category?: string;
          type?: "charge" | "payment" | "adjustment";
          amount: number;
          payment_method?: "cash" | "credit_card" | "bank_transfer" | "online" | "city_ledger" | null;
          payment_status?: "pending" | "completed" | "failed" | "refunded" | null;
          reference?: string | null;
          is_night_audit?: boolean;
          posted_by?: string | null;
        };
        Update: {
          description?: string;
          category?: string;
          type?: "charge" | "payment" | "adjustment";
          amount?: number;
          payment_method?: "cash" | "credit_card" | "bank_transfer" | "online" | "city_ledger" | null;
          payment_status?: "pending" | "completed" | "failed" | "refunded" | null;
          reference?: string | null;
        };
      };
      housekeeping_tasks: {
        Row: {
          id: string;
          room_id: string;
          status: "clean" | "dirty" | "inspected" | "in_progress" | "out_of_service";
          priority: "low" | "medium" | "high" | "urgent";
          assigned_to: string | null;
          notes: string | null;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          status?: "clean" | "dirty" | "inspected" | "in_progress" | "out_of_service";
          priority?: "low" | "medium" | "high" | "urgent";
          assigned_to?: string | null;
          notes?: string | null;
          scheduled_at?: string | null;
        };
        Update: {
          status?: "clean" | "dirty" | "inspected" | "in_progress" | "out_of_service";
          priority?: "low" | "medium" | "high" | "urgent";
          assigned_to?: string | null;
          notes?: string | null;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      channel_partners: {
        Row: {
          id: string;
          agency_id: string;
          name: string;
          status: "connected" | "disconnected" | "error" | "pending";
          credentials: Record<string, unknown>;
          settings: Record<string, unknown>;
          enabled: boolean;
          last_tested_at: string | null;
          last_sync_at: string | null;
          sync_direction: "inbound" | "outbound" | "both";
          webhook_url: string | null;
          webhook_secret: string | null;
          rate_mapping: Record<string, unknown>;
          commission_rate: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          name: string;
          status?: "connected" | "disconnected" | "error" | "pending";
          credentials?: Record<string, unknown>;
          settings?: Record<string, unknown>;
          enabled?: boolean;
          sync_direction?: "inbound" | "outbound" | "both";
          webhook_url?: string | null;
          webhook_secret?: string | null;
          rate_mapping?: Record<string, unknown>;
          commission_rate?: number;
          created_by?: string | null;
        };
        Update: {
          agency_id?: string;
          name?: string;
          status?: "connected" | "disconnected" | "error" | "pending";
          credentials?: Record<string, unknown>;
          settings?: Record<string, unknown>;
          enabled?: boolean;
          last_tested_at?: string | null;
          last_sync_at?: string | null;
          sync_direction?: "inbound" | "outbound" | "both";
          webhook_url?: string | null;
          webhook_secret?: string | null;
          rate_mapping?: Record<string, unknown>;
          commission_rate?: number;
        };
      };
      channel_reservations: {
        Row: {
          id: string;
          channel_partner_id: string;
          external_id: string;
          external_confirmation: string | null;
          reservation_id: string | null;
          raw_data: Record<string, unknown>;
          guest_name: string | null;
          room_type: string | null;
          check_in: string;
          check_out: string;
          adults: number;
          children: number;
          total_amount: number;
          commission: number;
          net_amount: number;
          currency: string;
          status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
          sync_status: "pending" | "syncing" | "completed" | "failed" | "conflict";
          synced_at: string | null;
          last_modified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_partner_id: string;
          external_id: string;
          external_confirmation?: string | null;
          reservation_id?: string | null;
          raw_data?: Record<string, unknown>;
          guest_name?: string | null;
          room_type?: string | null;
          check_in: string;
          check_out: string;
          adults?: number;
          children?: number;
          total_amount?: number;
          commission?: number;
          net_amount?: number;
          currency?: string;
          status?: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
          sync_status?: "pending" | "syncing" | "completed" | "failed" | "conflict";
        };
        Update: {
          external_confirmation?: string | null;
          reservation_id?: string | null;
          raw_data?: Record<string, unknown>;
          guest_name?: string | null;
          room_type?: string | null;
          check_in?: string;
          check_out?: string;
          adults?: number;
          children?: number;
          total_amount?: number;
          commission?: number;
          net_amount?: number;
          currency?: string;
          status?: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
          sync_status?: "pending" | "syncing" | "completed" | "failed" | "conflict";
          synced_at?: string | null;
          last_modified_at?: string | null;
        };
      };
      channel_sync_logs: {
        Row: {
          id: string;
          channel_partner_id: string;
          direction: "inbound" | "outbound" | "both";
          action: string;
          status: "pending" | "syncing" | "completed" | "failed" | "conflict";
          request_data: Record<string, unknown>;
          response_data: Record<string, unknown>;
          error_message: string | null;
          external_id: string | null;
          reservation_id: string | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_partner_id: string;
          direction: "inbound" | "outbound" | "both";
          action: string;
          status?: "pending" | "syncing" | "completed" | "failed" | "conflict";
          request_data?: Record<string, unknown>;
          response_data?: Record<string, unknown>;
          error_message?: string | null;
          external_id?: string | null;
          reservation_id?: string | null;
          duration_ms?: number | null;
        };
        Update: {
          status?: "pending" | "syncing" | "completed" | "failed" | "conflict";
          response_data?: Record<string, unknown>;
          error_message?: string | null;
          duration_ms?: number | null;
        };
      };
      channel_rate_plans: {
        Row: {
          id: string;
          channel_partner_id: string;
          room_type_id: string;
          external_room_code: string | null;
          rate_per_night: number;
          min_stay: number;
          max_stay: number;
          closed: boolean;
          valid_from: string | null;
          valid_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_partner_id: string;
          room_type_id: string;
          external_room_code?: string | null;
          rate_per_night: number;
          min_stay?: number;
          max_stay?: number;
          closed?: boolean;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          room_type_id?: string;
          external_room_code?: string | null;
          rate_per_night?: number;
          min_stay?: number;
          max_stay?: number;
          closed?: boolean;
          valid_from?: string | null;
          valid_to?: string | null;
        };
      };
      night_audit_logs: {
        Row: {
          id: string;
          audit_date: string;
          run_by: string | null;
          total_rooms: number;
          occupied_rooms: number;
          occupancy_rate: number;
          total_revenue: number;
          room_revenue: number;
          fnb_revenue: number;
          other_revenue: number;
          total_arrivals: number;
          total_departures: number;
          total_no_shows: number;
          rooms_posted: number;
          status: string;
          notes: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          audit_date: string;
          run_by?: string | null;
          total_rooms?: number;
          occupied_rooms?: number;
          occupancy_rate?: number;
          total_revenue?: number;
          room_revenue?: number;
          fnb_revenue?: number;
          other_revenue?: number;
          total_arrivals?: number;
          total_departures?: number;
          total_no_shows?: number;
          rooms_posted?: number;
          status?: string;
          notes?: string | null;
        };
        Update: {
          total_rooms?: number;
          occupied_rooms?: number;
          occupancy_rate?: number;
          total_revenue?: number;
          room_revenue?: number;
          fnb_revenue?: number;
          other_revenue?: number;
          total_arrivals?: number;
          total_departures?: number;
          total_no_shows?: number;
          rooms_posted?: number;
          status?: string;
          notes?: string | null;
          completed_at?: string | null;
        };
      };
    };
  };
}
