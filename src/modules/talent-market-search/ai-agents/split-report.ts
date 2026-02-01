/**
 * Location Report Splitter
 *
 * Deterministic parser that splits a multi-location salary report into per-location reports.
 *
 * Usage:
 *   import { splitReports } from './split-report';
 *   const result = splitReports(salaryReport);
 *   // result.reports is an array of per-location reports
 */

// ─────────────────────────────────────────────────────────────────────────────
// Input Types (matches TalentAcquisitionSpecialistResearcher output)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Salary benchmark tier from the multi-location report.
 * Values are semicolon-separated strings like "Makati: ₱35,000; BGC Taguig: ₱38,000"
 */
export interface MultiLocationSalaryTier {
  experience_range: string;
  experience_label: string;
  base_currency_min: string;
  base_currency_mid: string;
  base_currency_max: string;
  int_currency_min: string;
  int_currency_mid: string;
  int_currency_max: string;
}

/**
 * Input salary report with multi-location data.
 * This matches the output of TalentAcquisitionSpecialistResearcher agent.
 */
export interface MultiLocationSalaryReport {
  is_multi_location: boolean;
  locations_compared: string[];
  position_title: string;
  job_description: string;
  recommendation: string;
  available_talent_pool: number;
  specialization: string;
  difficulty: string;
  nature: string;
  recommended_hiring_timeline: string;
  salary_benchmark: MultiLocationSalaryTier[];
  market_notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Types (per-location report structure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Salary benchmark tier for a single location.
 * Values are direct strings like "₱35,000" (not semicolon-separated).
 */
export interface SalaryTier {
  experience_range: string;
  experience_label: string;
  base_currency_min: string;
  base_currency_mid: string;
  base_currency_max: string;
  int_currency_min: string;
  int_currency_mid: string;
  int_currency_max: string;
}

/**
 * A single location's salary report extracted from a multi-location report.
 */
export interface LocationReport {
  location: string;
  position_title: string;
  job_description: string;
  recommendation: string;
  available_talent_pool: number | null;
  specialization: string;
  difficulty: string;
  nature: string;
  recommended_hiring_timeline: string;
  salary_benchmark: SalaryTier[];
  market_notes: string;
}

/**
 * Result of splitting a multi-location report.
 */
export interface SplitResult {
  reports: LocationReport[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Required Experience Tiers
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_EXPERIENCE_TIERS = ["1-3", "3-5", "5-7", "7-10", "10-15"] as const;

type SalaryField =
  | "base_currency_min"
  | "base_currency_mid"
  | "base_currency_max"
  | "int_currency_min"
  | "int_currency_mid"
  | "int_currency_max";

// ─────────────────────────────────────────────────────────────────────────────
// Parsing Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a semicolon-separated location:value string into a map.
 *
 * @example
 * parseLocationMap("Makati: ₱35,000; BGC Taguig: ₱38,000")
 * // Returns: { "Makati": "₱35,000", "BGC Taguig": "₱38,000" }
 */
function parseLocationMap(s: string | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};

  if (!s || typeof s !== "string") {
    return map;
  }

  const parts = s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) continue;

    const location = part.slice(0, colonIndex).trim();
    const value = part.slice(colonIndex + 1).trim();

    if (location && value) {
      map[location] = value;
    }
  }

  return map;
}

/**
 * Extracts location percentages from market notes.
 * Supports multiple formats:
 * - "Makati 45,000 / 30%" (with talent count and slash)
 * - "Makati ~40%" (with tilde prefix)
 * - "Makati 40%" (simple percentage)
 *
 * @example
 * extractLocationPercents("Makati 45,000 / 30%; BGC Taguig 35,000 / 25%")
 * // Returns: { "Makati": 30, "BGC Taguig": 25 }
 *
 * @example
 * extractLocationPercents("Makati ~40%, BGC Taguig ~35%")
 * // Returns: { "Makati": 40, "BGC Taguig": 35 }
 */
function extractLocationPercents(marketNotes: string | null | undefined): Record<string, number> {
  const result: Record<string, number> = {};

  if (!marketNotes || typeof marketNotes !== "string") {
    return result;
  }

  // Pattern 1: "Makati 45,000 / 30%" or "BGC Taguig 35000/25.5%" (with talent count)
  const patternWithCount = /([A-Za-z][A-Za-z\s-]*?)\s*[\d,]+\s*\/\s*(\d+(?:\.\d+)?)\s*%/g;

  // Pattern 2: "Makati ~40%" or "Makati 40%" (simple percentage with optional tilde)
  // Requires word boundary or specific delimiters to avoid false matches
  const patternSimple = /([A-Za-z][A-Za-z\s-]*?)\s*~\s*(\d+(?:\.\d+)?)\s*%/g;

  const patterns = [patternWithCount, patternSimple];

  for (const regex of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(marketNotes)) !== null) {
      const locationMatch = match[1];
      const percentMatch = match[2];

      if (!locationMatch || !percentMatch) continue;

      const location = locationMatch.trim();
      const percent = parseFloat(percentMatch);

      // Only add if location not already found (first pattern takes precedence)
      if (location && !isNaN(percent) && !(location in result)) {
        result[location] = percent;
      }
    }
  }

  return result;
}

