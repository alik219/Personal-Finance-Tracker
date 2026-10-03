import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;
  return (
    <Alert
      variant={error ? "destructive" : "default"}
      role={error ? "alert" : "status"}
    >
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}
