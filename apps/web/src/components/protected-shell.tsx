"use client";

import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, clearToken, getToken, logout, type ApiUser } from "../lib/api";
import { isAdminRole } from "../lib/roles";
import { Button } from "./ui";

const customerLinks = [
  ["Dashboard", "/dashboard"],
  ["Organizations", "/organizations"],
  ["Projects", "/projects"],
  ["Assets", "/assets"],
  ["Scans", "/scans"],
  ["Findings", "/findings"],
  ["Fix Requests", "/fix-requests"],
  ["Reports", "/reports"],
  ["Settings", "/settings"],
  ["Docs", "/docs"],
] as const;

const adminLinks = [
  ["Admin Dashboard", "/admin/dashboard"],
  ["Users", "/admin/users"],
  ["Organizations", "/admin/organizations"],
  ["Scans", "/admin/scans"],
  ["Findings", "/admin/findings"],
  ["Reports", "/admin/reports"],
  ["Fix Requests", "/admin/fix-requests"],
  ["Audit Logs", "/admin/audit-logs"],
  ["System Health", "/admin/system-health"],
  ["Subscriptions", "/admin/subscriptions"],
] as const;

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const loginPath = isAdminRoute ? "/admin/login" : "/login";

  useEffect(() => {
    if (!getToken()) {
      router.replace(loginPath);
      return;
    }
    apiRequest<ApiUser>("/auth/me")
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace(loginPath);
      })
      .finally(() => setLoading(false));
  }, [loginPath, router]);

  useEffect(() => {
    if (!isAdminRoute && isAdminRole(user?.role)) {
      router.replace("/admin/dashboard");
    }
  }, [isAdminRoute, router, user?.role]);

  if (loading) return <main className="grid min-h-screen place-items-center text-sm text-slate-600">Loading workspace...</main>;

  async function handleLogout() {
    await logout();
    router.replace(isAdminRoute ? "/admin/login" : "/login");
  }

  const denied = isAdminRoute && user && !isAdminRole(user.role);
  const wrongWorkspace = !isAdminRoute && user && isAdminRole(user.role);
  const activeLinks = isAdminRoute ? adminLinks : customerLinks;
  const homeHref = isAdminRoute ? "/admin/dashboard" : "/dashboard";

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={homeHref} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-ink text-white">
              <Shield size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-signal">LuminarIQ</span>
              <span className="block text-lg font-semibold text-ink">SecureScan</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-700 md:flex">
            {activeLinks.slice(0, isAdminRoute ? 10 : 7).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-sm text-slate-600 sm:inline">
              <span className="block font-medium text-ink">{user?.name}</span>
              <span className="block text-xs">{isAdminRole(user?.role) ? "Admin workspace" : "Customer workspace"}</span>
            </span>
            <Button
              className="h-9 gap-2 bg-red-600 px-3.5 text-white font-medium shadow-sm hover:bg-red-700 active:bg-red-800 transition"
              onClick={handleLogout}
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </Button>
          </div>
        </div>
        <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2 border-t border-slate-100 px-6 py-3 text-sm text-slate-700 sm:grid-cols-3 md:hidden">
          {activeLinks.map(([label, href]) => (
            <Link key={href} className="rounded-md border border-slate-200 px-3 py-2 text-center" href={href}>{label}</Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        {wrongWorkspace ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-800">
            Please use the Admin Portal to sign in.
          </div>
        ) : denied ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            Access denied. You do not have permission to access this page.
          </div>
        ) : children}
      </div>
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700">LuminarIQ SecureScan</span>
            <span>•</span>
            <span>{isAdminRole(user?.role) ? "Admin Management Console" : "Customer Security Portal"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            <Link href="/docs" className="hover:text-slate-800 transition">Documentation</Link>
            <Link href="/reports" className="hover:text-slate-800 transition">Reports</Link>
            <Link href="/settings" className="hover:text-slate-800 transition">Settings</Link>
            <span>© {new Date().getFullYear()} LuminarIQ SoftSol Pvt. Ltd.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
