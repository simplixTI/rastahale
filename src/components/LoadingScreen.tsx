import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  className?: string;
  label?: string;
}

export function LoadingScreen({ className, label }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-3 bg-background",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
