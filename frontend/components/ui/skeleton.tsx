import { cn } from "@/lib/utils"

/** Loading placeholder: flat white/6 block with a shimmer sweep (paused under reduced motion by the global rule). */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-white/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent", className)}
      {...props}
    />
  )
}

export { Skeleton }
