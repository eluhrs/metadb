import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

// Protect these routes (everything except the homepage, API routes, and static assets)
export const config = {
  matcher: ["/collections/:path*", "/dashboard/:path*"],
};
