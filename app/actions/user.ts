"use server";

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const image = formData.get("image") as string; // Expecting base64 string

  try {
    const query = `
      UPDATE users 
      SET name = $1, profile_image = $2
      WHERE id = $3
      RETURNING name, profile_image
    `;
    const values = [name || null, image || null, session.user.id];
    
    const { rows } = await pool.query(query, values);
    return { success: true, user: rows[0] };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "Failed to update profile." };
  }
}

export async function updatePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return { error: "Invalid input. New password must be at least 6 characters." };
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [session.user.id]);
    const user = rows[0];

    if (!user) {
      return { error: "User not found." };
    }

    const passwordsMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordsMatch) {
      return { error: "Current password is incorrect." };
    }

    const new_password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_password_hash, session.user.id]);

    return { success: true };
  } catch (error) {
    console.error("Password update error:", error);
    return { error: "Failed to update password." };
  }
}
