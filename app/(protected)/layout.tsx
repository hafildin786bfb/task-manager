import { requireRole } from "@/lib/auth/require-role";
import { NavBar } from "@/components/nav-bar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["admin", "manager", "employee"]);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar
        user={{
          full_name: session.profile?.full_name || session.user?.email || "User",
          email: session.user?.email || "",
        }}
        role={session.role!}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
