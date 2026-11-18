"use client";

import { useEffect } from "react";
import Script from "next/script";

export function GoogleTranslate() {
  useEffect(() => {
    // This function is called by the Google script
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };
  }, []);

  return (
    <>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
      <div id="google_translate_element" style={{ display: "none" }}></div>
    </>
  );
}
