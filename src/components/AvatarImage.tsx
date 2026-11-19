import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Foto de pessoa com plano B. Sem foto cadastrada (ou com link quebrado) o
 * navegador mostrava o texto alternativo vazando por cima do layout; aqui
 * entram as iniciais sobre um fundo neutro.
 */
const AvatarImage = ({ src, name, className, imgClassName }: {
  src?: string | null; name: string; className?: string; imgClassName?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={name}
        className={cn("flex items-center justify-center bg-secondary font-semibold text-muted-foreground", className)}
      >
        {initials || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-cover", className, imgClassName)}
    />
  );
};

export default AvatarImage;
