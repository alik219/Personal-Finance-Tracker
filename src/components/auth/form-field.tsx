import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = React.ComponentProps<"input"> & {
  name: string;
  label: string;
  errors?: string[];
};

export function FormField({
  name,
  label,
  errors,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? errorId : undefined}
        {...inputProps}
      />
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
