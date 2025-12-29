import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
  " hover-elevate active-elevate-2 transition-all duration-200 ease-in-out",
  {
      variants: {
        variant: {
          default:
            "bg-[#4B4E53] bg-[linear-gradient(147deg,#4B4E53_0%,#000000_74%)] text-white border border-[#4B4E53] shadow-md hover:opacity-90 hover:shadow-lg",
          destructive:
            "bg-gradient-to-r from-destructive via-destructive/90 to-destructive/80 text-destructive-foreground border border-destructive-border shadow-md hover:from-destructive/90 hover:via-destructive/80 hover:to-destructive/70 hover:shadow-lg",
          outline:
            // Shows the background color of whatever card / sidebar / accent background it is inside of.
            // Inherits the current text color.
            "border [border-color:var(--button-outline)] shadow-xs active:shadow-none hover:bg-[#4B4E53]/10 hover:border-[#4B4E53]/50",
          secondary: "border bg-gradient-to-r from-secondary via-secondary/95 to-secondary/90 text-secondary-foreground border-secondary-border shadow-sm hover:from-secondary/95 hover:via-secondary/90 hover:to-secondary/85 hover:shadow-md",
          // Add a transparent border so that when someone toggles a border on later, it doesn't shift layout/size.
          ghost: "border border-transparent hover:bg-[#4B4E53]/10",
        },
      // Heights are set as "min" heights, because sometimes Ai will place large amount of content
      // inside buttons. With a min-height they will look appropriate with small amounts of content,
      // but will expand to fit large amounts of content.
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
