import React from 'react';
import { HLSVideo } from '../common/HLSVideo';

interface LegalPageViewProps {
  kind: 'privacy' | 'terms';
}

const UPDATED = '15 August 2026';

export const LegalPageView: React.FC<LegalPageViewProps> = ({ kind }) => {
  const isPrivacy = kind === 'privacy';

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-x-hidden">
      <HLSVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4" />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-0 pointer-events-none" />

      <main className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 pt-28 pb-16">
        <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 sm:p-10 space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/50">Vamvamvam AI</p>
            <h1 className="text-2xl sm:text-4xl font-semibold mt-1">
              {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
            </h1>
            <p className="text-xs text-white/55 mt-2">Last updated {UPDATED}</p>
          </div>

          {isPrivacy ? (
            <div className="space-y-5 text-sm text-white/80 leading-relaxed">
              <p>
                This policy explains how Vamvamvam AI (“we”, “us”) collects, uses, and stores information when you use our website, dashboard, and hired AI tools.
              </p>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Information we collect</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Account details you provide at sign-in (name, email, profile photo from your login provider).</li>
                  <li>Brand Brain content, hired AI settings, documents, and chat messages you save.</li>
                  <li>Social account connection data: public profile identifiers, handles, and access tokens needed to post or read on your behalf.</li>
                  <li>Usage logs such as agent runs, connection status, and error reports needed to operate the service.</li>
                </ul>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">How we use it</h2>
                <p>
                  We use this information only to run your workspace: authenticate you, remember brand context, generate content, connect social platforms you choose, and improve reliability. We do not sell your personal data.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Social logins and posting</h2>
                <p>
                  When you connect Facebook, Threads, LinkedIn, X, or another network, we request only the permissions needed to identify your account and perform the actions you enable (for example publishing). Tokens are stored encrypted. You can disconnect a network at any time from Social Accounts; that stops new API calls with that token.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">AI memory</h2>
                <p>
                  Chats and Brand Brain entries may be stored so your hired AI can answer from your brand. Website lookups you request may be saved as brand memory. You can delete chats, brands, and documents from the dashboard.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Sharing</h2>
                <p>
                  We share data with processors that host the product (for example database, authentication, and model providers) under contract. We share with a social platform only when you connect that platform. We disclose information if required by law.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Retention and security</h2>
                <p>
                  We keep account and brand data while your account is active, then delete or anonymize it when you close the account or after a reasonable backup period. We use encryption in transit and encrypted storage for social tokens.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Your choices</h2>
                <p>
                  You may access, correct, or delete workspace data from the dashboard, disconnect social accounts, or email us to request account deletion. Depending on your location you may have additional rights under GDPR, CCPA, or similar laws.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Contact</h2>
                <p>
                  Questions about this policy: use the contact details on the Vamvamvam AI site or your account email channel.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-5 text-sm text-white/80 leading-relaxed">
              <p>
                These terms govern your use of Vamvamvam AI, including the dashboard, hired AI, Brand Brain, and social connections. By creating an account or using the product you agree to them.
              </p>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">The service</h2>
                <p>
                  Vamvamvam AI helps you manage brand knowledge and social publishing with an AI manager you hire. Features may change. Some networks (including Instagram, YouTube, and TikTok) may be listed in our systems but not offered to users until we enable them.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Your account</h2>
                <p>
                  You must provide accurate sign-in details and keep credentials confidential. You are responsible for activity under your account and for content you ask the AI to publish.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Acceptable use</h2>
                <p>
                  Do not use the service to spam, impersonate others, violate platform rules, post unlawful content, attempt to break into systems, or process data you do not have the right to use. You must follow Facebook, Threads, LinkedIn, X, and other network policies when you connect them.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">AI output</h2>
                <p>
                  Generated posts and chat replies can be wrong or incomplete. You remain responsible for reviewing and approving content before it goes live, except where you explicitly enable autonomous posting.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Intellectual property</h2>
                <p>
                  We own the product, branding, and software. You own your brand materials and content you upload. You grant us a limited licence to process that content solely to provide the service.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Availability and liability</h2>
                <p>
                  The service is provided “as is”. Social networks, tunnels, and model providers can fail. To the fullest extent allowed by law we are not liable for lost profits, lost data, or indirect damages, and our total liability is limited to fees you paid us in the three months before the claim (or zero if the product is used free of charge).
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Termination</h2>
                <p>
                  You may stop using the product and disconnect accounts at any time. We may suspend access if you breach these terms or create risk for other users or connected platforms.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Changes</h2>
                <p>
                  We may update these terms. Continued use after an update means you accept the revised terms. The date at the top shows the latest version.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
