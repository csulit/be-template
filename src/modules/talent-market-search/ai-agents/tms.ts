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

type WorkflowInput = { input_as_text: string };

export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace(WORKFLOW.NAME, async () => {
    const state: {
      market_scoping_report: MarketScopingReport | null;
      split_reports: SplitResult | null;
      aggregated_location_report: AggregatedLocationReport | null;
    } = {
      market_scoping_report: null,
      split_reports: null,
      aggregated_location_report: null,
    };

    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: workflow.input_as_text,
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

    const result = await runner.run(talentAcquisitionSpecialistResearcher, [
      ...conversationHistory,
    ]);

    if (!result.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    state.market_scoping_report = result.finalOutput;

    if (result.finalOutput.is_multi_location == true) {
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
    }

    return state;
  });
};
