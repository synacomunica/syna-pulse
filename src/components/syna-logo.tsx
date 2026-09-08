import { cn } from "@/lib/utils";

export function SynaLogo({
  className,
  variant = "light",
  showSub = true,
}: {
  className?: string;
  variant?: "light" | "dark";
  showSub?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl text-display text-[15px] leading-none",
          variant === "light"
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        S
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-display text-[17px] tracking-tight",
            variant === "light" ? "text-foreground" : "text-sidebar-foreground",
          )}
        >
          SYNA
        </span>
        {showSub ? (
          <span
            className={cn(
              "block text-[10px] font-medium uppercase tracking-[0.18em]",
              variant === "light" ? "text-muted-foreground" : "text-sidebar-foreground/60",
            )}
          >
            Diagnostic
          </span>
        ) : null}
      </span>
    </div>
  );
}
