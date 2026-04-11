interface BadgeProps {
  variant?: "default" | "success" | "warning" | "destructive";
  children: React.ReactNode;
  className?: string;
}

const variantClasses = {
  default: "bg-zinc-100 text-zinc-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  destructive: "bg-red-100 text-red-700",
} satisfies Record<NonNullable<BadgeProps["variant"]>, string>;

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
