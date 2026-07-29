import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isLoginRoute = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup" || req.nextUrl.pathname === "/welcome";

  if (isAuthRoute) {
    return;
  }

  if (!isLoggedIn && !isLoginRoute) {
    const welcomeUrl = new URL("/welcome", req.nextUrl);
    return Response.redirect(welcomeUrl);
  }

  if (isLoggedIn && isLoginRoute) {
    const dashboardUrl = new URL("/", req.nextUrl);
    return Response.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
