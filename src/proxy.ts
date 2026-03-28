import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isLibrarian = token?.role === "LIBRARIAN";
    const path = req.nextUrl.pathname;

    // Enforce LIBRARIAN role constraint for /dashboard routes
    if (path.startsWith("/dashboard") && !isLibrarian) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect these routes (everything except the homepage, API routes, and static assets)
export const config = {
  matcher: ["/collections/:path*", "/dashboard/:path*"],
};
