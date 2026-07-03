export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 bg-ink-200/50 dark:bg-white/[0.06] rounded-lg" />
        <div className="h-4 w-72 bg-ink-100/50 dark:bg-white/[0.03] rounded-md mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 h-24" />
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}
