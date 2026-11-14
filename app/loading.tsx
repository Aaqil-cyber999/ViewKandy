export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-32 rounded-full bg-slate-200" />
        <div className="h-14 w-full max-w-xl rounded-2xl bg-slate-200" />
        <div className="h-6 w-full max-w-md rounded-full bg-slate-200" />

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="h-48 rounded-2xl bg-slate-200" />
              <div className="mt-4 h-5 w-3/4 rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded-full bg-slate-200" />
              <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
