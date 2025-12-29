import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const houseSizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* House Icon */}
      <svg
        className={cn("flex-shrink-0", houseSizeClasses[size])}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* House outline - triangular roof + rectangular base */}
        {/* Left vertical line extends down to align with text */}
        <line
          x1="10"
          y1="30"
          x2="10"
          y2="45"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* House shape: triangular roof + rectangular base */}
        <path
          d="M10 30 L10 22 L25 8 L40 22 L40 30 L10 30 Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
        />
        {/* Right vertical line is shorter, ends above the T */}
        <line
          x1="40"
          y1="30"
          x2="40"
          y2="26"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col -ml-1">
          {/* TERRACOTTA text - slightly overlaps house */}
          <span
            className={cn(
              "font-bold uppercase text-black dark:text-white leading-tight",
              textSizeClasses[size]
            )}
            style={{ fontFamily: 'sans-serif' }}
          >
            TERRACOTTA
          </span>
          {/* Black bar with white INVESTMENT LLC text */}
          <div className="bg-black dark:bg-white px-2 py-0.5 mt-0.5">
            <span
              className={cn(
                "font-semibold uppercase text-white dark:text-black leading-tight",
                size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm"
              )}
              style={{ fontFamily: 'sans-serif' }}
            >
              INVESTMENT LLC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

