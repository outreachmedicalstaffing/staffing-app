import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Paperclip } from "lucide-react";

/**
 * Shows the user's current (or next) assigned shift.
 * Click "View details" to expand notes & attachments.
 */
export default function CurrentShift() {
  // who am i
  const { data: me } = useQuery<{ id: string }>({ queryKey: ["/api/auth/me"] });

  // all shifts and their assignments
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/shifts"] });
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-assignments"],
  });

  // filter to the user's shifts
  const myShifts = shifts.filter((s) =>
    assignments.some((a) => a.shiftId === s.id && a.userId === me?.id),
  );

  const now = new Date();
  const asDate = (d: any) => new Date(d);

  const current =
    myShifts.find(
      (s) => asDate(s.startTime) <= now && now <= asDate(s.endTime),
    ) || null;

  const next =
    myShifts
      .filter((s) => asDate(s.startTime) > now)
      .sort(
        (a, b) => asDate(a.startTime).getTime() - asDate(b.startTime).getTime(),
      )[0] || null;

  const active = current ?? next;

  if (!active) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        No assigned shift found.
      </div>
    );
  }

  const start = asDate(active.startTime);
  const end = asDate(active.endTime);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-medium truncate">
            {active.jobName ? `${active.jobName} • ` : ""}
            {active.title || "Shift"}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(start, "EEE, MMM d")} · {format(start, "h:mma")} –{" "}
            {format(end, "h:mma")}
          </div>
        </div>
        <div
          className="ml-3 h-3 w-3 rounded-full"
          style={{ backgroundColor: active.color || "#3b82f6" }}
          aria-hidden
        />
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer select-none text-sm text-primary hover:underline">
          View details
        </summary>
        <div className="mt-2 space-y-2 text-sm">
          {active.location && (
            <div>
              <div className="text-muted-foreground">Address</div>
              <div>{active.location}</div>
            </div>
          )}
          {active.notes && (
            <div>
              <div className="text-muted-foreground">Notes</div>
              <div className="whitespace-pre-wrap">{active.notes}</div>
            </div>
          )}
          {Array.isArray(active.attachments) &&
            active.attachments.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1">Attachments</div>
                <ul className="space-y-1">
                  {active.attachments.map((name: string, i: number) => (
                    <li key={i}>
                      <a
                        href={`/api/files/${name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="truncate">{name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </details>
    </div>
  );
}
