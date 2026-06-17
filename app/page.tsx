import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ArtPreview from "./components/ArtPreview";


export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <Hero />
      <ArtPreview />

    </main>
  );
}