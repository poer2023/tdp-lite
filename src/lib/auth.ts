import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Allowed emails from environment variable (comma-separated)
const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      // If no allowed emails configured, deny all
      if (allowedEmails.length === 0) {
        console.error("ALLOWED_EMAILS not configured");
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email || !allowedEmails.includes(email)) {
        console.warn(`Login denied for email: ${email}`);
        return false;
      }

      return true;
    },
    session({ session, token }) {
      // Add user id to session
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
