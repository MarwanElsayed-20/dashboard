import { LEAD_STAGES, labelOf, type LeadStage } from "@/lib/contact";

const tone: Record<LeadStage, string> = {
  open: "text-muted",
  replied: "text-foreground",
  won: "text-[#2f7a45]",
  lost: "text-muted line-through decoration-1",
};

/** The lead stage in a list row: a small dot and word, quieter than the topic badge. */
export function StageLabel({ stage }: { stage: LeadStage }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone[stage]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="sr-only">Stage: </span>
      {labelOf(LEAD_STAGES, stage)}
    </span>
  );
}
