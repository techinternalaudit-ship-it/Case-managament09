"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function ensure() {
  const s = await auth();
  if (!s?.user || !can(s.user, "lookup:manage")) throw new Error("FORBIDDEN");
}

export async function addCategory(formData: FormData) {
  await ensure();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("BAD_REQUEST");
  await db.lookupCategory.upsert({ where: { name }, create: { name }, update: {} });
  revalidatePath("/admin/lookups");
}

export async function addSubCategory(formData: FormData) {
  await ensure();
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!categoryId || !name) throw new Error("BAD_REQUEST");
  await db.lookupSubCategory.upsert({
    where: { categoryId_name: { categoryId, name } },
    create: { categoryId, name },
    update: {},
  });
  revalidatePath("/admin/lookups");
}

export async function deleteSubCategory(formData: FormData) {
  await ensure();
  const id = String(formData.get("id") ?? "");
  // Only delete if no cases reference it
  const count = await db.case.count({ where: { subCategoryId: id } });
  if (count > 0) return;
  await db.lookupSubCategory.delete({ where: { id } });
  revalidatePath("/admin/lookups");
}
