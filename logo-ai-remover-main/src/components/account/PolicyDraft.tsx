import Link from "next/link";
const drafts = {
  privacy: {
    title: "Privacy policy",
    items: [
      "Business identity and data controller contact",
      "Which account, contact, payment and processing data are collected",
      "Processing locations, vendors, retention periods and deletion process",
      "Cookie/analytics choices and privacy request procedure",
    ],
  },
  terms: {
    title: "Terms and conditions",
    items: [
      "Legal business name, jurisdiction and support details",
      "Permitted tool use and user responsibilities",
      "Published plan benefits, limits, renewal and account suspension rules",
      "Dispute handling and service availability terms",
    ],
  },
  refund: {
    title: "Refund policy",
    items: [
      "Eligibility and exclusions for plan and top-up refunds",
      "Cancellation procedure and effect on unused credits",
      "Treatment of failed jobs, partial usage and duplicate payments",
      "Approved refund request channel and processing expectations",
    ],
  },
  delivery: {
    title: "Delivery policy",
    items: [
      "Business-approved digital service delivery terms",
      "Access activation after backend-confirmed payment",
      "What users should do if a payment remains pending",
      "Supported processing limits and treatment of processing failures",
    ],
  },
};
export function PolicyDraft({ kind }: { kind: keyof typeof drafts }) {
  const draft = drafts[kind];
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 space-y-6">
      <p className="text-sm uppercase tracking-widest">Draft · awaiting business review</p>
      <h1 className="text-4xl font-semibold">{draft.title}</h1>
      <p>
        This document is awaiting the Bellix owner's business decisions and approval. It is not a
        finalized policy.
      </p>
      <h2 className="text-xl">Required before publication</h2>
      <ul className="list-disc pl-6 space-y-3">
        {draft.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Paid prices remain unpublished until configured. These drafts should be completed before
        enabling live payments or submitting the website for payment-provider review.
      </p>
      <Link href="/contact">Contact Bellix</Link>
    </article>
  );
}
