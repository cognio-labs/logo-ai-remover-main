# Editorial drafts — unpublished

These are complete text drafts, not evidence of successful demonstration runs. Insert owned demonstration assets and verify UI steps before publishing.

## Draft 1: Remove a product photo background and keep a reusable cutout

A product cutout lets you place the same item in a store banner, a catalog, or a design without carrying the original room or tabletop into every image. The useful result is a clean silhouette that still looks like the actual product. Removing a background should not change product color, labels, or shape.

Start with a sharp, well-lit original. A plain backdrop with clear separation around the item makes the edge easier to inspect. Avoid an image already compressed by a messaging app when the original is available. Transparent glass, reflective packaging, fine chains, and soft shadows need extra attention.

Open the [Bellix background remover](/background-remover), select your image, and let the tool produce a preview. The uploader limits images to 35 MB. PNG, JPEG and WebP are practical starting formats; support for other image types depends on browser decoding. Keep your original separately.

Inspect the silhouette before downloading. Zoom in on handles, holes, straps, product text and soft edges. Check against both a light and a dark background: a pale fringe can disappear on white and become obvious on a dark design. If the cutout removes part of the product, try a clearer source or review the available editor controls. Do not describe an inaccurate silhouette as a finished product image.

Choose PNG when you need transparency. Choose a solid background when the destination requires one; JPEG cannot store a transparent alpha channel. Check the current image rules of your marketplace independently rather than assuming a cutout automatically meets them.

Open the downloaded file in the application where you plan to use it. Confirm that dimensions, color and edge detail are sufficient at its final display size. A preview alone is not a substitute for reviewing the actual exported file.

**Required demonstration:** an owned product photo, the actual downloaded PNG, a light/dark comparison, and a difficult-edge failure example. Record browser, settings, source dimensions and date. No result or processing-time claim is supplied until that test exists.

Ready to make your own reusable asset? [Start with your product photo](/background-remover). For format help, read the transparent PNG guide; browse [other Bellix tools](/tools) for different editing tasks.

## Draft 2: Make a transparent PNG without confusing transparency with white

A white rectangle and a transparent background can look identical on a white page. They behave differently when placed over a colored design. Transparency lets the design show through; a white background covers it.

PNG can store an alpha channel, which describes how opaque each pixel is. JPEG does not support this kind of transparency. Renaming a `.jpg` file to `.png` changes its name, not the pixels or its background.

To create a cutout, open the [background remover](/background-remover) and select an original PNG, JPEG or WebP image within the 35 MB upload limit. Review the preview and select a transparent result rather than a solid background. Export PNG using the tool's download controls.

Check the actual export in a design application. Place it over a dark rectangle and then a bright colored rectangle. Both should show through the areas you intended to remove. A checkerboard preview is helpful, but the downloaded file is the artifact that matters. Some image viewers display transparent pixels against white, so a white viewer background does not by itself mean the export failed.

Inspect semi-transparent edges too. Hair, fur, glass and motion blur can require partial transparency. A hard edge may look clipped; a pale fringe may carry traces of the original backdrop. Use a clearer original or available editing controls if those areas are unsuitable. Automatic removal does not guarantee a perfect edge.

When a destination needs a white background, intentionally composite the cutout over white and export in its required format. Keep the transparent PNG as a reusable master, so you can change the background later without repeating the cutout.

**Required demonstration:** actual exported PNG over two contrasting backdrops, a white-background JPEG for comparison, and a screenshot of the selected export option. Confirm current interface labels before publication.

[Create a transparent cutout](/background-remover), or explore the [sample image page](/background-remover/sample-images) before using your own original.

## Draft 3: Clean a supported Gemini sparkle mark and review the result

A visible corner sparkle is different from an invisible provenance signal. Bellix's Gemini tools target supported visible marks. They do not remove invisible SynthID, establish ownership, or change the origin of AI-generated media. Edit only files you own or are allowed to modify, and keep any disclosure required for your use.

Begin with the original export. Cropping, resizing and recompression can change the mark's position or pixel pattern, making a supported cleanup method less reliable. Preserve an untouched copy before editing.

For an image, open the [Gemini image watermark remover](/gemini-image-watermark-remover). Its file validation accepts PNG, JPEG and WebP up to 25 MB. Select your original and review the processed corner. Look for halos, bright outlines, missing texture or changes to nearby subjects. If the mark is unsupported or the result looks wrong, keep the original and choose a different workflow.

For video, use the [Gemini and Veo video tool](/gemini-video-watermark-remover). The browser workflow accepts MP4, MOV, WebM and MKV up to 100 MB, with codec compatibility also affecting whether a file works. Chrome and Edge are the intended starting browsers. Processing uses a browser-local engine, and the output is re-encoded MP4.

Review more than one frame. Check the start, middle and end, then play the complete clip. Watch the corner during scene changes, pans and dark frames, and listen to the audio. Re-encoding can change pixels outside the mark; a localized cleanup step does not imply a pixel-identical full-frame export.

If processing fails, record the browser, file type, source dimensions and a non-sensitive description of the failure. Avoid posting private media or filenames in a public support thread. A successful download should still be reviewed before publishing or handing the file to someone else.

**Required demonstration:** an owned original Gemini image, a short original Veo clip, actual exports, an unsupported/resized-source example and a recorded codec/device test. No perfect-cleanup, fixed processing-time or resolution guarantee should accompany this guide.

[Choose the image tool](/gemini-image-watermark-remover) or [start with an original video](/gemini-video-watermark-remover). For an unrelated document task, review the [PDF tool's requirements](/pdf-watermark-remover).
