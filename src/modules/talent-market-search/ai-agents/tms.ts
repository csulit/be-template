import { z } from "zod";
import { Agent, type AgentInputItem, Runner, withTrace } from "@openai/agents";
import { splitReports, type MultiLocationSalaryReport, type SplitResult } from "./split-report";
import {
  AGENT_NAMES,
  WORKFLOW,
  MODELS,
  RESEARCHER_MODEL_SETTINGS,
  RESEARCHER_TOOLS,
  AGGREGATOR_MODEL_SETTINGS,
  TALENT_ACQUISITION_RESEARCHER_INSTRUCTIONS,
  LOCATION_REPORT_AGGREGATOR_INSTRUCTIONS,
} from "./tms.constant";
import {
  enhancePrompt,
  formatResearchBriefForResearcher,
  type PromptEnhancerInput,
  type EnhancedResearchPrompt,
} from "./prompt-enhancer";

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

const SalaryBenchmarkSchema = z.object({
  experience_range: z.string(),
  experience_label: z.string(),
  base_currency_min: z.string(),
  base_currency_mid: z.string(),
  base_currency_max: z.string(),
  int_currency_min: z.string(),
  int_currency_mid: z.string(),
  int_currency_max: z.string(),
});

const TalentAcquisitionSpecialistResearcherSchema = z.object({
  is_multi_location: z.boolean(),
  locations_compared: z.array(z.string()),
  position_title: z.string(),
  job_description: z.string(),
  recommendation: z.string(),
  available_talent_pool: z.number(),
  specialization: z.string(),
  difficulty: z.string(),
  nature: z.string(),
  recommended_hiring_timeline: z.string(),
  salary_benchmark: z.array(SalaryBenchmarkSchema),
  market_notes: z.string(),
});

const LocationBreakdownSchema = z.object({
  location: z.string(),
  talent_pool: z.number(),
  cost_index: z.string(),
  cost_vs_average: z.string(),
});

const LocationReportAggregatorSchema = z.object({
  position_title: z.string(),
  job_description: z.string(),
  recommendation: z.string(),
  available_talent_pool: z.number(),
  specialization: z.string(),
  difficulty: z.string(),
  nature: z.string(),
  recommended_hiring_timeline: z.string(),
  locations_analyzed: z.array(z.string()),
  salary_benchmark: z.array(SalaryBenchmarkSchema),
  location_breakdown: z.array(LocationBreakdownSchema),
  market_notes: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inferred Types from Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

type MarketScopingReport = z.infer<typeof TalentAcquisitionSpecialistResearcherSchema>;
type AggregatedLocationReport = z.infer<typeof LocationReportAggregatorSchema>;

// Re-export types for external use
export type { PromptEnhancerInput, EnhancedResearchPrompt };

// ─────────────────────────────────────────────────────────────────────────────
// Agent Definitions
// ─────────────────────────────────────────────────────────────────────────────

const talentAcquisitionSpecialistResearcher = new Agent({
  name: AGENT_NAMES.TALENT_ACQUISITION_RESEARCHER,
  instructions: TALENT_ACQUISITION_RESEARCHER_INSTRUCTIONS,
  model: MODELS.RESEARCHER,
  tools: RESEARCHER_TOOLS,
  outputType: TalentAcquisitionSpecialistResearcherSchema,
  modelSettings: RESEARCHER_MODEL_SETTINGS,
});

const locationReportAggregator = new Agent({
  name: AGENT_NAMES.LOCATION_REPORT_AGGREGATOR,
  instructions: LOCATION_REPORT_AGGREGATOR_INSTRUCTIONS,
  model: MODELS.AGGREGATOR,
  outputType: LocationReportAggregatorSchema,
  modelSettings: AGGREGATOR_MODEL_SETTINGS,
});

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Legacy input format (plain text) - kept for backward compatibility
 */
type LegacyWorkflowInput = { input_as_text: string };

/**
 * Structured input format - preferred for new implementations
 * Uses the prompt enhancer agent to generate optimized research briefs
 */
type StructuredWorkflowInput = { structured_input: PromptEnhancerInput };

/**
 * Union type for workflow input - supports both legacy and structured formats
 */
type WorkflowInput = LegacyWorkflowInput | StructuredWorkflowInput;

/**
 * Type guard to check if input is structured format
 */
function isStructuredInput(input: WorkflowInput): input is StructuredWorkflowInput {
  return "structured_input" in input;
}

/**
 * Workflow state including the enhanced prompt from the prompt enhancer
 */
interface WorkflowState {
  enhanced_prompt: EnhancedResearchPrompt | null;
  market_scoping_report: MarketScopingReport | null;
  split_reports: SplitResult | null;
  aggregated_location_report: AggregatedLocationReport | null;
}

export const runWorkflow = async (workflow: WorkflowInput): Promise<WorkflowState> => {
  return await withTrace(WORKFLOW.NAME, async () => {
    const state: WorkflowState = {
      enhanced_prompt: null,
      market_scoping_report: null,
      split_reports: null,
      aggregated_location_report: null,
    };

    let researchBrief: string;

    // ─── Step 1: Prompt Enhancement ───────────────────────────────────────────
    // If structured input is provided, run the prompt enhancer first
    if (isStructuredInput(workflow)) {
      console.log("[TMS Workflow] Running prompt enhancer agent...");
      const enhancedPrompt = await enhancePrompt(workflow.structured_input);
      state.enhanced_prompt = enhancedPrompt;
      researchBrief = formatResearchBriefForResearcher(enhancedPrompt);
      console.log("[TMS Workflow] Prompt enhancement complete");
    } else {
      // Legacy mode: use the raw text directly
      researchBrief = workflow.input_as_text;
    }

    // ─── Step 2: Market Research ──────────────────────────────────────────────
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: researchBrief,
          },
        ],
      },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: WORKFLOW.TRACE_SOURCE,
        workflow_id: WORKFLOW.ID,
      },
    });

    console.log("[TMS Workflow] Running researcher agent...");
    const result = await runner.run(talentAcquisitionSpecialistResearcher, [
      ...conversationHistory,
    ]);

    if (!result.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    state.market_scoping_report = result.finalOutput;
    console.log("[TMS Workflow] Research complete");

    // ─── Step 3: Multi-Location Aggregation (if applicable) ───────────────────
    if (result.finalOutput.is_multi_location === true) {
      console.log("[TMS Workflow] Multi-location detected, running aggregator...");
      const splitResult = splitReports(result.finalOutput as MultiLocationSalaryReport);

      state.split_reports = splitResult;

      const aggregatedResult = await runner.run(locationReportAggregator, [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Split reports: ${JSON.stringify(state.split_reports)}`,
            },
          ],
        },
      ]);

      if (!aggregatedResult.finalOutput) {
        throw new Error("Location aggregator result is undefined");
      }

      state.aggregated_location_report = aggregatedResult.finalOutput;
      console.log("[TMS Workflow] Aggregation complete");
    }

    return state;
  });
};
