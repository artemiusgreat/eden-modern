'use client';

import Script from 'next/script';

// GTM container carried over from the legacy WordPress site.
// Override per-environment with NEXT_PUBLIC_GTM_ID (baked at build time).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-PS65QF25';

/**
 * Google Tag Manager loader. GA4 itself stays configured inside the GTM
 * container (Configuration + Event tags), exactly as on the old WordPress
 * site — this snippet only loads the container and provides the dataLayer
 * that lib/analytics.ts pushes ecommerce events to.
 */
export default function Analytics() {
  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="gtm"
        />
      </noscript>
      <Script
        id="gtm-loader"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />
    </>
  );
}
