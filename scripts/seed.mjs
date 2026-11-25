import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...values] = trimmed.split("=");
          if (key && values.length > 0) {
            process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
          }
        }
      });
      console.log(`Loaded environment from ${file}`);
      break;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Please ensure your .env.local contains these values before running the seed script.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = "Password123!";

const USERS = [
  // 1 Admin
  {
    email: "admin@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "Alex Vance (Executive Admin)",
    role: "admin",
  },
  // 2 Managers
  {
    email: "manager1@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "Morgan Lee (Engineering Lead)",
    role: "manager",
  },
  {
    email: "manager2@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "Sarah Connor (Operations Director)",
    role: "manager",
  },
  // 4 Employees
  {
    email: "employee1@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "Ethan Hunt (Frontend Dev)",
    role: "employee",
  },
  {
    email: "employee2@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "Elena Rostova (Backend Dev)",
    role: "employee",
  },
  {
    email: "employee3@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "David Kim (Operations Associate)",
    role: "employee",
  },
  {
    email: "employee4@taskflow.internal",
    password: DEFAULT_PASSWORD,
    full_name: "Chloe Price (QA Analyst)",
    role: "employee",
  },
];

async function seed() {
  console.log("=================================================");
  console.log("   TaskFlow Database Seed Script Started        ");
  console.log("=================================================\n");

  const createdUserMap = new Map();

  // 1. Provision Users in Supabase Auth & user_roles
  for (const userDef of USERS) {
    console.log(`Creating user: ${userDef.email} [${userDef.role}]...`);

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === userDef.email);

    let userId;
    if (existing) {
      console.log(`  -> User exists (ID: ${existing.id}), updating credentials...`);
      userId = existing.id;
      await adminClient.auth.admin.updateUserById(userId, {
        password: userDef.password,
        user_metadata: { full_name: userDef.full_name, user_role: userDef.role },
      });
    } else {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: userDef.email,
        password: userDef.password,
        email_confirm: true,
        user_metadata: { full_name: userDef.full_name, user_role: userDef.role },
      });

      if (createError) {
        console.error(`  ERROR creating ${userDef.email}:`, createError.message);
        continue;
      }
      userId = created.user.id;
      console.log(`  -> Created successfully (ID: ${userId})`);
    }

    createdUserMap.set(userDef.email, userId);

    // Upsert user_roles
    await adminClient.from("user_roles").upsert({
      user_id: userId,
      role: userDef.role,
    });

    // Upsert profiles
    await adminClient.from("profiles").upsert({
      id: userId,
      full_name: userDef.full_name,
      email: userDef.email,
    });
  }

  console.log("\nUsers provisioned successfully!");

  // 2. Define Manager-Employee Hierarchies
  const manager1Id = createdUserMap.get("manager1@taskflow.internal");
  const manager2Id = createdUserMap.get("manager2@taskflow.internal");
  const emp1Id = createdUserMap.get("employee1@taskflow.internal");
  const emp2Id = createdUserMap.get("employee2@taskflow.internal");
  const emp3Id = createdUserMap.get("employee3@taskflow.internal");
  const emp4Id = createdUserMap.get("employee4@taskflow.internal");

  console.log("\nConfiguring reporting relationships in manager_employees...");

  const relationships = [
    { manager_id: manager1Id, employee_id: emp1Id }, // Ethan -> Morgan
    { manager_id: manager1Id, employee_id: emp2Id }, // Elena -> Morgan
    { manager_id: manager2Id, employee_id: emp3Id }, // David -> Sarah
    { manager_id: manager2Id, employee_id: emp4Id }, // Chloe -> Sarah
  ];

  for (const rel of relationships) {
    if (rel.manager_id && rel.employee_id) {
      await adminClient.from("manager_employees").upsert(rel);
    }
  }
  console.log("Hierarchy configured: 2 employees report to Manager 1, 2 to Manager 2.");

  // 3. Clear existing sample tasks for idempotent seeding
  console.log("\nCreating sample tasks covering every status ('pending', 'submitted', 'approved', 'rejected')...");
  await adminClient.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const sampleTasks = [
    // Approved Task
    {
      title: "Q3 SOC2 Security Compliance Audit",
      description: "Review IAM role assignments, least-privilege policies, and database audit logs for SOC2 compliance.",
      assigned_by: manager1Id,
      assigned_to: emp2Id,
      status: "approved",
      report_content: "Completed audit of all 42 AWS IAM roles and Supabase RLS policies. No privilege escalations detected. Full report attached to SOC2 JIRA ticket #SEC-109.",
      report_submitted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    // Submitted Task
    {
      title: "Implement OAuth Refresh Token Rotation",
      description: "Ensure Next.js middleware rotates Supabase session tokens seamlessly without logging users out.",
      assigned_by: manager1Id,
      assigned_to: emp1Id,
      status: "submitted",
      report_content: "Implemented token rotation in middleware.ts with request header forwarding. Tested across multiple tabs with zero token revocation errors.",
      report_submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    // Rejected Task
    {
      title: "Prepare Monthly Operational Balance Sheet",
      description: "Compile expenses, vendor invoices, and license costs for Q3 financial close.",
      assigned_by: manager2Id,
      assigned_to: emp3Id,
      status: "rejected",
      report_content: "Consolidated vendor costs for July and August from Stripe and Expensify.",
      report_submitted_at: new Date(Date.now() - 86400000).toISOString(),
      rejection_reason: "Missing September reconciliation data. Please pull the pending cloud invoices from AWS Billing before closing.",
    },
    // Pending Task 1
    {
      title: "End-to-End Regression Testing on Task Delegation",
      description: "Run automated Playwright suite verifying manager delegation to employee submission and admin oversight.",
      assigned_by: manager2Id,
      assigned_to: emp4Id,
      status: "pending",
    },
    // Pending Task 2
    {
      title: "Refactor Database Connection Pooling for Postgres",
      description: "Configure Supabase transaction pooler (Supavisor) to prevent client connection exhaustion under peak load.",
      assigned_by: manager1Id,
      assigned_to: emp2Id,
      status: "pending",
    },
  ];

  for (const task of sampleTasks) {
    if (task.assigned_by && task.assigned_to) {
      const { error: taskError } = await adminClient.from("tasks").insert(task);
      if (taskError) {
        console.error(`  ERROR inserting task "${task.title}":`, taskError.message);
      } else {
        console.log(`  -> Created task: "${task.title}" [Status: ${task.status}]`);
      }
    }
  }

  console.log("\n=================================================");
  console.log("   Seed Complete! Ready for Testing.            ");
  console.log("=================================================");
  console.log("Sample Login Credentials (Password: Password123!):");
  console.log("  - Admin:    admin@taskflow.internal");
  console.log("  - Manager:  manager1@taskflow.internal");
  console.log("  - Manager:  manager2@taskflow.internal");
  console.log("  - Employee: employee1@taskflow.internal");
  console.log("  - Employee: employee2@taskflow.internal");
  console.log("  - Employee: employee3@taskflow.internal");
  console.log("  - Employee: employee4@taskflow.internal");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
