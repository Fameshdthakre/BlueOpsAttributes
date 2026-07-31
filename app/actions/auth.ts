"use server";

import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function registerUser(formData: FormData) {
  let email = formData.get("email") as string;
  const password = formData.get("password") as string;

  email = email?.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email) || !password || password.length < 6) {
    return { error: "Invalid email format or password (min 6 characters)." };
  }

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return { error: "User already exists with this email." };
    }

    // Hash the password and insert
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(`
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
    `, [email, password_hash]);

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "An unexpected error occurred." };
  }
}
