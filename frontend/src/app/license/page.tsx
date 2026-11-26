import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

export const metadata = { title: "License Terms", description: "Understand the license permissions and restrictions for digital products purchased through IBRANT." };

export default function LicensePage() {
  return (
    <PublicInfoPage eyebrow="Legal" title="License terms" description="The permissions and restrictions that apply to digital products purchased through the IBRANT Marketplace." updatedAt="November 2026">
      <div className="space-y-7">
          <section key="0"><h2>1. Standard license</h2><p className="mt-2">When you purchase a software project from the IBRANT Marketplace, you are granted a non-exclusive, non-transferable license to use the source code for personal or commercial purposes.</p></section>
          <section key="1"><h2>2. Permitted use</h2><p className="mt-2">You may modify the code, integrate it into your own applications, and deploy it for your own business or clients.</p></section>
          <section key="2"><h2>3. Restrictions</h2><p className="mt-2">You may not resell, redistribute, or sublicense the unmodified source code as a competing marketplace product. You may not claim the original code as your own intellectual property.</p></section>
      </div>
    </PublicInfoPage>
  );
}
