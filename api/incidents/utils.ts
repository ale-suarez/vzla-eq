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

export function mapAnalysisVerdictToDb(verdict: unknown) {
  if (verdict === "SEGURO") return "low";
  if (verdict === "PRECAUCION") return "moderate";
  if (verdict === "PELIGRO") return "critical";
  return null;
}

export function normalizeDbVerdict(verdict: unknown) {
  const mapped = mapAnalysisVerdictToDb(verdict);
  if (mapped) return mapped;
  if (verdict === "low" || verdict === "moderate" || verdict === "severe" || verdict === "critical") {
    return verdict;
  }
  return null;
}

export function mapDbVerdictToUi(verdict: unknown) {
  if (verdict === "low") return "SEGURO";
  if (verdict === "moderate") return "PRECAUCION";
  if (verdict === "critical") return "PELIGRO";
  return "PRECAUCION";
}
