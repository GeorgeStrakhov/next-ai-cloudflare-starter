"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Copy } from "lucide-react";
import Image from "next/image";
import { getTransformedImageUrl } from "@/lib/services/s3";
import { toast } from "sonner";

interface UploadedImage {
  filename: string;
  url: string;
  key: string;
  size: number;
}

export function ImageUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy URL");
    }
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const imageFiles = Array.from(newFiles).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) return;

    setFiles((prev) => [...prev, ...imageFiles]);

    // Generate previews
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = (await response.json()) as { uploads: UploadedImage[] };
      setUploadedImages((prev) => [...prev, ...data.uploads]);

      // Clear files and previews after successful upload
      setFiles([]);
      setPreviews([]);
      toast.success(`Successfully uploaded ${data.uploads.length} image(s)`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        {/* Dropzone */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg mb-2">
            Drag and drop images here, or click to select
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports multiple files
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>

        {/* File previews before upload */}
        {previews.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Selected Files ({previews.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {files[index].name}
                  </p>
                </div>
              ))}
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
            </Button>
          </div>
        )}
      </div>

      {/* Uploaded images */}
      {uploadedImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Uploaded Images ({uploadedImages.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedImages.map((img, index) => (
              <div key={index} className="space-y-2 border rounded-lg p-3">
                <div className="relative w-full aspect-square">
                  <Image
                    src={getTransformedImageUrl(img.url)}
                    alt={img.filename}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <p className="text-sm text-gray-600 truncate">{img.filename}</p>
                <p className="text-xs text-gray-400">
                  {(img.size / 1024).toFixed(2)} KB
                </p>
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-gray-700">CDN URL:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={img.url}
                      readOnly
                      className="text-xs bg-gray-50 border rounded px-2 py-1 flex-1 truncate"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(img.url)}
                      className="shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
