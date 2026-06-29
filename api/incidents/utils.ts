export function optionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

export function optionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// The analysis pipeline and the DB enum share one verdict vocabulary
// (`low | moderate | severe | critical`), so this is now a pure validator:
// it returns the verdict unchanged when valid, otherwise null.
export function normalizeDbVerdict(verdict: unknown) {
  if (verdict === "menor" || verdict === "moderado" || verdict === "severo" || verdict === "completo") {
    return verdict;
  }
  return null;
}
