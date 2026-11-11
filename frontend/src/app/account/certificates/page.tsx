"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Loader2, ArrowRight, Download } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Certificate {
  id: string;
  certificate_code: string;
  code?: string;
  course_title: string;
  issued_at: string;
}

export default function CertificatesPage() {
  const { token } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/my-certificates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCerts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white mb-2">My Certificates</h1>
        <p className="text-[#B7BDD0]">View and download your earned certificates.</p>
      </div>

      {certs.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#7559E8]/10 border border-[#7559E8]/20 flex items-center justify-center mx-auto mb-4">
            <Award size={28} className="text-[#A78BFA]" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">No certificates yet</h3>
          <p className="text-sm text-[#B7BDD0] mb-6">Complete a course to earn your first certificate.</p>
          <Link href="/courses" className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition">
            Browse Courses <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((cert) => (
            <div key={cert.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col hover:border-[#7559E8]/30 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F5A623]/10 flex items-center justify-center shrink-0">
                  <Award size={20} className="text-[#F5A623]" />
                </div>
                <span className="text-[10px] font-mono text-[#7A8199] uppercase tracking-wider bg-white/5 px-2 py-1 rounded">
                  {cert.certificate_code || cert.code}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-1">{cert.course_title}</h3>
              <p className="text-sm text-[#7A8199] mb-6">
                Issued on {new Date(cert.issued_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <Link
                href={`/account/certificates/${cert.certificate_code || cert.code}`}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <Download size={16} /> View Certificate
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
