import { Moon, CornerRightUp, CornerLeftDown } from "lucide-react";

type Props = {
  start: Date | string;
  end: Date | string;
  side: "start" | "end";
};

export default function OvernightIndicator({ start, end, side }: Props) {
  // accept Date or ISO/string
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);

  const crossesMidnight = s.toDateString() !== e.toDateString();
  const isMidnight =
    side === "start"
      ? s.getHours() === 0 && s.getMinutes() === 0
      : e.getHours() === 0 && e.getMinutes() === 0;

  if (!crossesMidnight && !isMidnight) return null;

  return (
    <div className="mt-1 flex items-center gap-1 text-[11px] leading-none text-blue-600">
      <Moon className="h-3 w-3" />
      {side === "start" ? (
        <>
          <CornerRightUp className="h-3 w-3" />
          <span>from previous day</span>
        </>
      ) : (
        <>
          <span>continues</span>
          <CornerLeftDown className="h-3 w-3" />
        </>
      )}
    </div>
  );
}
