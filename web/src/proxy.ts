import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  // The admin instance normally uses :3002; allow the alternate local
  // demonstration port so `http://localhost:5005/` opens the admin login.
  const isAdminPort = host.endsWith(":3002") || host.endsWith(":5005");
  const path = request.nextUrl.pathname;

  if (isAdminPort) {
    if (path === "/") return NextResponse.redirect(new URL("/admin/login", request.url));
    if (!path.startsWith("/admin")) return NextResponse.redirect(new URL("/admin/login", request.url));
    return NextResponse.next();
  }

  if (path.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/admin/:path*"] };
