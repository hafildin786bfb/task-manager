import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/get-session";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session.user || !session.role) {
    redirect("/login");
  }

  if (session.role === "admin") {
    redirect("/admin/dashboard");
  } else if (session.role === "manager") {
    redirect("/manager/dashboard");
  } else if (session.role === "employee") {
    redirect("/employee/dashboard");
  } else {
    redirect("/unauthorized");
  }
}
