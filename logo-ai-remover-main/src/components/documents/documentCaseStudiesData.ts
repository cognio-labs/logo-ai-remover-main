export interface CaseStudyMetric {
  label: string;
  value: string;
}

export interface DocumentCaseStudy {
  id: string;
  number: string;
  category: string;
  badge: string;
  title: string;
  problemSummary: string;
  description: string;
  watermarkText: string;
  beforeUrl: string;
  afterUrl: string;
  fallbackBeforeJpg: string;
  fallbackAfterJpg: string;
  removedElements: string[];
  metrics: CaseStudyMetric[];
  trustBadges: {
    label: string;
    icon: "shield" | "vector" | "ocr" | "speed";
  }[];
}

export const DOCUMENT_CASE_STUDIES: DocumentCaseStudy[] = [
  {
    id: "case-invoice",
    number: "01",
    category: "Financial & Invoicing",
    badge: "Billing & Accounts",
    title: "Corporate Tax Invoice & Bank Ledger",
    problemSummary: "Removes heavy 'PAID / VOID' diagonal stamps without distorting financial figures",
    description:
      "Financial invoices frequently carry red ink audit stamps or diagonal watermark bands that obscure VAT totals, line item prices, and banking IBANs. Our vector neural separator isolates the ink layer from stamp artifacts, keeping 100% of the numbers intact.",
    watermarkText: "PAID · DO NOT DUPLICATE",
    beforeUrl: "/samples/invoice_before.webp",
    afterUrl: "/samples/invoice_after.webp",
    fallbackBeforeJpg: "/samples/invoice_before.jpg",
    fallbackAfterJpg: "/samples/invoice_after.jpg",
    removedElements: [
      "Diagonal 'PAID IN FULL' red ink stamp",
      "Stock billing watermark mesh",
      "Accounting audit overlay seal",
    ],
    metrics: [
      { label: "Number Clarity", value: "100% Preserved" },
      { label: "Paper Texture", value: "Lossless Rebuild" },
      { label: "Output Mode", value: "Vector PDF / 4K" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-nda",
    number: "02",
    category: "Legal & Compliance",
    badge: "Contract & Agreement",
    title: "Commercial NDA & Legal Agreement",
    problemSummary: "Removes 'CONFIDENTIAL / DRAFT' watermarks across multi-page legal typography",
    description:
      "Semi-transparent draft watermarks stamped diagonally across legal paragraphs degrade readability and break optical character recognition. Bellix.us purges the red/gray draft watermark layer while preserving crisp serif typography and clause hierarchy.",
    watermarkText: "CONFIDENTIAL · DRAFT COPY",
    beforeUrl: "/samples/nda_before.webp",
    afterUrl: "/samples/nda_after.webp",
    fallbackBeforeJpg: "/samples/nda_before.jpg",
    fallbackAfterJpg: "/samples/nda_after.jpg",
    removedElements: [
      "45° 'STRICTLY CONFIDENTIAL' stamp",
      "Draft review revision watermark",
      "Law firm background seal",
    ],
    metrics: [
      { label: "Font Sharpness", value: "Zero Anti-Aliasing Loss" },
      { label: "Clause Alignment", value: "100% Intact" },
      { label: "Processing Speed", value: "0.8s / Page" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-blueprint",
    number: "03",
    category: "Architecture & Engineering",
    badge: "CAD & Structural",
    title: "Architectural Blueprint & Floorplan",
    problemSummary: "Erases CAD evaluation grid watermarks without breaking critical dimension lines",
    description:
      "Engineering blueprints often have diagonal demo banners and grid overlays that obstruct dimension arrows, wall thicknesses, and room labels. The line-aware inpainting network reconstructs technical vectors with sub-millimeter fidelity.",
    watermarkText: "TRIAL EVALUATION · NOT FOR BUILD",
    beforeUrl: "/samples/blueprint_before.webp",
    afterUrl: "/samples/blueprint_after.webp",
    fallbackBeforeJpg: "/samples/blueprint_before.jpg",
    fallbackAfterJpg: "/samples/blueprint_after.jpg",
    removedElements: [
      "AutoCAD trial evaluation banner",
      "Checkerboard grid overlay lines",
      "Architect firm copyright stamp",
    ],
    metrics: [
      { label: "CAD Vector Lines", value: "Sub-pixel Precision" },
      { label: "Dimension Text", value: "100% Readable" },
      { label: "Grid Removal", value: "Artifact Free" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-certificate",
    number: "04",
    category: "Academic & Institutional",
    badge: "Certification",
    title: "Diploma & Achievement Certificate",
    problemSummary: "Cleans specimen marks and verification seals from high-value credentials",
    description:
      "Archival credentials often come stamped with 'SPECIMEN' or trial demo marks that ruin certificates intended for official portfolios. Bellix.us flawlessly restores intricate guilloche border geometry and parchment texture.",
    watermarkText: "SPECIMEN · ARCHIVAL COPY ONLY",
    beforeUrl: "/samples/certificate_before.webp",
    afterUrl: "/samples/certificate_after.webp",
    fallbackBeforeJpg: "/samples/certificate_before.jpg",
    fallbackAfterJpg: "/samples/certificate_after.jpg",
    removedElements: [
      "Archived 'SPECIMEN' rubber stamp",
      "Faint diagonal specimen watermark",
      "Issuer trial watermark overlay",
    ],
    metrics: [
      { label: "Guilloche Border", value: "Flawless Vector" },
      { label: "Color Tone", value: "True Parchment" },
      { label: "Resolution", value: "Native 600 DPI" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-whitepaper",
    number: "05",
    category: "Scientific & Publishing",
    badge: "Journal & Whitepaper",
    title: "Peer-Reviewed Scientific Whitepaper",
    problemSummary: "Purges publisher pre-print banners and DOI diagonal repository watermarks",
    description:
      "Research preprints from open archives often display intrusive banners and diagonal watermarks across formula tables. The neural inpainter purges these stamps without altering Greek symbols, sub-scripts, or mathematical equations.",
    watermarkText: "PRE-PRINT · NOT PEER REVIEWED",
    beforeUrl: "/samples/whitepaper_before.webp",
    afterUrl: "/samples/whitepaper_after.webp",
    fallbackBeforeJpg: "/samples/whitepaper_before.jpg",
    fallbackAfterJpg: "/samples/whitepaper_after.jpg",
    removedElements: [
      "Pre-print banner header & footer",
      "Diagonal repository watermark",
      "Draft review tracking bar",
    ],
    metrics: [
      { label: "Math Formulas", value: "100% Retained" },
      { label: "Citation Links", value: "Clickable" },
      { label: "Typography", value: "CMU Serif Crisp" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-medical",
    number: "06",
    category: "Healthcare & Diagnostics",
    badge: "Clinical & Lab",
    title: "Medical Diagnostic Lab Report",
    problemSummary: "Safely cleans hospital evaluation stamps while preserving critical diagnostic readings",
    description:
      "Patient records stamped with 'SAMPLE RECORD' or 'COPY NOT FOR CLINICAL USE' require careful sanitization for case-study presentations. The model ensures numeric lab values and reference ranges remain 100% unaltered.",
    watermarkText: "SAMPLE RECORD · FOR REVIEW ONLY",
    beforeUrl: "/samples/medical_before.webp",
    afterUrl: "/samples/medical_after.webp",
    fallbackBeforeJpg: "/samples/medical_before.jpg",
    fallbackAfterJpg: "/samples/medical_after.jpg",
    removedElements: [
      "Red 'SAMPLE RECORD' rubber stamp",
      "Hospital archival security watermark",
      "Fax transmission date header",
    ],
    metrics: [
      { label: "Table Structure", value: "100% Intact" },
      { label: "Numeric Values", value: "Zero Alteration" },
      { label: "Verification", value: "MD5 Checked" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-title",
    number: "07",
    category: "Government & Identity",
    badge: "Registration Form",
    title: "Official Property & Land Title Registry",
    problemSummary: "Strips heavy watermark scans and moiré security patterns from archival records",
    description:
      "Public record documents and deeds frequently carry micro-dot security meshes that interfere with document archiving and OCR scanning. The dual-frequency neural filter wipes background noise while preserving handwritten ink signatures.",
    watermarkText: "OFFICIAL COPY · DO NOT LAMINATE",
    beforeUrl: "/samples/title_registry_before.webp",
    afterUrl: "/samples/title_registry_after.webp",
    fallbackBeforeJpg: "/samples/title_registry_before.jpg",
    fallbackAfterJpg: "/samples/title_registry_after.jpg",
    removedElements: [
      "Micro-dot security pattern grid",
      "Municipal registry archive watermark",
      "County clerk duplicate stamp",
    ],
    metrics: [
      { label: "Stamp Isolation", value: "Sub-pixel Clean" },
      { label: "Handwriting Ink", value: "100% Preserved" },
      { label: "DPI Enhanced", value: "Up to 300%" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
  {
    id: "case-manuscript",
    number: "08",
    category: "Publishing & Media",
    badge: "Manuscript & E-Book",
    title: "Literary Manuscript & Preview E-Book",
    problemSummary: "Eradicates full-page repeating watermark grids across book pages",
    description:
      "Publisher preview copies watermarked with repeating reviewer emails destroy the reading flow. Bellix.us eliminates repeating grid watermarks, exporting crisp vector typography with exact book margins and page numbers intact.",
    watermarkText: "PROTECTED COPY · EVALUATION ONLY",
    beforeUrl: "/samples/manuscript_before.webp",
    afterUrl: "/samples/manuscript_after.webp",
    fallbackBeforeJpg: "/samples/manuscript_before.jpg",
    fallbackAfterJpg: "/samples/manuscript_after.jpg",
    removedElements: [
      "Full-page repeating email watermark grid",
      "Sample chapter warning banner",
      "Copyright watermark band",
    ],
    metrics: [
      { label: "Page Formatting", value: "100% Original" },
      { label: "Font Kerning", value: "Zero Shift" },
      { label: "Throughput", value: "25 Pages/min" },
    ],
    trustBadges: [
      { label: "100% Text Preserved", icon: "shield" },
      { label: "Vector Lossless", icon: "vector" },
      { label: "OCR Intact", icon: "ocr" },
      { label: "0.8s Processing", icon: "speed" },
    ],
  },
];
