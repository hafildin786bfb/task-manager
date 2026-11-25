import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("=========================================");
console.log(" Testing Supabase Project Connection     ");
console.log("=========================================");
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key present: ${!!anonKey} (${anonKey?.slice(0, 16)}...)`);
console.log(`Service Role Key present: ${!!serviceKey} (${serviceKey?.slice(0, 16)}...)`);
console.log("-----------------------------------------");

async function checkConnection() {
  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Test Auth API
  console.log("1. Testing Supabase Auth Service...");
  try {
    const { data: users, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authError) {
      console.error(`❌ Auth API error: ${authError.message}`);
    } else {
      console.log(`✅ Auth service connected! (Users count accessible, found ${users.users.length} sample users)`);
    }
  } catch (err) {
    console.error(`❌ Auth connection exception:`, err.message);
  }

  // 2. Test Tables existence
  const tables = ["profiles", "user_roles", "manager_employees", "tasks"];
  console.log("\n2. Checking Database Schema & Tables...");

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select("*").limit(1);
      if (error) {
        if (error.code === "42P01") {
          console.log(`⚠️  Table "${table}" does not exist yet (migrations pending).`);
        } else {
          console.log(`❌ Table "${table}" error: [Code: ${error.code}] ${error.message}`);
        }
      } else {
        console.log(`✅ Table "${table}" is accessible and ready!`);
      }
    } catch (err) {
      console.error(`❌ Error querying "${table}":`, err.message);
    }
  }

  console.log("=========================================");
}

checkConnection();
