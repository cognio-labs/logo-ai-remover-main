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

export function UploadZone({ accept, hint, type = "image", onFile, onAutoDetect, compact = false }: Props) {
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
      // 1. Check clipboard files (Ctrl+C from file explorer)
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

      // 2. Check clipboard items (Right-click Copy Image, screenshots, Snipping tool)
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
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0] || (e.dataTransfer.items?.[0]?.kind === "file" ? e.dataTransfer.items[0].getAsFile() : null);
        handle(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 ${compact ? "min-h-[250px] py-7 sm:min-h-[270px] sm:py-8" : "py-14 sm:py-16"} text-center transition-all duration-300 bg-white shadow-[0_12px_40px_-15px_rgba(225,29,72,0.08)] ${
        over
          ? "border-[#E11D48] bg-[#FFF5F7] shadow-[0_20px_50px_-10px_rgba(225,29,72,0.25)] scale-[1.01]"
          : "border-[#FCA5A5] hover:border-[#E11D48] hover:bg-[#FFF9FA]"
      }`}
    >
      {/* Pink upload icon with subtle pulse */}
      <span className={`flex ${compact ? "size-12 rounded-2xl" : "size-18 rounded-3xl"} items-center justify-center bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_8px_25px_rgba(225,29,72,0.35)] transition-transform hover:scale-105`}>
        <UploadCloud className={`${compact ? "size-6" : "size-8"} text-white`} />
      </span>

      <h3 className={`${compact ? "mt-3 text-lg sm:text-xl" : "mt-5 text-xl sm:text-2xl"} font-display font-bold text-gray-900 tracking-tight`}>
        Drop your {type} here
      </h3>
      <p className={`${compact ? "mt-1" : "mt-1.5"} max-w-md text-sm text-gray-500 font-medium`}>
        {hint} • Up to {maxLabel} • Drag &amp; drop or Paste (Ctrl+V)
      </p>

      {/* Buttons */}
      <div className={`${compact ? "mt-4" : "mt-6"} flex flex-wrap items-center justify-center gap-3`}>
        <PinkButton
          type="button"
          size="md"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <UploadCloud className="size-4" />
          <span>Upload {type === "image" ? "Image" : "Video"}</span>
        </PinkButton>

        {onAutoDetect && (
          <PinkButton
            type="button"
            variant="soft"
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              onAutoDetect();
            }}
          >
            <Wand2 className="size-4 text-[#E11D48]" />
            <span>Auto Detect</span>
          </PinkButton>
        )}
      </div>

      <div className={`${compact ? "mt-4" : "mt-6"} flex items-center gap-1.5 text-xs text-gray-400 font-medium`}>
        <ShieldCheck className="size-3.5 text-[#E11D48]" />
        <span>Files processed securely in isolated memory • Never used for training</span>
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
