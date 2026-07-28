import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const client = createClient({ connectionString: process.env.POSTGRES_URL });
          await client.connect();
          
          const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
          await client.end();
          
          const user = rows[0];

          if (!user) {
            return null; // User not found
          }

          const passwordsMatch = await bcrypt.compare(password, user.password_hash);

          if (passwordsMatch) {
            return {
              id: user.id.toString(),
              email: user.email,
            };
          }
        } catch (error) {
          console.error("Auth error:", error);
        }

        return null;
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
});
