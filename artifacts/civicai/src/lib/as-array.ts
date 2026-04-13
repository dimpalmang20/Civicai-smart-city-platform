/** Coerce unknown API data to an array (e.g. HTML error bodies parsed as text). */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
