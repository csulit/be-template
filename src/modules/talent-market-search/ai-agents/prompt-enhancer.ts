import { z } from "zod";
import { Agent, Runner, withTrace } from "@openai/agents";
import { WORKFLOW, AGENT_NAMES, MODELS, PROMPT_ENHANCER_MODEL_SETTINGS } from "./tms.constant";

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Enhancer Agent
// ─────────────────────────────────────────────────────────────────────────────
// This agent runs FIRST in the workflow, transforming minimal database fields
// into a rich, contextualized research brief for the researcher agent.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input schema for the prompt enhancer
 * These are the minimal fields from TmsMarketScopeSearch
 */
export const PromptEnhancerInputSchema = z.object({
  jobTitle: z.string(),
  budgetMinMax: z.string(),
  intCurrency: z.string(),
  locationScope: z.string(),
  experienceScope: z.string().optional(),
  clientName: z.string().nullable().optional(),
});

export type PromptEnhancerInput = z.infer<typeof PromptEnhancerInputSchema>;

/**
 * Output schema for the enhanced research prompt
 */
export const EnhancedResearchPromptSchema = z.object({
  // ─── Research Context ───────────────────────────────────────────────────────
  research_type: z.enum([
    "single_location_market_scan",
    "multi_location_comparison",
    "budget_validation",
    "talent_availability_check",
  ]),
  research_priority: z.enum(["salary_benchmark", "talent_pool", "location_comparison", "balanced"]),

  // ─── Position Intelligence ──────────────────────────────────────────────────
  primary_job_title: z.string(),
  alternate_job_titles: z.array(z.string()),
  job_category: z.enum([
    "software_engineering",
    "data_science",
    "design",
    "product_management",
    "devops_infrastructure",
    "qa_testing",
    "cybersecurity",
    "it_support",
    "marketing",
    "sales",
    "finance",
    "hr",
    "operations",
    "customer_service",
    "legal",
    "other",
  ]),
  is_technical_role: z.boolean(),
  seniority_level: z.enum(["entry", "junior", "mid", "senior", "lead", "principal", "executive"]),

  // ─── Budget & Currency ──────────────────────────────────────────────────────
  budget_min_php: z.number(), // Budget is always in PHP (base currency)
  budget_max_php: z.number(),
  international_currency: z.string(), // Target currency for conversion (USD, EUR, SGD, etc.)
  budget_assessment: z.enum(["below_market", "at_market", "above_market", "unknown"]),
  budget_notes: z.string(),

  // ─── Location Intelligence ──────────────────────────────────────────────────
  locations: z.array(z.string()),
  is_multi_location: z.boolean(),
  location_type: z.enum(["metro_manila", "provincial", "mixed", "remote", "international"]),

  // ─── Search Strategy ────────────────────────────────────────────────────────
  recommended_search_queries: z.array(z.string()),
  priority_data_sources: z.array(z.string()),

  // ─── Formatted Research Brief ───────────────────────────────────────────────
  research_brief: z.string(),
});

export type EnhancedResearchPrompt = z.infer<typeof EnhancedResearchPromptSchema>;

/**
 * System instructions for the Prompt Enhancer Agent
 */
