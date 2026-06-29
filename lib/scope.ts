import { cookies } from "next/headers";

export type Scope = "mine" | "all";

export async function getScope(): Promise<Scope> {
  const c = await cookies();
  const val = c.get("scope")?.value;
  return val === "all" ? "all" : "mine";
}
