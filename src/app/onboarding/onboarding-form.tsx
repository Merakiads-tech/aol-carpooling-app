"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { saveProfile, type SaveState } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProfile,
    {},
  );

  // Pre-fill the photo with the Google avatar; user can replace it.
  const [photoUrl, setPhotoUrl] = useState<string>(
    profile.photo_url ?? profile.avatar_url ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large (max 5 MB).");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(path);
      setPhotoUrl(publicUrl);
      toast.success("Photo added.");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete your profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          This is shown to people you share rides with. It builds trust.
        </p>

        <form action={formAction} className="mt-8 space-y-6">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative size-28 overflow-hidden rounded-full border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Add or change photo"
            >
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <Camera className="size-8" aria-hidden />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? "Uploading…" : "Change"}
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-6 animate-spin text-white" />
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={onPickPhoto}
            />
            <p className="text-xs text-muted-foreground">
              Photo required <span className="text-destructive">*</span>
            </p>
            <input type="hidden" name="photo_url" value={photoUrl} />
          </div>

          {/* Name */}
          <Field label="Name" htmlFor="full_name" required>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </Field>

          {/* Phone */}
          <Field
            label="Phone number"
            htmlFor="phone"
            required
            hint="Shared with people you ride with, so you can coordinate."
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={profile.phone ?? "+91 "}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              required
            />
          </Field>

          {/* Gender */}
          <fieldset>
            <legend className="text-sm font-medium">
              Gender <span className="text-destructive">*</span>
            </legend>
            <RadioGroup
              name="gender"
              defaultValue={profile.gender ?? undefined}
              className="mt-2 grid grid-cols-3 gap-2"
              required
            >
              <ChoiceCard value="male" label="Male" />
              <ChoiceCard value="female" label="Female" />
              <ChoiceCard value="other" label="Other" />
            </RadioGroup>
          </fieldset>

          {/* Role */}
          <fieldset>
            <legend className="text-sm font-medium">
              Are you an Art of Living teacher or volunteer?
            </legend>
            <RadioGroup
              name="role"
              defaultValue={profile.role ?? "none"}
              className="mt-2 grid grid-cols-3 gap-2"
            >
              <ChoiceCard value="teacher" label="Teacher" />
              <ChoiceCard value="volunteer" label="Volunteer" />
              <ChoiceCard value="none" label="Neither" />
            </RadioGroup>
          </fieldset>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || uploading}
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : null}
            Save and continue
          </Button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChoiceCard({ value, label }: { value: string; label: string }) {
  return (
    <Label
      htmlFor={`opt-${value}`}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-lg border py-2.5 text-sm font-medium",
        "hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary",
      )}
    >
      <RadioGroupItem id={`opt-${value}`} value={value} className="sr-only" />
      {label}
    </Label>
  );
}
