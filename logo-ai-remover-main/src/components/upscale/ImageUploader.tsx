import { useState, useRef, useEffect, ChangeEvent, DragEvent } from "react";
import { Upload, X, RefreshCw, Check, AlertCircle, Image as ImageIcon } from "lucide-react";
import { formatBytes } from "@/lib/upscaleEngine";
import { toast } from "sonner";

export type ImageFileMetadata = {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  width: number;
  height: number;
  type: string;
};

type Props = {
  onImageSelected: (file: File, previewUrl: string, metadata: ImageFileMetadata) => void;
  onImageRemoved: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  initialPreviewUrl?: string | null;
  initialMetadata?: ImageFileMetadata | null;
};

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
];

const MAX_SIZE_BYTES = 35 * 1024 * 1024; // 35MB

export function ImageUploader({
  onImageSelected,
  onImageRemoved,
  isProcessing = false,
  disabled = false,
  initialPreviewUrl = null,
  initialMetadata = null,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl);
  const [fileMetadata, setFileMetadata] = useState<ImageFileMetadata | null>(initialMetadata);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPreviewUrlRef = useRef<string | null>(null);

  // Sync initialPreviewUrl if changed externally
  useEffect(() => {
    if (initialPreviewUrl !== undefined) {
      setPreviewUrl(initialPreviewUrl);
    }
    if (initialMetadata !== undefined) {
      setFileMetadata(initialMetadata);
    }
  }, [initialPreviewUrl, initialMetadata]);

  // Object URL management: revoke previous blob only when replaced with another local blob
  const safeSetPreviewUrl = (newUrl: string | null) => {
    if (prevPreviewUrlRef.current && prevPreviewUrlRef.current !== newUrl && prevPreviewUrlRef.current.startsWith("blob:") && newUrl !== null) {
      URL.revokeObjectURL(prevPreviewUrlRef.current);
    }
    prevPreviewUrlRef.current = newUrl;
    setPreviewUrl(newUrl);
  };

  // Central Unified Image File Handler
  const handleImageFile = (file: File | null | undefined) => {
    if (!file) return;

    setErrorMsg(null);

    // 1. File Type Validation
    const isSupported = ALLOWED_TYPES.some((t) => file.type.toLowerCase().includes(t.replace("image/", ""))) || file.type.startsWith("image/");
    if (!isSupported) {
      const err = "Please upload a supported image file (PNG, JPG, WebP, GIF, AVIF).";
      setErrorMsg(err);
      toast.error(err);
      return;
    }

    // 2. File Size Validation
    if (file.size > MAX_SIZE_BYTES) {
      const err = "Image must be smaller than 35MB.";
      setErrorMsg(err);
      toast.error(err);
      return;
    }

    // 3. Create Object URL
    const objectUrl = URL.createObjectURL(file);

    // 4. Measure Real Image Dimensions
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const metadata: ImageFileMetadata = {
        name: file.name || "pasted-image.png",
        sizeBytes: file.size,
        sizeFormatted: formatBytes(file.size),
        width,
        height,
        type: file.type || "image/png",
      };

      safeSetPreviewUrl(objectUrl);
      setFileMetadata(metadata);
      setErrorMsg(null);

      // Notify parent component
      onImageSelected(file, objectUrl, metadata);
      toast.success(`Loaded "${metadata.name}" (${width} × ${height}px)`);
    };

    img.onerror = () => {
      const err = "Could not decode image file. Please try another format.";
      setErrorMsg(err);
      toast.error(err);
    };

    img.src = objectUrl;
  };

  // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || isProcessing) return;

      // Do not intercept text paste in input / textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        // If clipboard contains NO image, let normal text paste proceed
        const hasImage = Array.from(e.clipboardData?.items || []).some((item) => item.type.startsWith("image/"));
        if (!hasImage) return;
      }

      // Check clipboard items
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          return;
        }
      }

      // Fallback: check clipboard files list
      const files = Array.from(e.clipboardData?.files || []);
      const imageFile = files.find((f) => f.type.startsWith("image/"));
      if (imageFile) {
        e.preventDefault();
        handleImageFile(imageFile);
      }
    };

    // Global dragover/drop preventDefault to prevent browser navigating to dropped image
    const preventWindowDrop = (e: Event) => {
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
  }, [disabled, isProcessing]);

  // Drag & Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the actual container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files?.[0] || (e.dataTransfer.items?.[0]?.kind === "file" ? e.dataTransfer.items[0].getAsFile() : null);
    if (file) {
      handleImageFile(file);
    }
  };

  // File Picker Input Change
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    // Clear input value so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFilePicker = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveImage = () => {
    safeSetPreviewUrl(null);
    setFileMetadata(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageRemoved();
    toast.info("Image removed.");
  };

  return (
    <div
      className={`up-uploader-card ${isDragging ? "active-drag" : ""} ${previewUrl ? "has-preview" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      {/* Inline Error Banner if invalid file */}
      {errorMsg && (
        <div className="up-inline-error">
          <AlertCircle className="size-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="up-error-close"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* STATE 1: PREVIEW STATE (Actual Image Rendered) */}
      {previewUrl ? (
        <div className="up-preview-box">
          {/* Header with Metadata and Remove Button */}
          <div className="up-preview-header">
            <div className="up-preview-info">
              <span className="up-preview-filename" title={fileMetadata?.name || "Uploaded image"}>
                <ImageIcon className="size-3.5 text-[#f72568] shrink-0" />
                <b>{fileMetadata?.name || "image.png"}</b>
              </span>
              {fileMetadata && fileMetadata.width > 0 && (
                <span className="up-preview-dimensions">
                  {fileMetadata.width} × {fileMetadata.height}px
                  {fileMetadata.sizeFormatted ? ` · ${fileMetadata.sizeFormatted}` : ""}
                </span>
              )}
            </div>

            {/* Remove Button (X icon) */}
            <button
              type="button"
              className="up-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              title="Remove image"
              aria-label="Remove image"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Actual Visible Image Preview Frame */}
          <div className="up-preview-canvas" onClick={openFilePicker} title="Click to change image">
            <img
              src={previewUrl}
              alt="Uploaded image preview"
              className="uploaded-image"
            />
          </div>

          {/* Footer with "Ready to Upscale" and "Change Image" */}
          <div className="up-preview-footer">
            <div className="up-ready-badge-clean">
              <Check className="size-3 text-emerald-500" />
              <span>Ready to Upscale</span>
            </div>

            <button
              type="button"
              className="up-change-image-btn"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              <RefreshCw className="size-3.5" />
              <span>Change Image</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: EMPTY DROPZONE STATE */
        <div className="up-empty-dropzone" onClick={openFilePicker}>
          <span className="up-upload-icon-animated">
            <Upload className="size-6" />
          </span>

          <b className="up-drop-title">
            {isDragging ? "Drop your image right here" : "Drop your image here"}
          </b>

          <p className="up-drop-subtitle">
            PNG, JPG, WebP, GIF or AVIF · Up to 35MB · Paste (Ctrl+V)
          </p>

          <div className="up-drop-actions">
            <button
              type="button"
              className="up-primary-upload-btn"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              <Upload className="size-4" />
              <span>Upload Image</span>
            </button>
          </div>

          <span className="up-click-hint">or click anywhere to browse files</span>
        </div>
      )}
    </div>
  );
}
