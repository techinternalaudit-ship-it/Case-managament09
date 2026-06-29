import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { addCategory, addSubCategory, deleteSubCategory } from "./actions";

export default async function LookupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!can(session.user, "lookup:manage")) return <div className="card p-6">Forbidden.</div>;

  const categories = await db.lookupCategory.findMany({ include: { subs: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Lookups — Category & Sub-Category</h1>

      <form action={addCategory} className="card p-4 flex items-end gap-3">
        <div className="flex-1"><label className="label">New category</label><input className="input" name="name" required /></div>
        <button className="btn-primary">+ Add</button>
      </form>

      {categories.map((c) => (
        <div key={c.id} className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-gray-500">{c.subs.length} sub-categories</div>
          </div>
          <ul className="text-sm divide-y divide-gray-100 mb-3">
            {c.subs.map((s) => (
              <li key={s.id} className="py-1.5 flex justify-between">
                <span>{s.name}</span>
                <form action={deleteSubCategory}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="text-xs text-red-600 hover:underline">Delete</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addSubCategory} className="flex gap-2">
            <input type="hidden" name="categoryId" value={c.id} />
            <input className="input" name="name" placeholder="New sub-category…" required />
            <button className="btn-secondary">+ Add</button>
          </form>
        </div>
      ))}
    </div>
  );
}
