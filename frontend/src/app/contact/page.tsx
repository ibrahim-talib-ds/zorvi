import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicInfoPage } from "@/components/layout/PublicInfoPage";

export const metadata = { title: "Contact IBRANT", description: "Get help with your account, courses, or marketplace purchases. Contact the IBRANT support team." };

export default function ContactPage() {
  return (
    <PublicInfoPage eyebrow="We're here to help" title="Talk to the IBRANT team" description="Questions about learning, a marketplace purchase, or your account? Send us a message and include the details needed to help you." >
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-bg-border bg-bg-elevated/60 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7559E8]/15 text-[#A78BFA]"><Mail size={21} /></div>
          <h2 className="mt-5">Email support</h2>
          <p className="mt-2">For account, course, billing, and marketplace questions, contact our support inbox.</p>
          <a className="mt-5 inline-flex items-center gap-2 font-semibold" href="mailto:support@ibrant.com?subject=IBRANT%20support%20request">support@ibrant.com <span aria-hidden="true">↗</span></a>
        </section>
        <section className="rounded-2xl border border-bg-border bg-bg-elevated/60 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#22C58B]/10 text-[#22C58B]"><MessageCircle size={21} /></div>
          <h2 className="mt-5">Help center</h2>
          <p className="mt-2">Check common questions before sending a request. For order issues, include your order number in the email.</p>
          <a className="mt-5 inline-flex items-center gap-2 font-semibold" href="/help">Browse frequently asked questions <span aria-hidden="true">↗</span></a>
        </section>
      </div>
      <div className="mt-6 flex gap-3 rounded-2xl border border-bg-border bg-bg-deep/60 p-5">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#22C58B]" size={20} />
        <p>Do not include passwords, payment-card numbers, or other sensitive credentials in support messages. We will never need your password to investigate an issue.</p>
      </div>
    </PublicInfoPage>
  );
}
