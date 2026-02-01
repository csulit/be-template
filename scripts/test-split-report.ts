import fs from "fs";
import { splitReports } from "../src/modules/talent-market-search/ai-agents/split-report.js";

// Full input from user
const input = {
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

const result = splitReports(input);

// Save to JSON file
const output = {
  input,
  output: result,
};

fs.writeFileSync("scripts/split-report-output.json", JSON.stringify(output, null, 2));
console.log("✅ Output saved to scripts/split-report-output.json");