/**
 * Removes mentions of other locations from text, keeping only the target location.
 * Handles common grammatical patterns to avoid leaving artifacts like "hire in where".
 *
 * Patterns handled:
 * - "in [Location]" → "" (preposition + location)
 * - "vs [Location]" / "vs. [Location]" → "" (comparison)
 * - "[Location] and [Location]" → "[Location]" (conjunctions)
 * - ", [Location]," → "," (list items)
 * - "[Location] ~N%" → "" (location with percentage in market notes)
 * - "[Location] is/are/averages/commands..." → "" (subject + verb patterns)
 */
function stripOtherLocations(text: string, keepLocation: string, allLocations: string[]): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  let output = text;

  for (const location of allLocations) {
    if (location === keepLocation) continue;

    // Escape special regex characters in location name
    const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Order matters: more specific patterns first, then generic location removal

    // Pattern: "[Location] is/are [adjective/comparison]" (e.g., "Ortigas is 7% below")
    // Removes the whole clause up to the next sentence boundary
    output = output.replace(
      new RegExp(`${escapedLocation}\\s+(?:is|are|averages?|commands?)\\s+[^.;]*[.;]?`, "gi"),
      ""
    );

    // Pattern: "in [Location]" (with word boundary to avoid partial matches)
    output = output.replace(new RegExp(`\\bin\\s+${escapedLocation}\\b`, "gi"), "");

    // Pattern: "vs [Location]" or "vs. [Location]"
    output = output.replace(new RegExp(`\\bvs\\.?\\s+${escapedLocation}\\b`, "gi"), "");

    // Pattern: "versus [Location]"
    output = output.replace(new RegExp(`\\bversus\\s+${escapedLocation}\\b`, "gi"), "");

    // Pattern: "below/above [Location]"
    output = output.replace(new RegExp(`\\b(?:below|above)\\s+${escapedLocation}\\b`, "gi"), "");

    // Pattern: "[Location] and " at start of comparison (e.g., "Makati and BGC")
    output = output.replace(new RegExp(`${escapedLocation}\\s+and\\s+`, "gi"), "");

    // Pattern: " and [Location]" (e.g., "hire in Makati and Ortigas")
    output = output.replace(new RegExp(`\\s+and\\s+${escapedLocation}\\b`, "gi"), "");

    // Pattern: " or [Location]" (e.g., "Makati or Ortigas")
    output = output.replace(new RegExp(`\\s+or\\s+${escapedLocation}\\b`, "gi"), "");

    // Pattern: "[Location] ~N%" (percentage distribution in market notes)
    output = output.replace(new RegExp(`${escapedLocation}\\s*~\\s*\\d+(?:\\.\\d+)?%,?`, "gi"), "");

    // Pattern: ", [Location]," (middle of a list)
    output = output.replace(new RegExp(`,\\s*${escapedLocation}\\s*,`, "gi"), ",");

    // Pattern: ", [Location]" at end of phrase (before period or end)
    output = output.replace(new RegExp(`,\\s*${escapedLocation}(?=\\s*[.;:]|$)`, "gi"), "");

    // Generic: remaining standalone location mentions
    output = output.replace(new RegExp(`\\b${escapedLocation}\\b`, "g"), "");
  }

  // Clean up artifacts
  output = output
    // Multiple spaces to single space
    .replace(/\s{2,}/g, " ")
    // Multiple commas to single comma
    .replace(/,\s*,+/g, ",")
    // Comma followed by period
    .replace(/,\s*\./g, ".")
    // Semicolon followed by period or another semicolon
    .replace(/;\s*[.;]/g, ".")
    // Leading comma in parentheses
    .replace(/\(\s*,/g, "(")
    // Trailing comma in parentheses
    .replace(/,\s*\)/g, ")")
    // Empty parentheses
    .replace(/\(\s*\)/g, "")
    // Orphaned ":" followed by nothing meaningful
    .replace(/:\s*([,;.])/g, "$1")
    // Double periods
    .replace(/\.{2,}/g, ".")
    // Space before punctuation
    .replace(/\s+([.,;:])/g, "$1")
    // Orphaned percentage patterns like ", ~35%," → ","
    .replace(/,\s*~\s*\d+(?:\.\d+)?%\s*,/g, ",")
    // Sentence starting with lowercase after period (fix case)
    .replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`)
    // Leading comma or semicolon at start
    .replace(/^[,;]\s*/, "")
    // Leading/trailing spaces
    .trim();

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a missing salary value found during validation.
 */
interface MissingSalaryValue {
  location: string;
  experienceRange: string;
  field: SalaryField;
  availableLocations: string[];
}

/**
 * Gets a salary value for a location from the parsed map.
 * @throws Error if the value is missing
 * @returns The salary value string
 */
function getSalaryValue(
  location: string,
  experienceRange: string,
  field: SalaryField,
  valueMap: Record<string, string>
): string {
  const value = valueMap[location];
  if (!value) {
    throw new Error(
      `Missing salary value for location "${location}" in field "${field}" (experience_range: ${experienceRange})`
    );
  }
  return value;
}

/**
 * Validates that all locations have salary data in all fields for all tiers.
 * This pre-validation catches incomplete AI researcher output early and provides
 * a comprehensive error message showing ALL missing values, not just the first one.
 *
 * @throws Error with detailed report of all missing salary values
 */
function validateSalaryCompleteness(salaryReport: MultiLocationSalaryReport): void {
  const locations = salaryReport.locations_compared;
  const salaryFields: SalaryField[] = [
    "base_currency_min",
    "base_currency_mid",
    "base_currency_max",
    "int_currency_min",
    "int_currency_mid",
    "int_currency_max",
  ];

  const missingValues: MissingSalaryValue[] = [];

  for (const tier of salaryReport.salary_benchmark) {
    for (const field of salaryFields) {
      const valueMap = parseLocationMap(tier[field]);
      const availableLocations = Object.keys(valueMap);

      for (const location of locations) {
        if (!valueMap[location]) {
          missingValues.push({
            location,
            experienceRange: tier.experience_range,
            field,
            availableLocations,
          });
        }
      }
    }
  }

  if (missingValues.length > 0) {
    // Group by location for clearer error message
    const byLocation = new Map<string, MissingSalaryValue[]>();
    for (const mv of missingValues) {
      const existing = byLocation.get(mv.location) || [];
      existing.push(mv);
      byLocation.set(mv.location, existing);
    }

    const errorLines: string[] = [
      `Incomplete salary data from AI researcher. Found ${missingValues.length} missing value(s):`,
    ];

    for (const [location, missing] of byLocation) {
      errorLines.push(`\n  Location "${location}" is missing from:`);
      for (const mv of missing) {
        const available =
          mv.availableLocations.length > 0
            ? `(available: ${mv.availableLocations.join(", ")})`
            : "(field is empty)";
        errorLines.push(`    - ${mv.field} [${mv.experienceRange}] ${available}`);
      }
    }

    errorLines.push(`\n  Expected locations: ${locations.join(", ")}`);
    errorLines.push(
      `\n  Hint: The AI researcher must include ALL locations in EVERY salary field.`
    );

    throw new Error(errorLines.join(""));
  }
}

/**
 * Validates the salary report structure before splitting.
 * @throws Error if validation fails
 */
function validateSalaryReport(salaryReport: MultiLocationSalaryReport): void {
  const tiers = salaryReport.salary_benchmark;
  const tierRanges = tiers.map((t) => t.experience_range);

  for (const requiredRange of REQUIRED_EXPERIENCE_TIERS) {
    if (!tierRanges.includes(requiredRange)) {
      throw new Error(`Missing required experience tier: ${requiredRange}`);
    }
  }

  if (
    !Array.isArray(salaryReport.locations_compared) ||
    salaryReport.locations_compared.length === 0
  ) {
    throw new Error("locations_compared is empty or missing");
  }

  // Validate all locations have complete salary data
  validateSalaryCompleteness(salaryReport);
}

// ─────────────────────────────────────────────────────────────────────────────
// Salary Tier Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a single location's salary tier from a multi-location tier.
 * @throws Error if any required salary value is missing for the location
 */
function extractLocationSalaryTier(tier: MultiLocationSalaryTier, location: string): SalaryTier {
  const minMap = parseLocationMap(tier.base_currency_min);
  const midMap = parseLocationMap(tier.base_currency_mid);
  const maxMap = parseLocationMap(tier.base_currency_max);
  const intMinMap = parseLocationMap(tier.int_currency_min);
  const intMidMap = parseLocationMap(tier.int_currency_mid);
  const intMaxMap = parseLocationMap(tier.int_currency_max);

  const expRange = tier.experience_range;

  return {
    experience_range: expRange,
    experience_label: tier.experience_label,
    base_currency_min: getSalaryValue(location, expRange, "base_currency_min", minMap),
    base_currency_mid: getSalaryValue(location, expRange, "base_currency_mid", midMap),
    base_currency_max: getSalaryValue(location, expRange, "base_currency_max", maxMap),
    int_currency_min: getSalaryValue(location, expRange, "int_currency_min", intMinMap),
    int_currency_mid: getSalaryValue(location, expRange, "int_currency_mid", intMidMap),
    int_currency_max: getSalaryValue(location, expRange, "int_currency_max", intMaxMap),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split a multi-location salary report into per-location reports.
 *
 * @param salaryReport - The multi-location salary report object
 * @returns Object containing array of per-location reports
 * @throws Error if validation fails (missing tiers, missing salary values, empty locations)
 *
 * @example
 * const { reports } = splitReports(multiLocationReport);
 * // reports[0].location === "Makati"
 * // reports[0].salary_benchmark[0].base_currency_min === "₱35,000"
 */
export function splitReports(salaryReport: MultiLocationSalaryReport): SplitResult {
  validateSalaryReport(salaryReport);

  const locations = salaryReport.locations_compared;
  const marketNotes = salaryReport.market_notes;
  const locationPercents = extractLocationPercents(marketNotes);
  const totalPool = salaryReport.available_talent_pool;

  const reports: LocationReport[] = locations.map((location) => {
    // Extract salary tiers for this location
    const salary_benchmark = salaryReport.salary_benchmark.map((tier) =>
      extractLocationSalaryTier(tier, location)
    );

    // Calculate location-specific talent pool based on percentage
    const percent = locationPercents[location];
    const available_talent_pool =
      percent !== undefined ? Math.round(totalPool * (percent / 100)) : null;

    return {
      location,
      position_title: salaryReport.position_title,
      job_description: salaryReport.job_description,
      recommendation: stripOtherLocations(salaryReport.recommendation, location, locations),
      available_talent_pool,
      specialization: salaryReport.specialization,
      difficulty: salaryReport.difficulty,
      nature: salaryReport.nature,
      recommended_hiring_timeline: salaryReport.recommended_hiring_timeline,
      salary_benchmark,
      market_notes: stripOtherLocations(marketNotes, location, locations),
    };
  });

  return { reports };
}
