function SkeletonCard() {
  return <div className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />;
}

export default function LoadingDashboard() {
  return (
    <div className="space-y-5">
      <div className="h-12 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-[var(--surface)]" />
    </div>
  );
}
