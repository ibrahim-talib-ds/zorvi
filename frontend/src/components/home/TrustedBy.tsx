export function TrustedBy() {
  return (
    <div className="py-12 border-t border-bg-border/50">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-text-muted mb-8">
        Powering the next generation of software
      </p>
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
        {/* Fake but realistic logos using text for now */}
        <span className="font-display font-bold text-xl">Flutter</span>
        <span className="font-display font-bold text-xl">FastAPI</span>
        <span className="font-display font-bold text-xl">PostgreSQL</span>
        <span className="font-display font-bold text-xl">Docker</span>
        <span className="font-display font-bold text-xl">Stripe</span>
      </div>
    </div>
  );
}
