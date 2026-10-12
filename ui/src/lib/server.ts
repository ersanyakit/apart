import "server-only";
import { cookies } from "next/headers";
import { contracts, type Snapshot } from "./api";
export async function initialSync(): Promise<Snapshot | null> {
  const jar = await cookies();
  if (!jar.has("interactiveotel_session")) return null;
  let selection = {};
  try {
    selection = JSON.parse(
      Buffer.from(
        jar.get("interactiveotel_selection")?.value || "",
        "base64url",
      ).toString(),
    );
  } catch {}
  const query = new URLSearchParams({
    version: contracts.version,
    code: "system.initial_sync",
    payload: JSON.stringify(selection),
  });
  const response = await fetch(
    `${process.env.API_INTERNAL_URL || "http://127.0.0.1:3000"}/action?${query}`,
    { headers: { Cookie: jar.toString() }, cache: "no-store" },
  );
  if (response.status === 401) return null;
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message || contracts.errors.internal_error);
  return result.data as Snapshot;
}
