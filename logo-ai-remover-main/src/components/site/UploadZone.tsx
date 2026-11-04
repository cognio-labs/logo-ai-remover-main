import { useEffect, useRef, useState } from "react";
import { UploadCloud, Wand2, ShieldCheck } from "lucide-react";
import { PinkButton } from "./PinkButton";
import { toast } from "sonner";

type Props = {
  accept: string;
  hint: string;
  type?: "image" | "video";
  onFile: (file: File, objectUrl: string) => void;
  onAutoDetect?: () => void;
  compact?: boolean;
};

export function UploadZone({
  accept,
  hint,
  type = "image",
  onFile,
  onAutoDetect,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const maxSize = type === "image" ? 25 * 1024 * 1024 : 7 * 1024 * 1024;
  const maxLabel = type === "image" ? "25MB" : "7MB";

  const handle = (file?: File | null) => {
    if (!file) return;
    if (file.size > maxSize) {
      toast.error(`File is too large! Maximum limit is ${maxLabel}`);
      return;
    }

    if (type === "video") {
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      const tempUrl = URL.createObjectURL(file);
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        if (videoElement.duration > 15.5) {
          toast.error("Video is too long! Maximum allowed duration is 15 seconds.");
          return;
        }
        onFile(file, URL.createObjectURL(file));
      };
      videoElement.onerror = () => {
        onFile(file, URL.createObjectURL(file));
      };
      videoElement.src = tempUrl;
      return;
    }

    onFile(file, URL.createObjectURL(file));
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (type === "image" && file.type.startsWith("image/")) {
            e.preventDefault();
            handle(file);
            toast.success("Pasted image from clipboard!");
            return;
          } else if (type === "video" && file.type.startsWith("video/")) {
            e.preventDefault();
            handle(file);
            toast.success("Pasted video from clipboard!");
            return;
          }
        }
      }

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const itemType = items[i].type;
          if (type === "image" && itemType.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              handle(file);
              toast.success("Pasted image from clipboard!");
              return;
            }
          } else if (type === "video" && itemType.startsWith("video/")) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              handle(file);
              toast.success("Pasted video from clipboard!");
              return;
            }
          }
        }
      }

      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text && (text.startsWith("http") || text.startsWith("data:image/"))) {
        if (
          type === "image" &&
          (text.startsWith("data:image/") ||
            /\.(png|jpe?g|webp|avif|gif|bmp)(\?.*)?$/i.test(text))
        ) {
          e.preventDefault();
          fetch(text)
            .then((r) => r.blob())
            .then((b) => {
              const file = new File([b], "pasted-image.png", { type: b.type || "image/png" });
              handle(file);
              toast.success("Pasted image from link!");
            })
            .catch(() => toast.error("Could not load image from link."));
          return;
        }
      }
    };

    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, [type, onFile]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        const file =
          e.dataTransfer.files?.[0] ||
          (e.dataTransfer.items?.[0]?.kind === "file" ? e.dataTransfer.items[0].getAsFile() : null);
        if (file) {
          handle(file);
          return;
        }
        const uri =
          e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (uri && (uri.startsWith("http") || uri.startsWith("data:image/"))) {
          try {
            const res = await fetch(uri.trim());
            const blob = await res.blob();
            const cleanName = uri.trim().split("?")[0].split("/").pop() || "web-upload.png";
            handle(new File([blob], cleanName, { type: blob.type || "image/png" }));
          } catch {
            toast.error("Could not load image from external link.");
          }
        }
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 transition-all duration-300 bg-white border-[#10241e]/20 shadow-xl ${
        compact ? "min-h-[280px] py-8 sm:min-h-[300px] sm:py-10" : "min-h-[440px] py-16 sm:py-20"
      } text-center ${
        over
          ? "border-[#10241e] bg-[#f9faf7] shadow-2xl scale-[1.01]"
          : "hover:border-[#10241e] hover:bg-[#f9faf7]"
      }`}
    >
      {/* Luxury Forest & Lime Icon */}
      <span
        className={`flex ${compact ? "size-16 rounded-2xl" : "size-24 rounded-3xl"} items-center justify-center bg-[#10241e] text-[#d0f471] shadow-xl transition-transform hover:scale-105 mb-4`}
      >
        <UploadCloud className={`${compact ? "size-8" : "size-11"} text-[#d0f471]`} />
      </span>

      <h3
        className={`${compact ? "mt-2 text-xl sm:text-2xl" : "mt-4 text-2xl sm:text-4xl"} font-bold text-[#10241e] tracking-tight`}
      >
        Drop your {type} here
      </h3>
      <p className={`${compact ? "mt-1 text-sm" : "mt-2 text-base sm:text-lg"} max-w-md text-[#37433d] font-normal leading-relaxed`}>
        {hint} • Up to {maxLabel} • Drag &amp; drop or Paste (<kbd className="bg-[#e9ece4] border border-[#10241e]/15 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-[#10241e]">Ctrl+V</kbd>)
      </p>

      {/* Buttons */}
      <div
        className={`${compact ? "mt-5" : "mt-8"} flex flex-wrap items-center justify-center gap-3.5`}
      >
        <PinkButton
          type="button"
          size="lg"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="shadow-md"
        >
          <UploadCloud className="size-5" />
          <span>Upload {type === "image" ? "Image" : "Video"}</span>
        </PinkButton>

        {onAutoDetect && (
          <PinkButton
            type="button"
            variant="soft"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onAutoDetect();
            }}
          >
            <Wand2 className="size-5 text-[#10241e]" />
            <span>Auto Detect</span>
          </PinkButton>
        )}
      </div>

      <div
        className={`${compact ? "mt-4" : "mt-7"} flex items-center gap-2 text-xs sm:text-sm text-[#637069] font-medium`}
      >
        <ShieldCheck className="size-4 text-[#10241e]" />
        <span>Files processed securely in isolated memory • 100% private</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}
