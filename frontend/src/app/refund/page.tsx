import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

export const metadata = { title: "Refund Policy", description: "Review how refund requests for IBRANT digital products and services are handled." };

export default function RefundPage() {
  return (
    <PublicInfoPage eyebrow="Legal" title="Refund policy" description="Important information about refund requests for digital products and services." updatedAt="November 2026">
      <div className="space-y-7">
          <section key="0"><h2>1. Digital products</h2><p className="mt-2">Because marketplace products are digital software and downloadable files, sales are generally considered final after access or download is provided. Review the product description, requirements, and license before purchasing.</p></section>
          <section key="1"><h2>2. Exceptions</h2><p className="mt-2">If a purchased product is materially non-functional as described and the issue cannot be resolved, a refund request may be reviewed. Eligibility depends on the circumstances and applicable consumer-protection law.</p></section>
          <section key="2"><h2>3. How to request a review</h2><p className="mt-2">Contact support@ibrant.com with your order ID, a clear description of the issue, and relevant evidence. Do not include passwords or payment-card details.</p></section>
      </div>
    </PublicInfoPage>
  );
}
