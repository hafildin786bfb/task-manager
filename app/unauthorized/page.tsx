import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Access Restricted
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have the required role or permissions to view the requested resource.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Login
            </Button>
          </Link>
          <form action="/api/auth/signout" method="post" className="w-full">
            <Button variant="ghost" type="submit" className="w-full text-slate-500 hover:text-slate-800">
              Sign out of account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
