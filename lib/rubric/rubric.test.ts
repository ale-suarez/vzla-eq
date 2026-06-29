import { describe, it, expect } from "vitest";
import { gradeElement } from "./grade";
import {
  structuralRisk,
  externalRisk,
  nonStructuralRisk,
  computeEtiqueta,
  mostUnfavorable,
} from "./aggregate";
import { RUBRIC, RUBRIC_VERSION } from "./artifact";

// ── Grader: boletín worked examples ───────────────────────────────────────────

describe("gradeElement — concreto armado (Fig 11)", () => {
  it("crack <1mm => menor", () => {
    expect(gradeElement("concreto_armado", { crackBand: "lt1" }).grade).toBe("menor");
  });

  it("crack 1–2mm => moderado", () => {
    expect(gradeElement("concreto_armado", { crackBand: "1to2" }).grade).toBe("moderado");
  });

  it("crack >2mm + desconchado => severo (the canonical example)", () => {
    const r = gradeElement("concreto_armado", { crackBand: "2to6", indicators: ["desconchado"] });
    expect(r.grade).toBe("severo");
    expect(r.matched?.sourceFigure).toContain("Fig 11c");
  });

  it("pandeo de barras => completo, even without a width band (indicator escalation)", () => {
    const r = gradeElement("concreto_armado", { indicators: ["pandeo_barras"] });
    expect(r.grade).toBe("completo");
    expect(r.basis).toBe("indicators");
  });

  it("upward-only: small band but severe indicator escalates UP, never down", () => {
    // Width alone says menor (<1mm) but exposed rebar present => severo.
    const r = gradeElement("concreto_armado", { crackBand: "lt1", indicators: ["acero_expuesto"] });
    expect(r.grade).toBe("severo");
    expect(r.basis).toBe("indicators");
  });

  it("no observables => sin daño (null)", () => {
    expect(gradeElement("concreto_armado", {}).grade).toBeNull();
  });
});

describe("gradeElement — muro de concreto uses DIFFERENT bands (Fig 17)", () => {
  it("crack <2mm => menor (would be moderado for a column)", () => {
    expect(gradeElement("muro_concreto", { crackBand: "1to2" }).grade).toBe("menor");
  });
  it("crack 2–6mm => moderado", () => {
    expect(gradeElement("muro_concreto", { crackBand: "2to6" }).grade).toBe("moderado");
  });
});

describe("gradeElement — acero is qualitative (no widths)", () => {
  it("imperceptible (no indicators) => menor", () => {
    expect(gradeElement("acero", {}).grade).toBe("menor");
  });
  it("fractura de soldadura => severo or worse", () => {
    const r = gradeElement("acero", { indicators: ["fractura_soldadura"] });
    expect(["severo", "completo"]).toContain(r.grade);
  });
  it("fractura de placa base => completo", () => {
    expect(gradeElement("acero", { indicators: ["fractura_placa_base"] }).grade).toBe("completo");
  });
});

describe("gradeElement — mampostería (non-structural axis)", () => {
  it("is on the non_structural axis", () => {
    expect(RUBRIC.elementTypes.mamposteria.axis).toBe("non_structural");
  });
  it("derrumbe total => completo", () => {
    expect(gradeElement("mamposteria", { indicators: ["derrumbe_total"] }).grade).toBe("completo");
  });
});

// ── Aggregation: the national ladder ──────────────────────────────────────────

describe("structuralRisk — §3 short-circuit + Tabla 2", () => {
  it("any severo element => Alto, short-circuited (Macuto example: N≥1 severo => C)", () => {
    const r = structuralRisk(["menor", "severo", "moderado"]);
    expect(r.risk).toBe("alto");
    expect(r.shortCircuited).toBe(true);
  });

  it("any completo element => Alto, short-circuited", () => {
    expect(structuralRisk(["completo"]).risk).toBe("alto");
  });

  it("Tabla 2: <10% moderado => A (bajo)", () => {
    // 1 moderado of 20 inspected = 5%.
    const grades = ["moderado", ...Array(19).fill("menor")] as const;
    const r = structuralRisk([...grades], 20);
    expect(r.risk).toBe("bajo");
  });

  it("Tabla 2: 10–30% moderado => B (medio)", () => {
    const grades = [...Array(4).fill("moderado"), ...Array(16).fill("menor")];
    const r = structuralRisk(grades as ("moderado" | "menor")[], 20);
    expect(r.risk).toBe("medio"); // 20%
  });

  it("Tabla 2: >30% moderado => C (alto)", () => {
    const grades = [...Array(8).fill("moderado"), ...Array(12).fill("menor")];
    const r = structuralRisk(grades as ("moderado" | "menor")[], 20);
    expect(r.risk).toBe("alto"); // 40%
  });

  it("empty / no inspected elements => bajo", () => {
    expect(structuralRisk([], 0).risk).toBe("bajo");
  });
});

describe("externalRisk — §2.1", () => {
  it("all 'a' => bajo", () => {
    expect(externalRisk(["a", "a", "a", "a", "a"])).toBe("bajo");
  });
  it("any 'b', no 'c' => medio", () => {
    expect(externalRisk(["a", "b", "a", "a", "a"])).toBe("medio");
  });
  it("any 'c' => alto", () => {
    expect(externalRisk(["a", "b", "c", "a", "a"])).toBe("alto");
  });
});

describe("computeEtiqueta — §6 / Tabla 5 (most unfavorable)", () => {
  it("all bajo => verde", () => {
    const r = computeEtiqueta({ external: "bajo", structural: "bajo", nonStructural: "bajo" });
    expect(r.etiqueta).toBe("verde");
  });
  it("one medio, rest bajo => amarilla", () => {
    const r = computeEtiqueta({ external: "bajo", structural: "medio", nonStructural: "bajo" });
    expect(r.etiqueta).toBe("amarilla");
  });
  it("any alto => roja", () => {
    const r = computeEtiqueta({ external: "alto", structural: "bajo", nonStructural: "medio" });
    expect(r.etiqueta).toBe("roja");
  });

  it("Macuto Sheraton end-to-end: severe columns => structural alto => Roja", () => {
    // §3: 14 columns severo/completo => structural alto (short-circuit).
    const struct = structuralRisk(Array(14).fill("severo"));
    const ext = externalRisk(["b", "a", "c", "b", "b"]); // boletín example had geological 'c'
    const nonStruct = nonStructuralRisk(["b"]);
    const r = computeEtiqueta({ external: ext, structural: struct.risk, nonStructural: nonStruct });
    expect(r.etiqueta).toBe("roja");
  });
});

describe("invariants", () => {
  it("mostUnfavorable is order-independent", () => {
    expect(mostUnfavorable(["medio", "alto", "bajo"])).toBe("alto");
    expect(mostUnfavorable(["bajo", "alto", "medio"])).toBe("alto");
  });
  it("rubric version is stamped", () => {
    expect(RUBRIC_VERSION).toBe("anih-61-2023.1");
    expect(RUBRIC.version).toBe(RUBRIC_VERSION);
  });
});
