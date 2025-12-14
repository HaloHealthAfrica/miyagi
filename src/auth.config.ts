import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      
      // Public routes that don't require authentication
      const publicRoutes = ['/login', '/register'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      
      // If user is logged in and trying to access auth pages, redirect to home
      if (isLoggedIn && isPublicRoute) {
        return Response.redirect(new URL('/', nextUrl));
      }
      
      // If user is not logged in and trying to access protected routes, redirect to login
      if (!isLoggedIn && !isPublicRoute) {
        return false; // This will redirect to the signIn page
      }
      
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;