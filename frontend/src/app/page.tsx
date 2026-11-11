import { HeroSection } from "@/components/home/HeroSection";
import { TheExperienceSection } from "@/components/home/TheExperienceSection";
import { WebSection } from "@/components/home/WebSection";
import { MobileSection } from "@/components/home/MobileSection";
import { BackendSection } from "@/components/home/BackendSection";
import { JourneySection } from "@/components/home/JourneySection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { TechEcosystemSection } from "@/components/home/TechEcosystemSection";
import { OutcomesSection } from "@/components/home/OutcomesSection";
import { DifferenceSection } from "@/components/home/DifferenceSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="flex flex-col bg-[#0B0F1D]">
      <HeroSection />
      <TheExperienceSection />
      <WebSection />
      <MobileSection />
      <BackendSection />
      <JourneySection />
      <ProjectsSection />
      <TechEcosystemSection />
      <OutcomesSection />
      <DifferenceSection />
      <FinalCTASection />
    </div>
  );
}
