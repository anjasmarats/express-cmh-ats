// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || "https://hofqecdlhntalcupumam.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZnFlY2RsaG50YWxjdXB1bWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzM5OTksImV4cCI6MjA3NjAwOTk5OX0.rB6BTPTQ_jkBpQoa336z17PHgyZX-l-T9bxcAS2oFew";

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
