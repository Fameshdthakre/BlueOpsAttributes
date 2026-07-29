import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
          const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          
          const user = rows[0];

          if (!user) {
            return null; // User not found
          }

          const passwordsMatch = await bcrypt.compare(password, user.password_hash);

          if (passwordsMatch) {
            return {
              id: user.id.toString(),
              email: user.email,
              name: user.name,
              image: user.profile_image,
            };
          }
        } catch (error) {
          console.error("Auth error:", error);
        }

        return null;
      }
    })
  ]
});
