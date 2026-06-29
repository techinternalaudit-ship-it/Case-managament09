import { cookies } from "next/headers";

export type Theme = "light" | "dark";

export async function getTheme(): Promise<Theme> {
  const c = await cookies();
  const val = c.get("theme")?.value;
  return val === "dark" ? "dark" : "light";
}
