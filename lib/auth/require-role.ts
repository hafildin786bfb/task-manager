import { redirect } from "next/navigation";
import { getCurrentSession, AppRole, UserSessionData } from "./get-session";

export async function requireRole(allowedRoles: AppRole | AppRole[]): Promise<UserSessionData> {
  const session = await getCurrentSession();

  if (!session.user || !session.role) {
    redirect("/login");
  }

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!rolesArray.includes(session.role)) {
    redirect("/unauthorized");
  }

  return session;
}
