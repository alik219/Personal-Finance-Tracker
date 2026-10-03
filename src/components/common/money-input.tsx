import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MoneyInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  name: string;
  label: string;
  currency: string;
  errors?: string[];
};

/** A decimal amount field with the currency code shown inside it. */
export function MoneyInput({
  name,
  label,
  currency,
  errors,
  ...inputProps
}: MoneyInputProps) {
  const errorId = `${name}-error`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          className="pr-14 tabular-nums"
          aria-invalid={hasErrors || undefined}
          aria-describedby={hasErrors ? errorId : undefined}
          {...inputProps}
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground"
          aria-hidden
        >
          {currency}
        </span>
      </div>
      {hasErrors && (
        <ul id={errorId} className="text-sm text-destructive">
          {errors!.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