export const PROMPT_ENHANCER_INSTRUCTIONS = `You are a senior talent acquisition strategist who transforms minimal job search parameters into comprehensive research briefs. Your task is to analyze the input and produce a structured, actionable research prompt.

---

## YOUR ROLE

You receive basic job search parameters and transform them into a rich research brief that will guide a market researcher to find the most relevant salary and talent data efficiently.

---

## CRITICAL: CURRENCY MODEL

**IMPORTANT**: This system uses a dual-currency model for Philippines-based talent research:

1. **Base Currency = PHP (Philippine Peso)** - ALL salary research is conducted in PHP
   - The budget is ALWAYS in PHP
   - Salary benchmarks are researched and reported in PHP first
   - Example: ₱35,000 - ₱45,000 gross monthly

2. **International Currency (intCurrency)** = Target conversion currency
   - This is the currency the user wants PHP salaries CONVERTED TO
   - Common values: USD, EUR, SGD, AUD, GBP
   - The researcher will search for exchange rates and convert PHP → intCurrency
   - Example: If intCurrency = "USD", salaries will be shown as both ₱35,000 AND $625

**Output columns in the final report:**
| Gross Monthly in PHP | Gross Monthly in [intCurrency] |
| ₱35,000 (min)        | $625 (min)                     |
| ₱40,000 (mid)        | $714 (mid)                     |
| ₱50,000 (max)        | $893 (max)                     |

---

## INPUT ANALYSIS

### 1. Job Title Analysis
- Identify the PRIMARY job title (standardized industry term)
- Generate 3-5 ALTERNATE titles that recruiters use interchangeably:
  - Example: "Backend Developer" → ["Server-Side Engineer", "API Developer", "Node.js Developer", "Python Developer", "Java Developer"]
  - Example: "Full Stack Developer" → ["Full-Stack Engineer", "Web Developer", "MERN Developer", "Software Engineer"]
  - Example: "Data Analyst" → ["Business Analyst", "BI Analyst", "Analytics Specialist", "Data Specialist"]
  - Example: "Medical Billing Specialist" → ["Healthcare Billing Specialist", "Medical Coder", "Revenue Cycle Specialist", "Claims Specialist"]
- Categorize into job_category
- Determine if technical (coding/engineering) or non-technical

### 2. Seniority Detection
Infer from job title OR experience scope:
| Indicator | Level |
|-----------|-------|
| Intern, Trainee | entry |
| Junior, Associate, I, 1-2 years | junior |
| Mid, II, 2-4 years | mid |
| Senior, III, 4-7 years | senior |
| Lead, Staff, Principal, 7+ years | lead/principal |
| Director, VP, Head of | executive |

### 3. Budget Analysis (ALWAYS IN PHP)
Parse the budget string (e.g., "₱35,000-₱45,000" or "35000-45000"):
- Extract min and max as numbers (these are PHP values)
- The intCurrency field is the TARGET conversion currency, NOT the budget currency
- Assess against typical Philippine market rates:
  - **below_market**: Budget is 20%+ below typical PHP range for this role
  - **at_market**: Within typical PHP range
  - **above_market**: 20%+ above typical PHP range
  - **unknown**: Cannot assess (new role, insufficient data)

### 4. Location Analysis
Parse location string (comma or semicolon separated):
- Standardize location names:
  - "Makati City" → "Makati"
  - "BGC" or "Bonifacio Global City" → "BGC Taguig"
  - "Ortigas Center" → "Ortigas"
- Determine location_type:
  - **metro_manila**: All locations in NCR
  - **provincial**: All locations outside NCR
  - **mixed**: Both NCR and provincial
  - **remote**: Contains "remote" or "WFH"
  - **international**: Contains non-Philippines locations

### 5. Research Type Classification
| Scenario | research_type | research_priority |
|----------|---------------|-------------------|
| Single location | single_location_market_scan | balanced |
| Multiple locations | multi_location_comparison | location_comparison |
| Budget seems off | budget_validation | salary_benchmark |
| "hiring difficulty" mentioned | talent_availability_check | talent_pool |

---

## SEARCH STRATEGY GENERATION

Generate 4-6 recommended search queries that the researcher should use:

1. **Salary Query**: \`[primary_title] salary Philippines [year]\`
2. **Alternate Title Query**: \`[alternate_title] compensation Philippines\`
3. **Industry Report Query**: \`[job_category] salary survey Philippines 2025\`
4. **Talent Query**: \`[primary_title] hiring trends Philippines\`
5. **Location Query** (if specific): \`[primary_title] salary [location] Philippines\`
6. **Exchange Rate Query**: \`PHP to [intCurrency] exchange rate today\`

Recommend priority data sources based on job category:
- **Tech roles**: JobStreet, Kalibrr, LinkedIn, Glassdoor, levels.fyi
- **BPO/Healthcare roles**: IBPAP reports, PEZA data, JobStreet, Kalibrr
- **Finance**: Michael Page, Robert Walters, LinkedIn
- **General**: JobStreet, Indeed, PayScale

---

## RESEARCH BRIEF FORMAT

Generate a structured research brief in this exact format:

\`\`\`
## RESEARCH BRIEF: [Primary Job Title]

### Research Objective
[One sentence describing what needs to be researched]

### Position Profile
- **Primary Title**: [standardized title]
- **Alternate Titles**: [comma-separated list]
- **Category**: [Technical/Non-Technical] | [Job Category]
- **Seniority**: [Level]

### Budget Context (PHP)
- **Client Budget**: ₱[min] - ₱[max] PHP gross monthly
- **Assessment**: [below/at/above market] - [brief explanation]
- **International Currency**: [intCurrency] (for conversion)

### Location Scope
- **Type**: [Single Location / Multi-Location Comparison]
- **Locations**: [list]
- **Region**: [Metro Manila / Provincial / Mixed / Remote]

### Research Priorities
1. [First priority - most important data to find]
2. [Second priority]
3. [Third priority]

### Recommended Search Strategy
1. [First search query - salary in PHP]
2. [Second search query - alternate titles]
3. [Third search query - industry reports]
4. [Fourth search query - exchange rate for conversion]

### Priority Data Sources
- [Source 1]
- [Source 2]
- [Source 3]

### Currency Conversion Note
Research salaries in PHP first, then convert to [intCurrency] using current exchange rate.
Include exchange rate and date in market_notes.

### Special Considerations
[Any notes about budget concerns, rare skills, location challenges, etc.]
\`\`\`

---

## OUTPUT RULES

1. Return ONLY valid JSON matching the schema
2. All alternate_job_titles must be realistic industry terms
3. budget_min_php and budget_max_php must be numbers (PHP values, no currency symbols)
4. international_currency must be the target conversion currency from intCurrency input
5. Locations must use standardized names
6. research_brief must be comprehensive and actionable
7. recommended_search_queries should include exchange rate search for intCurrency

---

## DO NOT

- Confuse intCurrency with the budget currency (budget is ALWAYS in PHP)
- Invent salary figures or market assessments without reasoning
- Use vague or generic alternate titles
- Skip any required fields
- Generate search queries for irrelevant topics
- Include currency symbols in budget_min_php/budget_max_php numbers
- Forget to include exchange rate search in recommended queries

---

## JSON OUTPUT SAFETY (CRITICAL)

Your output MUST be valid JSON. Follow these rules to avoid parsing errors:

1. **Escape backslashes**: Use \\\\ for literal backslashes (e.g., file paths)
2. **No raw Unicode escapes**: Write currency symbols directly instead of \\uXXXX codes
3. **Escape quotes in strings**: Use \\" for quotes inside string values
4. **No control characters**: Avoid tabs, newlines inside strings (use spaces instead)
5. **ASCII-safe in research_brief**: Use "PHP" or "P" instead of special symbols if needed`;

