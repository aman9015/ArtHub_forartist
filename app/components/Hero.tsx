import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6">
      <div className="hero-glow" />

      <div className="relative z-10 max-w-6xl text-center">
        <span className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400">
          🎨 Built for Artists
        </span>

        <h1 className="mt-8 text-6xl font-extrabold md:text-8xl">
          Share Art.
          <br />
          Build Your Audience.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          ArtHub helps artists showcase artwork, gain followers, and
          connect with a global creative community.
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            href="/explore"
            className="rounded-xl bg-white px-8 py-4 font-semibold text-black transition hover:bg-zinc-200"
          >
            Explore Art
          </Link>
        </div>
      </div>
    </section>
  );
}