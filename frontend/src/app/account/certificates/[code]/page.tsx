"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface CertDetail {
  user_name: string;
  course_title: string;
  issued_at: string;
  code: string;
}

export default function CertificateViewPage() {
  const { code } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [cert, setCert] = useState<CertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/certificates/${code}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCert(await res.json());
        } else {
          router.push("/account/certificates");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [code, token, router]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  if (!cert) return null;

  const formattedDate = new Date(cert.issued_at).toLocaleDateString("en-US", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header - Hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/account/certificates" className="text-sm text-[#7A8199] hover:text-white flex items-center gap-2 transition">
          <ArrowLeft size={16} /> Back to Certificates
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* CERTIFICATE CANVAS */}
      <div className="print:m-0 print:p-0">
        <div className="relative bg-white text-black w-full aspect-[1.414/1] mx-auto shadow-2xl overflow-hidden p-12 md:p-16 lg:p-20"
             style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          
          {/* Double Border */}
          <div className="absolute inset-4 border-2 border-[#1e3a8a] pointer-events-none" />
          <div className="absolute inset-6 border border-[#1e3a8a]/50 pointer-events-none" />

          {/* Top Left Corner Decor */}
          <div className="absolute top-0 left-0">
            <div className="w-0 h-0 border-t-[120px] border-r-[120px] border-t-[#1e3a8a] border-r-transparent relative">
              <div className="absolute top-[-100px] left-[10px] w-0 h-0 border-t-[90px] border-r-[90px] border-t-[#eab308] border-r-transparent opacity-80" />
            </div>
          </div>

          {/* Bottom Right Corner Decor */}
          <div className="absolute bottom-0 right-0">
            <div className="w-0 h-0 border-b-[120px] border-l-[120px] border-b-[#1e3a8a] border-l-transparent relative">
               <div className="absolute bottom-[-100px] right-[10px] w-0 h-0 border-b-[90px] border-l-[90px] border-b-[#eab308] border-l-transparent opacity-80" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center">
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl text-[#1e3a8a] font-bold tracking-tight mb-4">
              Certificate of Completion
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-800 mb-8">
              This diploma is awarded to
            </p>

            <h2 className="text-4xl md:text-5xl lg:text-6xl text-[#1e3a8a] font-bold mb-6">
              {cert.user_name}
            </h2>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-16 h-px bg-gray-300" />
              <div className="w-2 h-2 rotate-45 border border-gray-400" />
              <div className="w-16 h-px bg-gray-300" />
            </div>

            <p className="text-lg md:text-xl text-gray-800 max-w-3xl leading-relaxed mb-8">
              For the successful completion of the designated course and the demonstration of outstanding knowledge, skill, and dedication to excellence.
            </p>

            <p className="text-xl md:text-2xl font-bold text-[#1e3a8a] mb-16">
              Course: {cert.course_title}
            </p>

            <p className="text-lg md:text-xl font-bold text-[#1e3a8a] mb-20">
              Awarded on this {formattedDate}.
            </p>

            {/* Footer Section */}
            <div className="w-full flex items-end justify-between px-8 md:px-20 mt-auto">
              
              {/* Gold Seal */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 md:w-32 md:h-32 relative flex items-center justify-center">
                  {/* Starburst background */}
                  <svg viewBox="0 0 100 100" className="absolute w-full h-full text-[#d97706]">
                    <polygon points="50,0 61,15 78,10 80,28 95,38 85,52 95,68 78,75 75,92 58,85 45,100 32,85 15,92 12,75 -2,68 8,52 -2,38 12,28 14,10 32,15" fill="currentColor" opacity="0.9"/>
                    <circle cx="50" cy="50" r="35" fill="#b45309" />
                  </svg>
                  <div className="relative z-10 text-white text-center leading-tight">
                    <p className="text-xs md:text-sm font-bold uppercase tracking-widest">Official</p>
                    <p className="text-[10px] md:text-xs font-semibold">Certificate</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 tracking-widest">{cert.code}</p>
              </div>

              {/* Signature */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-48 h-16 border-b border-gray-400 relative mb-2 flex items-end justify-center pb-2">
                  {/* Fake Signature using a cursive font */}
                  <span style={{ fontFamily: 'Brush Script MT, cursive' }} className="text-4xl text-gray-800 -rotate-3 absolute bottom-1">
                    ZORVI Academy
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">ZORVI Academy</p>
                <p className="text-xs text-gray-500">Director of Education</p>
              </div>

              {/* Date/Info */}
              <div className="text-right text-sm text-gray-700">
                <p className="font-bold">ZORVI Learning Institute</p>
                <p>Center for Professional Education</p>
                <p>& Skills Development</p>
                <p className="mt-2 text-xs text-gray-500">Verify: zorvi.com/c/{cert.code}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Global CSS to handle printing perfectly */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          aside { display: none !important; }
          .print\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
}
