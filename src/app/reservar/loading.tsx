import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 py-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <Skeleton className="mb-3 h-5 w-40" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
