"use server";

import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || password.length < 6) {
    return { error: "Invalid email or password (min 6 characters)." };
  }

  try {
    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rowCount && existing.rowCount > 0) {
      return { error: "User already exists with this email." };
    }

    // Hash the password and insert
    const password_hash = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${password_hash})
    `;

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "An unexpected error occurred." };
  }
}
