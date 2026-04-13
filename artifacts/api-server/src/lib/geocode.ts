/**
 * Reverse geocode via OpenStreetMap Nominatim (free, attribution required in UI).
 * Set USER_AGENT env for polite pool usage per Nominatim policy.
 */

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const ua =
    process.env["NOMINATIM_USER_AGENT"] ??
    "CivicAI/1.0 (civic issue reporting; contact: support@example.com)";

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": ua, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return typeof data.display_name === "string" ? data.display_name : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
