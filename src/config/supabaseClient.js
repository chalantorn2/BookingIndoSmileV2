import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sixwsodfumroethflcst.supabase.co"; // แก้เป็นของคุณ
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeHdzb2RmdW1yb2V0aGZsY3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1ODA1MTYsImV4cCI6MjA1NzE1NjUxNn0.UmeXSf-aKFrOk2HoXHlt3l8OAlwsTlhPIjsm08dVRHQ"; // แก้เป็นของคุณ

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
