import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

export const metadata = { title: "Terms of Service", description: "Read the terms governing access to IBRANT, user accounts, learning content, and marketplace products." };

export default function TermsPage() {
  return (
    <PublicInfoPage eyebrow="Legal" title="Terms of service" description="The basic terms governing access to IBRANT, user accounts, learning content, and marketplace products." updatedAt="November 2026">
      <div className="space-y-7">
          <section key="0"><h2>1. Acceptance of terms</h2><p className="mt-2">By accessing IBRANT, you agree to these Terms of Service. If you do not agree, please do not use the platform.</p></section>
          <section key="1"><h2>2. User accounts</h2><p className="mt-2">You are responsible for maintaining the confidentiality of your account credentials and providing accurate information during registration. You must not use the platform for unlawful or unauthorized purposes.</p></section>
          <section key="2"><h2>3. Marketplace and academy</h2><p className="mt-2">Academy content is provided for personal learning. You may not redistribute, resell, or copy course materials without permission. Marketplace purchases are subject to the license shown for the relevant product. Check the listing and license before purchase.</p></section>
          <section key="3"><h2>4. Intellectual property</h2><p className="mt-2">Platform design, logos, and original content are owned by IBRANT or their respective rights holders. Third-party libraries and assets included in marketplace products remain subject to their respective licenses.</p></section>
          <section key="4"><h2>5. Limitation of liability</h2><p className="mt-2">To the extent permitted by applicable law, IBRANT provides platform content and services on an as-available basis and is not responsible for indirect or consequential losses arising from use of third-party software or marketplace products.</p></section>
      </div>
    </PublicInfoPage>
  );
}
