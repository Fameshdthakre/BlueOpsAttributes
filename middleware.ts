import NextAuth from "next-auth";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isLoginRoute = req.nextUrl.pathname === "/login";

  if (isAuthRoute) {
    return;
  }

  if (!isLoggedIn && !isLoginRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginRoute) {
    const dashboardUrl = new URL("/", req.nextUrl);
    return Response.redirect(dashboardUrl);
  }
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
