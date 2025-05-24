import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://itehwlzixbylnmxjxcmv.supabase.co"; // แก้เป็นของคุณ
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZWh3bHppeGJ5bG5teGp4Y212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNzI0NjMsImV4cCI6MjA2MzY0ODQ2M30.y4qOApQEknv_e9kozwPznOqCqAoxqFdsxaUbWsI7Xts"; // แก้เป็นของคุณ

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
