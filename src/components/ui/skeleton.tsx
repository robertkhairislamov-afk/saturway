import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

function TaskSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card space-y-3">
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="p-2.5 rounded-xl border border-border/50 bg-card text-center space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-6 w-12 mx-auto" />
    </div>
  );
}

function HabitSkeleton() {
  return (
    <div className="space-y-4 p-6 rounded-xl border border-border/50 bg-card">
      <Skeleton className="h-6 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-2 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, TaskSkeleton, StatCardSkeleton, HabitSkeleton };
