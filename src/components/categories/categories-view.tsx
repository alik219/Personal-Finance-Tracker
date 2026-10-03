"use client";

import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY_KINDS } from "@/domain/categories/categories";
import { cn } from "@/lib/utils";
import { setCategoryHidden } from "@/server/actions/categories";

import {
  CategoryFormDialog,
  type EditableCategory,
} from "./category-form-dialog";
import { CategoryChip } from "./category-visuals";
import { DeleteCategoryDialog } from "./delete-category-dialog";

export type CategoryRow = EditableCategory & { hidden: boolean };

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; category: CategoryRow }
  | { kind: "delete"; category: CategoryRow }
  | null;

const SECTION_TITLES = { expense: "Expenses", income: "Income" } as const;

export function CategoriesView({ categories }: { categories: CategoryRow[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => !open && setDialog(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function toggleHidden(category: CategoryRow) {
    startTransition(async () => {
      const result = await setCategoryHidden(category.id, !category.hidden);
      setError(result.error);
    });
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Hidden categories stay on past transactions but aren't offered for new ones."
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus aria-hidden />
            Add category
          </Button>
        }
      />

      <FormMessage error={error} />

      {CATEGORY_KINDS.map(({ value: kind }) => {
        const rows = categories.filter((c) => c.kind === kind);
        const title = SECTION_TITLES[kind];
        return (
          <section key={kind} aria-label={title} className="grid gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No {title.toLowerCase()} categories.
              </p>
            ) : (
              <Card className="py-0">
                <ul aria-label={`${title} categories`} className="divide-y">
                  {rows.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <CategoryChip
                        color={category.color}
                        icon={category.icon}
                        className={cn(category.hidden && "opacity-50")}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-medium",
                            category.hidden && "text-muted-foreground",
                          )}
                        >
                          {category.name}
                        </p>
                        {category.hidden && (
                          <p className="text-xs text-muted-foreground">
                            Hidden
                          </p>
                        )}
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => setDialog({ kind: "edit", category })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          aria-label={`${category.hidden ? "Show" : "Hide"} ${category.name}`}
                          onClick={() => toggleHidden(category)}
                        >
                          {category.hidden ? (
                            <Eye aria-hidden />
                          ) : (
                            <EyeOff aria-hidden />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${category.name}`}
                          onClick={() =>
                            setDialog({ kind: "delete", category })
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        );
      })}

      <CategoryFormDialog
        open={dialog?.kind === "create" || dialog?.kind === "edit"}
        onOpenChange={close}
        category={dialog?.kind === "edit" ? dialog.category : undefined}
      />
      {dialog?.kind === "delete" && (
        <DeleteCategoryDialog
          open
          onOpenChange={close}
          category={dialog.category}
        />
      )}
    </>
  );
}
