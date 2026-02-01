import { z } from "zod";

export const TmsMarketScopeJobDataSchema = z.object({
  recordId: z.string(),
});

export type TmsMarketScopeJobData = z.infer<typeof TmsMarketScopeJobDataSchema>;

export const TmsMarketScopeSchedulerDataSchema = z.object({});

export type TmsMarketScopeSchedulerData = z.infer<typeof TmsMarketScopeSchedulerDataSchema>;
