// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'doten';

// dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || "https://hofqecdlhntalcupumam.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
