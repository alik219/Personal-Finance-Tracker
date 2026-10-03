"use client";

import { useActionState, useEffect, useState } from "react";

import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_KINDS,
  colorOrDefault,
  iconOrDefault,
  type CategoryColor,
  type CategoryIcon,
  type CategoryKind,
} from "@/domain/categories/categories";
import type { FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils";
import { createCategory, updateCategory } from "@/server/actions/categories";

import {
  CATEGORY_ICON_COMPONENTS,
  CATEGORY_SWATCH,
  CategoryChip,
  keyLabel,
} from "./category-visuals";

export type EditableCategory = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: CategoryColor;
  icon: CategoryIcon;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create a new category. */
  category?: EditableCategory;
};

export function CategoryFormDialog({ open, onOpenChange, category }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, so each opening starts with a fresh form. */}
        {open && (
          <CategoryForm
            category={category}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// The real radio sits invisibly on top of its swatch, so clicks, keyboard and
// screen readers all use the native input.
const radioOverlay =
  "peer absolute inset-0 z-10 size-full cursor-pointer appearance-none opacity-0";

const optionRing =
  "ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50";

function CategoryForm({
  category,
  onDone,
}: {
  category?: EditableCategory;
  onDone: () => void;
}) {
  const editing = Boolean(category);
  const [state, formAction, pending] = useActionState(
    editing ? updateCategory : createCategory,
    {} as FormState,
  );
  const v = state.values;
  const errors = state.fieldErrors;

  // Tracked so the preview chip follows the picker.
  const [color, setColor] = useState<CategoryColor>(
    colorOrDefault(v?.color ?? category?.color ?? "blue"),
  );
  const [icon, setIcon] = useState<CategoryIcon>(
    iconOrDefault(v?.icon ?? category?.icon ?? "tag"),
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Change the name, color or icon."
            : "Group your transactions the way you think about them."}
        </DialogDescription>
      </DialogHeader>

      <FormMessage error={state.error} />
      {category && <input type="hidden" name="id" value={category.id} />}

      <div className="flex items-end gap-3">
        <CategoryChip color={color} icon={icon} className="size-9" />
        <div className="flex-1">
          <FormField
            name="name"
            label="Name"
            required
            maxLength={40}
            defaultValue={v?.name ?? category?.name}
            placeholder="e.g. Pets"
            errors={errors?.name}
          />
        </div>
      </div>

      {!editing && (
        <div className="grid gap-1.5">
          <Label htmlFor="kind">Type</Label>
          <NativeSelect
            id="kind"
            name="kind"
            className="w-full"
            defaultValue={v?.kind ?? "expense"}
          >
            {CATEGORY_KINDS.map((k) => (
              <NativeSelectOption key={k.value} value={k.value}>
                {k.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {CATEGORY_COLORS.map((c) => (
            <label key={c} className="relative">
              <input
                type="radio"
                name="color"
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                aria-label={keyLabel(c)}
                className={radioOverlay}
              />
              <span
                className={cn(
                  "block size-7 rounded-full",
                  CATEGORY_SWATCH[c],
                  optionRing,
                )}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div className="grid grid-cols-8 gap-1.5">
          {CATEGORY_ICONS.map((i) => {
            const Icon = CATEGORY_ICON_COMPONENTS[i];
            return (
              <label key={i} className="relative" title={keyLabel(i)}>
                <input
                  type="radio"
                  name="icon"
                  value={i}
                  checked={icon === i}
                  onChange={() => setIcon(i)}
                  aria-label={keyLabel(i)}
                  className={radioOverlay}
                />
                <span
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md text-muted-foreground peer-checked:bg-muted peer-checked:text-foreground hover:bg-muted",
                    optionRing,
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add category"}
        </Button>
      </DialogFooter>
    </form>
  );
}
