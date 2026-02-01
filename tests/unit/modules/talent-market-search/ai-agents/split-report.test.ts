import { describe, it, expect } from "vitest";

import {
  splitReports,
  type MultiLocationSalaryReport,
} from "../../../../../src/modules/talent-market-search/ai-agents/split-report.js";

describe("splitReports", () => {
  // The user-provided input data (output_parsed from TMS workflow)
  const multiLocationReport: MultiLocationSalaryReport = {
    is_multi_location: true,
    locations_compared: ["Makati", "BGC Taguig", "Ortigas"],
    position_title: "Full Stack Developer",
    job_description:
      "Designs, develops, and maintains both frontend and backend components of web applications, working across the stack (e.g., React/Vue + Node/.NET/Java/PHP). Requires 1+ years coding experience, knowledge of REST APIs, databases, and CI/CD; mid-to-senior roles typically require system design and team collaboration experience.",
    recommendation:
      "For cost-effectiveness hire in Ortigas where base cash salaries are ~7% below Makati on average; BGC commands a premium (~8-12%). Prioritize sourcing mid-level hires in Ortigas or offer hybrid/Remote - Philippines to reduce fixed cost. For senior hires where top-tier talent is critical, recruit in BGC or widen to Remote - Philippines and offer market-competitive total rewards (salary + benefits + learning budget). Use skills-based screening, coding assessments, and target local developer communities (Meetups, GitHub, local universities) to shorten time-to-hire.",
    available_talent_pool: 7500,
    specialization: "Web Development (Frontend + Backend)",
    difficulty: "Medium",
    nature: "Technical",
    recommended_hiring_timeline: "4-8 weeks",
    salary_benchmark: [
      {
        experience_range: "1-3",
        experience_label: "1-3 Years of Experience",
        base_currency_min: "Makati: ₱35,000; BGC Taguig: ₱38,500; Ortigas: ₱32,500",
        base_currency_mid: "Makati: ₱45,000; BGC Taguig: ₱49,500; Ortigas: ₱42,000",
        base_currency_max: "Makati: ₱60,000; BGC Taguig: ₱66,000; Ortigas: ₱56,000",
        int_currency_min: "Makati: $636; BGC Taguig: $700; Ortigas: $591",
        int_currency_mid: "Makati: $818; BGC Taguig: $900; Ortigas: $764",
        int_currency_max: "Makati: $1,091; BGC Taguig: $1,200; Ortigas: $1,018",
      },
      {
        experience_range: "3-5",
        experience_label: "3-5 Years of Experience",
        base_currency_min: "Makati: ₱60,000; BGC Taguig: ₱66,000; Ortigas: ₱56,000",
        base_currency_mid: "Makati: ₱85,000; BGC Taguig: ₱93,500; Ortigas: ₱79,000",
        base_currency_max: "Makati: ₱120,000; BGC Taguig: ₱132,000; Ortigas: ₱112,000",
        int_currency_min: "Makati: $1,091; BGC Taguig: $1,200; Ortigas: $1,018",
        int_currency_mid: "Makati: $1,545; BGC Taguig: $1,700; Ortigas: $1,436",
        int_currency_max: "Makati: $2,182; BGC Taguig: $2,400; Ortigas: $2,036",
      },
      {
        experience_range: "5-7",
        experience_label: "5-7 Years of Experience",
        base_currency_min: "Makati: ₱100,000; BGC Taguig: ₱110,000; Ortigas: ₱93,000",
        base_currency_mid: "Makati: ₱140,000; BGC Taguig: ₱154,000; Ortigas: ₱130,000",
        base_currency_max: "Makati: ₱190,000; BGC Taguig: ₱209,000; Ortigas: ₱177,000",
        int_currency_min: "Makati: $1,818; BGC Taguig: $2,000; Ortigas: $1,691",
        int_currency_mid: "Makati: $2,545; BGC Taguig: $2,800; Ortigas: $2,364",
        int_currency_max: "Makati: $3,455; BGC Taguig: $3,800; Ortigas: $3,218",
      },
      {
        experience_range: "7-10",
        experience_label: "7-10 Years of Experience",
        base_currency_min: "Makati: ₱140,000; BGC Taguig: ₱154,000; Ortigas: ₱130,000",
        base_currency_mid: "Makati: ₱190,000; BGC Taguig: ₱209,000; Ortigas: ₱177,000",
        base_currency_max: "Makati: ₱260,000; BGC Taguig: ₱286,000; Ortigas: ₱242,000",
        int_currency_min: "Makati: $2,545; BGC Taguig: $2,800; Ortigas: $2,364",
        int_currency_mid: "Makati: $3,455; BGC Taguig: $3,800; Ortigas: $3,218",
        int_currency_max: "Makati: $4,727; BGC Taguig: $5,200; Ortigas: $4,400",
      },
      {
        experience_range: "10-15",
        experience_label: "10-15 Years of Experience",
        base_currency_min: "Makati: ₱200,000; BGC Taguig: ₱220,000; Ortigas: ₱186,000",
        base_currency_mid: "Makati: ₱280,000; BGC Taguig: ₱308,000; Ortigas: ₱260,000",
        base_currency_max: "Makati: ₱380,000; BGC Taguig: ₱418,000; Ortigas: ₱353,000",
        int_currency_min: "Makati: $3,636; BGC Taguig: $4,000; Ortigas: $3,382",
        int_currency_mid: "Makati: $5,091; BGC Taguig: $5,600; Ortigas: $4,727",
        int_currency_max: "Makati: $6,909; BGC Taguig: $7,600; Ortigas: $6,418",
      },
    ],
    market_notes:
      "Exchange rate used: 1 USD = ₱55 (provided by user). Talent distribution estimate across locations: Makati ~40%, BGC Taguig ~35%, Ortigas ~25% of active full-stack candidates in Metro Manila. Observations: BGC typically commands an 8–12% salary premium vs Makati; Ortigas averages ~7% below Makati — reflected in the benchmarks above. Cost-effectiveness: Ortigas is the most cost-effective location on base salary alone; BGC is the most expensive. Estimates are based on regional Metro Manila differentials and market experience through 2023–2024; no live scraping was performed in this session. Assumptions/limitations: figures are market estimates (rounded) for cash base pay and do not include benefits, bonuses, stock/equity, or employer taxes. Available_talent_pool is an informed estimate (7,500) across the three locations; if you need precise, current job-board counts or company-specific benchmarks I can run a location-specific board scan and update the numbers.",
  };

  describe("successful splitting", () => {
    it("should split multi-location report into 3 location reports", () => {
      const result = splitReports(multiLocationReport);

      expect(result.reports).toHaveLength(3);
      expect(result.reports.map((r) => r.location)).toEqual(["Makati", "BGC Taguig", "Ortigas"]);
    });

    it("should extract correct salary tiers for Makati", () => {
      const result = splitReports(multiLocationReport);
      const makatiReport = result.reports.find((r) => r.location === "Makati");

      expect(makatiReport).toBeDefined();
      expect(makatiReport!.salary_benchmark).toHaveLength(5);

      // Check 1-3 years tier
      const juniorTier = makatiReport!.salary_benchmark.find((t) => t.experience_range === "1-3");
      expect(juniorTier).toEqual({
        experience_range: "1-3",
        experience_label: "1-3 Years of Experience",
        base_currency_min: "₱35,000",
        base_currency_mid: "₱45,000",
        base_currency_max: "₱60,000",
        int_currency_min: "$636",
        int_currency_mid: "$818",
        int_currency_max: "$1,091",
      });

      // Check 10-15 years tier
      const seniorTier = makatiReport!.salary_benchmark.find((t) => t.experience_range === "10-15");
      expect(seniorTier).toEqual({
        experience_range: "10-15",
        experience_label: "10-15 Years of Experience",
        base_currency_min: "₱200,000",
        base_currency_mid: "₱280,000",
        base_currency_max: "₱380,000",
        int_currency_min: "$3,636",
        int_currency_mid: "$5,091",
        int_currency_max: "$6,909",
      });
    });

    it("should extract correct salary tiers for BGC Taguig", () => {
      const result = splitReports(multiLocationReport);
      const bgcReport = result.reports.find((r) => r.location === "BGC Taguig");

      expect(bgcReport).toBeDefined();

      // Check 3-5 years tier (mid-level)
      const midTier = bgcReport!.salary_benchmark.find((t) => t.experience_range === "3-5");
      expect(midTier).toEqual({
        experience_range: "3-5",
        experience_label: "3-5 Years of Experience",
        base_currency_min: "₱66,000",
        base_currency_mid: "₱93,500",
        base_currency_max: "₱132,000",
        int_currency_min: "$1,200",
        int_currency_mid: "$1,700",
        int_currency_max: "$2,400",
      });
    });

    it("should extract correct salary tiers for Ortigas", () => {
      const result = splitReports(multiLocationReport);
      const ortigasReport = result.reports.find((r) => r.location === "Ortigas");

      expect(ortigasReport).toBeDefined();

      // Check 5-7 years tier
      const seniorTier = ortigasReport!.salary_benchmark.find((t) => t.experience_range === "5-7");
      expect(seniorTier).toEqual({
        experience_range: "5-7",
        experience_label: "5-7 Years of Experience",
        base_currency_min: "₱93,000",
        base_currency_mid: "₱130,000",
        base_currency_max: "₱177,000",
        int_currency_min: "$1,691",
        int_currency_mid: "$2,364",
        int_currency_max: "$3,218",
      });
    });

    it("should copy shared fields to each location report", () => {
      const result = splitReports(multiLocationReport);

      for (const report of result.reports) {
        expect(report.position_title).toBe("Full Stack Developer");
        expect(report.job_description).toBe(multiLocationReport.job_description);
        expect(report.specialization).toBe("Web Development (Frontend + Backend)");
        expect(report.difficulty).toBe("Medium");
        expect(report.nature).toBe("Technical");
        expect(report.recommended_hiring_timeline).toBe("4-8 weeks");
      }
    });

    it("should strip other locations from recommendation text", () => {
      const result = splitReports(multiLocationReport);
      const makatiReport = result.reports.find((r) => r.location === "Makati");

      // Makati report should not contain "BGC Taguig" or "Ortigas" in recommendation
      expect(makatiReport!.recommendation).not.toContain("BGC Taguig");
      expect(makatiReport!.recommendation).not.toContain("Ortigas");
      // But it should still have Makati references
      expect(makatiReport!.recommendation).toContain("Makati");
    });

    it("should calculate talent pool from tilde percentage format (Makati ~40%)", () => {
      // The market_notes uses "Makati ~40%" format which is now supported
      const result = splitReports(multiLocationReport);

      const makati = result.reports.find((r) => r.location === "Makati");
      const bgc = result.reports.find((r) => r.location === "BGC Taguig");
      const ortigas = result.reports.find((r) => r.location === "Ortigas");

      // 7500 * 0.40 = 3000
      expect(makati!.available_talent_pool).toBe(3000);
      // 7500 * 0.35 = 2625
      expect(bgc!.available_talent_pool).toBe(2625);
      // 7500 * 0.25 = 1875
      expect(ortigas!.available_talent_pool).toBe(1875);
    });
  });

  describe("talent pool calculation - percentage format variations", () => {
    it("should calculate from slash format (Makati 3000 / 40%)", () => {
      const reportWithSlashFormat: MultiLocationSalaryReport = {
        ...multiLocationReport,
        market_notes:
          "Makati 3000 / 40%; BGC Taguig 2625 / 35%; Ortigas 1875 / 25% of total talent.",
      };

      const result = splitReports(reportWithSlashFormat);

      const makati = result.reports.find((r) => r.location === "Makati");
      const bgc = result.reports.find((r) => r.location === "BGC Taguig");
      const ortigas = result.reports.find((r) => r.location === "Ortigas");

      expect(makati!.available_talent_pool).toBe(3000);
      expect(bgc!.available_talent_pool).toBe(2625);
      expect(ortigas!.available_talent_pool).toBe(1875);
    });

    it("should calculate from tilde format with spaces (Makati ~ 40%)", () => {
      const reportWithSpacedTilde: MultiLocationSalaryReport = {
        ...multiLocationReport,
        market_notes: "Talent distribution: Makati ~ 40%, BGC Taguig ~ 35%, Ortigas ~ 25%.",
      };

      const result = splitReports(reportWithSpacedTilde);

      const makati = result.reports.find((r) => r.location === "Makati");
      expect(makati!.available_talent_pool).toBe(3000);
    });

    it("should handle decimal percentages (Makati ~40.5%)", () => {
      const reportWithDecimals: MultiLocationSalaryReport = {
        ...multiLocationReport,
        available_talent_pool: 10000,
        market_notes: "Distribution: Makati ~40.5%, BGC Taguig ~34.5%, Ortigas ~25%.",
      };

      const result = splitReports(reportWithDecimals);

      const makati = result.reports.find((r) => r.location === "Makati");
      const bgc = result.reports.find((r) => r.location === "BGC Taguig");
      const ortigas = result.reports.find((r) => r.location === "Ortigas");

      // 10000 * 0.405 = 4050
      expect(makati!.available_talent_pool).toBe(4050);
      // 10000 * 0.345 = 3450
      expect(bgc!.available_talent_pool).toBe(3450);
      // 10000 * 0.25 = 2500
      expect(ortigas!.available_talent_pool).toBe(2500);
    });

    it("should return null when no percentage format matches", () => {
      const reportWithNoPercents: MultiLocationSalaryReport = {
        ...multiLocationReport,
        market_notes: "Talent is distributed across Makati, BGC Taguig, and Ortigas.",
      };

      const result = splitReports(reportWithNoPercents);

      for (const report of result.reports) {
        expect(report.available_talent_pool).toBeNull();
      }
    });

    it("should return null for locations not mentioned in percentages", () => {
      const reportWithPartialPercents: MultiLocationSalaryReport = {
        ...multiLocationReport,
        // Note: "Makati ~60%" must appear with proper delimiters for the regex to match
        market_notes: "Distribution: Makati ~60%. BGC Taguig and Ortigas data unavailable.",
      };

      const result = splitReports(reportWithPartialPercents);

      const makati = result.reports.find((r) => r.location === "Makati");
      const bgc = result.reports.find((r) => r.location === "BGC Taguig");
      const ortigas = result.reports.find((r) => r.location === "Ortigas");

      // 7500 * 0.60 = 4500
      expect(makati!.available_talent_pool).toBe(4500);
      expect(bgc!.available_talent_pool).toBeNull();
      expect(ortigas!.available_talent_pool).toBeNull();
    });

    it("should prefer slash format over tilde format when both present", () => {
      const reportWithBothFormats: MultiLocationSalaryReport = {
        ...multiLocationReport,
        market_notes:
          "Makati 3000 / 40% (slash format). Also mentioned: Makati ~50% (should be ignored).",
      };

      const result = splitReports(reportWithBothFormats);

      const makati = result.reports.find((r) => r.location === "Makati");
      // Should use 40% from slash format, not 50% from tilde
      expect(makati!.available_talent_pool).toBe(3000);
    });

    it("should handle comma-separated thousands in slash format", () => {
      const reportWithCommas: MultiLocationSalaryReport = {
        ...multiLocationReport,
        available_talent_pool: 100000,
        market_notes: "Makati 40,000 / 40%; BGC Taguig 35,000/35%; Ortigas 25,000 / 25%.",
      };

      const result = splitReports(reportWithCommas);

      const makati = result.reports.find((r) => r.location === "Makati");
      expect(makati!.available_talent_pool).toBe(40000);
    });
  });

  describe("validation errors", () => {
    it("should throw when locations_compared is empty", () => {
      const invalidReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        locations_compared: [],
      };

      expect(() => splitReports(invalidReport)).toThrow("locations_compared is empty or missing");
    });

    it("should throw when a required experience tier is missing", () => {
      const invalidReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        salary_benchmark: multiLocationReport.salary_benchmark.filter(
          (t) => t.experience_range !== "5-7"
        ),
      };

      expect(() => splitReports(invalidReport)).toThrow("Missing required experience tier: 5-7");
    });

    it("should throw comprehensive error when a salary value is missing for a location", () => {
      const invalidReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        salary_benchmark: [
          {
            experience_range: "1-3",
            experience_label: "1-3 Years of Experience",
            // Missing Ortigas in base_currency_min
            base_currency_min: "Makati: ₱35,000; BGC Taguig: ₱38,500",
            base_currency_mid: "Makati: ₱45,000; BGC Taguig: ₱49,500; Ortigas: ₱42,000",
            base_currency_max: "Makati: ₱60,000; BGC Taguig: ₱66,000; Ortigas: ₱56,000",
            int_currency_min: "Makati: $636; BGC Taguig: $700; Ortigas: $591",
            int_currency_mid: "Makati: $818; BGC Taguig: $900; Ortigas: $764",
            int_currency_max: "Makati: $1,091; BGC Taguig: $1,200; Ortigas: $1,018",
          },
          ...multiLocationReport.salary_benchmark.slice(1),
        ],
      };

      expect(() => splitReports(invalidReport)).toThrow(
        /Incomplete salary data from AI researcher.*Ortigas.*base_currency_min.*1-3/s
      );
    });

    it("should report all missing values in a single error message", () => {
      const invalidReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        salary_benchmark: [
          {
            experience_range: "1-3",
            experience_label: "1-3 Years of Experience",
            // Missing Makati in multiple fields
            base_currency_min: "BGC Taguig: ₱38,500; Ortigas: ₱32,500",
            base_currency_mid: "BGC Taguig: ₱49,500; Ortigas: ₱42,000",
            base_currency_max: "Makati: ₱60,000; BGC Taguig: ₱66,000; Ortigas: ₱56,000",
            int_currency_min: "Makati: $636; BGC Taguig: $700; Ortigas: $591",
            int_currency_mid: "Makati: $818; BGC Taguig: $900; Ortigas: $764",
            int_currency_max: "Makati: $1,091; BGC Taguig: $1,200; Ortigas: $1,018",
          },
          ...multiLocationReport.salary_benchmark.slice(1),
        ],
      };

      try {
        splitReports(invalidReport);
        expect.fail("Should have thrown an error");
      } catch (error) {
        const message = (error as Error).message;
        // Should report 2 missing values in one error
        expect(message).toContain("Found 2 missing value(s)");
        expect(message).toContain('Location "Makati"');
        expect(message).toContain("base_currency_min");
        expect(message).toContain("base_currency_mid");
        expect(message).toContain("Expected locations: Makati, BGC Taguig, Ortigas");
      }
    });

    it("should show available locations in error message for debugging", () => {
      const invalidReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        salary_benchmark: [
          {
            experience_range: "1-3",
            experience_label: "1-3 Years of Experience",
            // Missing Makati
            base_currency_min: "BGC Taguig: ₱38,500; Ortigas: ₱32,500",
            base_currency_mid: "Makati: ₱45,000; BGC Taguig: ₱49,500; Ortigas: ₱42,000",
            base_currency_max: "Makati: ₱60,000; BGC Taguig: ₱66,000; Ortigas: ₱56,000",
            int_currency_min: "Makati: $636; BGC Taguig: $700; Ortigas: $591",
            int_currency_mid: "Makati: $818; BGC Taguig: $900; Ortigas: $764",
            int_currency_max: "Makati: $1,091; BGC Taguig: $1,200; Ortigas: $1,018",
          },
          ...multiLocationReport.salary_benchmark.slice(1),
        ],
      };

      try {
        splitReports(invalidReport);
        expect.fail("Should have thrown an error");
      } catch (error) {
        const message = (error as Error).message;
        // Should show which locations ARE available for debugging
        expect(message).toContain("available: BGC Taguig, Ortigas");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle two-location reports", () => {
      const twoLocationReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        locations_compared: ["Makati", "BGC Taguig"],
        salary_benchmark: multiLocationReport.salary_benchmark.map((tier) => ({
          ...tier,
          // Remove Ortigas from all salary fields
          base_currency_min: tier.base_currency_min
            .split(";")
            .filter((s) => !s.includes("Ortigas"))
            .join(";"),
          base_currency_mid: tier.base_currency_mid
            .split(";")
            .filter((s) => !s.includes("Ortigas"))
            .join(";"),
          base_currency_max: tier.base_currency_max
            .split(";")
            .filter((s) => !s.includes("Ortigas"))
            .join(";"),
          int_currency_min: tier.int_currency_min
            .split(";")
            .filter((s) => !s.includes("Ortigas"))
            .join(";"),
          int_currency_mid: tier.int_currency_mid
            .split(";")
            .filter((s) => !s.includes("Ortigas"))
            .join(";"),
          int_currency_max: tier.int_currency_max
            .split(";")
            .filter((s) => !s.includes("Ortigas"))
            .join(";"),
        })),
      };

      const result = splitReports(twoLocationReport);

      expect(result.reports).toHaveLength(2);
      expect(result.reports.map((r) => r.location)).toEqual(["Makati", "BGC Taguig"]);
    });

    it("should handle location names with hyphens (like BGC-Taguig)", () => {
      const hyphenatedReport: MultiLocationSalaryReport = {
        ...multiLocationReport,
        locations_compared: ["Makati", "BGC-Taguig", "Ortigas"],
        salary_benchmark: multiLocationReport.salary_benchmark.map((tier) => ({
          ...tier,
          // Replace "BGC Taguig" with "BGC-Taguig" in all fields
          base_currency_min: tier.base_currency_min.replace("BGC Taguig", "BGC-Taguig"),
          base_currency_mid: tier.base_currency_mid.replace("BGC Taguig", "BGC-Taguig"),
          base_currency_max: tier.base_currency_max.replace("BGC Taguig", "BGC-Taguig"),
          int_currency_min: tier.int_currency_min.replace("BGC Taguig", "BGC-Taguig"),
          int_currency_mid: tier.int_currency_mid.replace("BGC Taguig", "BGC-Taguig"),
          int_currency_max: tier.int_currency_max.replace("BGC Taguig", "BGC-Taguig"),
        })),
      };

      const result = splitReports(hyphenatedReport);
      const bgcReport = result.reports.find((r) => r.location === "BGC-Taguig");

      expect(bgcReport).toBeDefined();
      expect(bgcReport!.salary_benchmark[0].base_currency_min).toBe("₱38,500");
    });

    it("should handle whitespace variations in salary strings", () => {
      const reportWithWhitespace: MultiLocationSalaryReport = {
        ...multiLocationReport,
        locations_compared: ["Makati", "Ortigas"],
        salary_benchmark: [
          {
            experience_range: "1-3",
            experience_label: "1-3 Years of Experience",
            // Extra whitespace variations
            base_currency_min: "Makati:₱35,000;  Ortigas:  ₱32,500",
            base_currency_mid: "Makati : ₱45,000 ; Ortigas : ₱42,000",
            base_currency_max: "Makati: ₱60,000; Ortigas: ₱56,000",
            int_currency_min: "Makati: $636; Ortigas: $591",
            int_currency_mid: "Makati: $818; Ortigas: $764",
            int_currency_max: "Makati: $1,091; Ortigas: $1,018",
          },
          ...multiLocationReport.salary_benchmark.slice(1).map((tier) => ({
            ...tier,
            base_currency_min: tier.base_currency_min
              .split(";")
              .filter((s) => !s.includes("BGC Taguig"))
              .join(";"),
            base_currency_mid: tier.base_currency_mid
              .split(";")
              .filter((s) => !s.includes("BGC Taguig"))
              .join(";"),
            base_currency_max: tier.base_currency_max
              .split(";")
              .filter((s) => !s.includes("BGC Taguig"))
              .join(";"),
            int_currency_min: tier.int_currency_min
              .split(";")
              .filter((s) => !s.includes("BGC Taguig"))
              .join(";"),
            int_currency_mid: tier.int_currency_mid
              .split(";")
              .filter((s) => !s.includes("BGC Taguig"))
              .join(";"),
            int_currency_max: tier.int_currency_max
              .split(";")
              .filter((s) => !s.includes("BGC Taguig"))
              .join(";"),
          })),
        ],
      };

      const result = splitReports(reportWithWhitespace);

      const makati = result.reports.find((r) => r.location === "Makati");
      const ortigas = result.reports.find((r) => r.location === "Ortigas");

      expect(makati!.salary_benchmark[0].base_currency_min).toBe("₱35,000");
      expect(ortigas!.salary_benchmark[0].base_currency_min).toBe("₱32,500");
    });

    it("should preserve original order of experience tiers", () => {
      const result = splitReports(multiLocationReport);

      for (const report of result.reports) {
        const ranges = report.salary_benchmark.map((t) => t.experience_range);
        expect(ranges).toEqual(["1-3", "3-5", "5-7", "7-10", "10-15"]);
      }
    });
  });

  describe("market notes stripping", () => {
    it("should strip all other location mentions from market_notes", () => {
      const result = splitReports(multiLocationReport);

      const makatiReport = result.reports.find((r) => r.location === "Makati");
      const bgcReport = result.reports.find((r) => r.location === "BGC Taguig");
      const ortigasReport = result.reports.find((r) => r.location === "Ortigas");

      // Makati report should not mention other locations
      expect(makatiReport!.market_notes).not.toContain("BGC Taguig");
      expect(makatiReport!.market_notes).not.toContain("Ortigas");

      // BGC report should not mention other locations
      expect(bgcReport!.market_notes).not.toContain("Makati");
      expect(bgcReport!.market_notes).not.toContain("Ortigas");

      // Ortigas report should not mention other locations
      expect(ortigasReport!.market_notes).not.toContain("Makati");
      expect(ortigasReport!.market_notes).not.toContain("BGC Taguig");
    });

    it("should clean up extra whitespace after stripping locations", () => {
      const reportWithDenseText: MultiLocationSalaryReport = {
        ...multiLocationReport,
        market_notes: "Compare Makati vs BGC Taguig vs Ortigas for best value.",
      };

      const result = splitReports(reportWithDenseText);
      const makatiReport = result.reports.find((r) => r.location === "Makati");

      // Should not have double spaces after stripping
      expect(makatiReport!.market_notes).not.toMatch(/\s{2,}/);
    });
  });

  describe("international currency handling", () => {
    it("should correctly extract USD values with dollar sign", () => {
      const result = splitReports(multiLocationReport);

      const makati = result.reports.find((r) => r.location === "Makati");
      const tier = makati!.salary_benchmark.find((t) => t.experience_range === "1-3");

      expect(tier!.int_currency_min).toBe("$636");
      expect(tier!.int_currency_mid).toBe("$818");
      expect(tier!.int_currency_max).toBe("$1,091");
    });

    it("should handle larger USD values with commas", () => {
      const result = splitReports(multiLocationReport);

      const bgc = result.reports.find((r) => r.location === "BGC Taguig");
      const seniorTier = bgc!.salary_benchmark.find((t) => t.experience_range === "10-15");

      expect(seniorTier!.int_currency_max).toBe("$7,600");
    });
  });

  describe("all required experience tiers validation", () => {
    const requiredTiers = ["1-3", "3-5", "5-7", "7-10", "10-15"];

    requiredTiers.forEach((tier) => {
      it(`should throw when ${tier} experience tier is missing`, () => {
        const invalidReport: MultiLocationSalaryReport = {
          ...multiLocationReport,
          salary_benchmark: multiLocationReport.salary_benchmark.filter(
            (t) => t.experience_range !== tier
          ),
        };

        expect(() => splitReports(invalidReport)).toThrow(
          `Missing required experience tier: ${tier}`
        );
      });
    });
  });

  describe("all salary fields validation", () => {
    const salaryFields = [
      "base_currency_min",
      "base_currency_mid",
      "base_currency_max",
      "int_currency_min",
      "int_currency_mid",
      "int_currency_max",
    ] as const;

    salaryFields.forEach((field) => {
      it(`should throw when ${field} is missing for a location`, () => {
        const invalidReport: MultiLocationSalaryReport = {
          ...multiLocationReport,
          salary_benchmark: [
            {
              ...multiLocationReport.salary_benchmark[0],
              // Remove Ortigas from this specific field
              [field]: multiLocationReport.salary_benchmark[0][field]
                .split(";")
                .filter((s) => !s.includes("Ortigas"))
                .join(";"),
            },
            ...multiLocationReport.salary_benchmark.slice(1),
          ],
        };

        // Now uses comprehensive error format
        expect(() => splitReports(invalidReport)).toThrow(
          new RegExp(`Incomplete salary data.*Ortigas.*${field}`, "s")
        );
      });
    });
  });
});
