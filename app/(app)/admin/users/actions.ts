"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const s = await auth();
  if (!s?.user || !can(s.user, "user:manage")) throw new Error("FORBIDDEN");
  return s.user;
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "INVESTIGATOR");
  const scopeEntity = String(formData.get("scopeEntity") ?? "") || null;
  const scopeDept = String(formData.get("scopeDept") ?? "") || null;
  if (!email || !name || !password) throw new Error("BAD_REQUEST");
  await db.user.create({
    data: {
      email, name, role, scopeEntity, scopeDept,
      passwordHash: bcrypt.hashSync(password, 10),
    },
  });
  revalidatePath("/admin/users");
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !role) throw new Error("BAD_REQUEST");
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const u = await db.user.findUnique({ where: { id } });
  if (!u) throw new Error("NOT_FOUND");
  await db.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("BAD_REQUEST");
  if (id === admin.id) throw new Error("Cannot delete yourself");

  const u = await db.user.findUnique({
    where: { id },
    include: {
      _count: { select: { assignedCases: true, createdCases: true } },
    },
  });
  if (!u) throw new Error("NOT_FOUND");

  if (u._count.assignedCases > 0 || u._count.createdCases > 0) {
    throw new Error(
      "Cannot delete user with associated cases. Reassign or close their cases first, or deactivate the user instead."
    );
  }

  await db.auditLog.deleteMany({ where: { userId: id } });
  await db.caseAttachment.deleteMany({ where: { uploadedById: id } });
  await db.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  revalidatePath("/sign-in");
}
