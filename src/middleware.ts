import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Match all routes except static files, API routes (unless you want to protect them), and Next.js internals
  // NOTE: Exclude auth pages so their server actions (POST) aren't intercepted by auth middleware.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|login|register).*)'],
};
