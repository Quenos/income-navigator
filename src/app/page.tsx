export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Income Navigator
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Dynamic PMCC Scanner
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-700">
          Read-only, rule-based screening for Dynamic PMCC criteria matches.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-lg font-semibold">Rule-based screening only</h2>
        <p className="mt-2">
          This tool performs rule-based screening only. It is not financial advice, investment
          advice, or a trade recommendation. Options involve risk and may result in substantial
          loss. The user is responsible for verifying all data, suitability, and trade decisions.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-950">Criteria Match</h2>
        <p className="mt-2 text-slate-700">
          Pass / Watch / Fail / Insufficient Data / Manual Review
        </p>
      </section>
    </main>
  );
}
