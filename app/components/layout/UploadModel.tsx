"use client";

import { useState } from "react";
import { ImagePlus, Upload, X, Type, FileText, Hash } from "lucide-react";
import { createClient } from "@/app/lib/supabase";

type UploadModalProps = {
  onClose: () => void;
  onCreateArtwork: () => void;
};

export default function UploadModal({
  onClose,
  onCreateArtwork,
}: UploadModalProps) {
  const supabase = createClient();

  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handlePublish() {
    if (!imageFile || !title.trim()) {
      alert("Please add an image and artwork title.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      alert("You must be logged in to upload artwork.");
      return;
    }

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("artworks")
      .upload(filePath, imageFile);

    if (uploadError) {
      setLoading(false);
      alert(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("artworks")
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase.from("artworks").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || tags.trim() || null,
      image_url: imageUrl,
    });

    setLoading(false);

    if (insertError) {
      alert(insertError.message);
      return;
    }

    onCreateArtwork();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <section className="w-full max-w-xl rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Upload Artwork</h1>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900/60 transition hover:border-zinc-500">
          {preview ? (
            <img
              src={preview}
              alt="Artwork Preview"
              className="h-full max-h-[220px] w-full object-cover"
            />
          ) : (
            <>
              <ImagePlus size={42} className="text-zinc-500" />
              <p className="mt-4 text-lg font-semibold">
                Click to upload artwork
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                PNG, JPG, JPEG or WEBP
              </p>
            </>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>

        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <Type size={20} className="text-zinc-500" />

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Artwork title"
              className="w-full bg-transparent outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <FileText size={20} className="mt-1 shrink-0 text-zinc-500" />

            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a short description..."
              className="w-full resize-none bg-transparent outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <Hash size={20} className="text-zinc-500" />

            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags: anime, fantasy, digitalart"
              className="w-full bg-transparent outline-none placeholder:text-zinc-500"
            />
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-60"
          >
            <Upload size={18} />
            {loading ? "Publishing..." : "Publish Artwork"}
          </button>
        </div>
      </section>
    </div>
  );
}