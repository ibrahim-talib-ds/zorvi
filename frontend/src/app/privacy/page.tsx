import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

export const metadata = { title: "Privacy Policy", description: "Learn how IBRANT handles account information and platform activity." };

export default function PrivacyPage() {
  return (
    <PublicInfoPage eyebrow="Legal" title="Privacy policy" description="How IBRANT handles account information and platform activity when you use our services." updatedAt="November 2026">
      <div className="space-y-7">
          <section key="0"><h2>1. Information we collect</h2><p className="mt-2">When you register for IBRANT, we collect your email address, full name, and (optionally) a profile picture. If you use third-party logins (Google/GitHub), we receive your basic profile information from those providers. We also process course progress, certificates, and marketplace purchase history to provide the platform.</p></section>
          <section key="1"><h2>2. How we use information</h2><p className="mt-2">Your data is used to authenticate your account, process transactions, deliver purchased products, track learning progress, and issue certificates. We do not sell your personal data to third parties.</p></section>
          <section key="2"><h2>3. Data storage and security</h2><p className="mt-2">Account and platform data is stored and processed by the infrastructure providers used to operate IBRANT. Passwords are cryptographically hashed. Access controls are applied to protected backend resources.</p></section>
          <section key="3"><h2>4. Third-party services</h2><p className="mt-2">IBRANT may rely on third-party services for hosting, authentication, payments, storage, and analytics. Those providers process data under their own terms and privacy policies.</p></section>
          <section key="4"><h2>5. Your rights</h2><p className="mt-2">You can update profile information through account settings and request assistance with data access or account deletion by contacting support@ibrant.com.</p></section>
      </div>
    </PublicInfoPage>
  );
}