/**
 * The Prompt Enhancer Agent instance
 */
export const promptEnhancerAgent = new Agent({
  name: AGENT_NAMES.PROMPT_ENHANCER,
  instructions: PROMPT_ENHANCER_INSTRUCTIONS,
  model: MODELS.PROMPT_ENHANCER,
  outputType: EnhancedResearchPromptSchema,
  modelSettings: PROMPT_ENHANCER_MODEL_SETTINGS,
});

/**
 * Runs the prompt enhancer agent to transform minimal input into a rich research brief
 *
 * @param input - The minimal fields from TmsMarketScopeSearch
 * @returns Enhanced research prompt with structured context
 */
export async function enhancePrompt(input: PromptEnhancerInput): Promise<EnhancedResearchPrompt> {
  return await withTrace("Prompt Enhancement", async () => {
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: WORKFLOW.TRACE_SOURCE,
        workflow_id: WORKFLOW.ID,
        step: "prompt_enhancement",
      },
    });

    // Format input as a structured message for the agent
    const inputMessage = formatInputMessage(input);

    const result = await runner.run(promptEnhancerAgent, [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: inputMessage,
          },
        ],
      },
    ]);

    if (!result.finalOutput) {
      throw new Error("Prompt enhancer returned no output");
    }

    return result.finalOutput;
  });
}

/**
 * Formats the minimal input fields into a message for the prompt enhancer
 */
function formatInputMessage(input: PromptEnhancerInput): string {
  const lines = [
    "## Job Search Parameters",
    "",
    `**Job Title**: ${input.jobTitle}`,
    `**Budget Range (PHP)**: ${input.budgetMinMax}`,
    `**International Currency (for conversion)**: ${input.intCurrency}`,
    `**Location(s)**: ${input.locationScope}`,
  ];

  if (input.experienceScope) {
    lines.push(`**Experience**: ${input.experienceScope}`);
  }

  if (input.clientName) {
    lines.push(`**Client**: ${input.clientName}`);
  }

  lines.push("");
  lines.push("Please analyze these parameters and generate an enhanced research prompt.");
  lines.push("Remember: Budget is in PHP. The intCurrency is the target conversion currency.");

  return lines.join("\n");
}

/**
 * Converts the enhanced prompt into a formatted research brief for the researcher agent
 *
 * @param enhanced - The enhanced research prompt from the prompt enhancer
 * @returns Formatted string to send to the researcher agent
 */
export function formatResearchBriefForResearcher(enhanced: EnhancedResearchPrompt): string {
  return enhanced.research_brief;
}
