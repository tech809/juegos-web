export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gradient-to-r from-border/30 via-border/50 to-border/30 ${className ?? ""}`}
    />
  );
}
