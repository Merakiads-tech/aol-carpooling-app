import { GraduationCap, HeartHandshake, Lock } from "lucide-react";
import type { Gender, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Shown when a ride is reserved for a single gender. */
export function GenderOnlyPill({
  gender,
}: {
  gender: Gender | null | undefined;
}) {
  if (gender !== "male" && gender !== "female") return null;
  const female = gender === "female";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        female
          ? "bg-[var(--female)] text-[var(--female-foreground)]"
          : "bg-primary text-primary-foreground",
      )}
    >
      <Lock className="size-3" aria-hidden />
      {female ? "Women only" : "Men only"}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === "none") return null;
  const isTeacher = role === "teacher";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isTeacher
          ? "bg-[var(--teacher)] text-[var(--teacher-foreground)]"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {isTeacher ? (
        <GraduationCap className="size-3" aria-hidden />
      ) : (
        <HeartHandshake className="size-3" aria-hidden />
      )}
      {isTeacher ? "Teacher" : "Volunteer"}
    </span>
  );
}

const GENDER_LABEL: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

/** Only rendered when a gender is provided (the API nulls it out per policy). */
export function GenderBadge({ gender }: { gender: Gender | null | undefined }) {
  if (!gender) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        gender === "female"
          ? "bg-[var(--female)] text-[var(--female-foreground)]"
          : "bg-muted text-muted-foreground",
      )}
    >
      {GENDER_LABEL[gender]}
    </span>
  );
}
