import { z } from "zod";

export const createBatchSchema = z.object({
  userIds: z.array(z.string().min(1)).length(1000),
});
