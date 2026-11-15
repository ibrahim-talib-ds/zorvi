"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { ContactSellerModal } from "./ContactSellerModal";

export function ContactSellerButton({ 
  productId, 
  sellerId, 
  sellerName 
}: { 
  productId: string; 
  sellerId: string; 
  sellerName: string; 
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
      >
        <MessageSquare size={16} /> Ask a Question
      </button>
      <ContactSellerModal
        productId={productId}
        sellerId={sellerId}
        sellerName={sellerName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
