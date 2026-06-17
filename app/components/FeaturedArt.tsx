export default function FeaturedArt() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="mb-10 text-4xl font-bold">
        Featured Artwork
      </h2>

      <div className="grid gap-6 md:grid-cols-3">

        <div className="h-96 rounded-3xl bg-zinc-900" />

        <div className="h-96 rounded-3xl bg-zinc-900" />

        <div className="h-96 rounded-3xl bg-zinc-900" />

      </div>
    </section>
  );
}