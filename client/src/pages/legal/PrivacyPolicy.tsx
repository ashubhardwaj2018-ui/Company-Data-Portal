import { LegalPage } from "./LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" subtitle="How AddressBay collects, uses, and protects information.">
      <p className="text-xs text-slate-400">Last updated: August 9, 2026</p>

      <section>
        <h2>1. Introduction</h2>
        <p>
          AddressBay ("we", "our", "us") is a global business directory that publishes company registration
          information sourced from official government registries. This Privacy Policy explains what information
          we collect from visitors, how we use it, and the choices you have.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <ul>
          <li><strong>Company data:</strong> the company profiles on this site come from public, official government registration sources (such as corporate registries). This is public-record business information, not personal data collected from you.</li>
          <li><strong>Usage data:</strong> basic technical information such as pages visited, approximate location, browser type, and device type, used to operate and improve the site.</li>
          <li><strong>Information you provide:</strong> details you submit voluntarily, for example when contacting us, suggesting a correction, or claiming a business listing.</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <ul>
          <li>To operate, maintain, and improve the directory.</li>
          <li>To respond to enquiries, correction requests, and business claims.</li>
          <li>To monitor site performance and prevent abuse.</li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies</h2>
        <p>
          We use essential cookies required for the site to function (for example, session cookies). We do not sell
          personal information to third parties.
        </p>
      </section>

      <section>
        <h2>5. Data From Public Registries</h2>
        <p>
          Company details (names, registration numbers, registered addresses, directors' publicly filed details where
          applicable) are published by government registries as public records. If you believe information on this
          site is inaccurate or should be updated, please use the "Suggest Correction" option on the relevant company
          page or contact us.
        </p>
      </section>

      <section>
        <h2>6. Data Security &amp; Retention</h2>
        <p>
          We take reasonable technical and organisational measures to protect the information we hold. Usage data is
          retained only as long as needed for the purposes described above.
        </p>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, or request deletion of personal
          information we hold about you. To exercise these rights, contact us via the Contact Us page.
        </p>
      </section>

      <section>
        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
          "Last updated" date.
        </p>
      </section>
    </LegalPage>
  );
}
