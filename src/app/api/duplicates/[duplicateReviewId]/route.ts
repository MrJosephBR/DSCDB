import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";

const updateDuplicateSchema = z.object({
  status: z.enum(["open", "confirmed_duplicate", "rejected", "merged_manually"]),
  reason: z.string().optional()
});

type Context = {
  params: Promise<{ duplicateReviewId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    requireRole(request, ["admin", "curator"]);
    const { duplicateReviewId } = await context.params;
    const input = updateDuplicateSchema.parse(await request.json());
    const duplicate = await prisma.duplicateReview.update({
      where: { duplicateReviewId },
      data: {
        status: input.status,
        reason: input.reason,
        resolvedAt: input.status === "open" ? null : new Date()
      }
    });

    return Response.json({ data: duplicate });
  } catch (error) {
    return jsonError(error);
  }
}
