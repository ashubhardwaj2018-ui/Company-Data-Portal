import { LegalPage } from "./LegalPage";

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" subtitle="The rules for using the AddressBay directory.">
      <p className="text-xs text-slate-400">Last updated: August 9, 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using AddressBay, you agree to these Terms of Service. If you do not agree, please do not
          use the site.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p>
          AddressBay provides a searchable directory of company registration information compiled from official
          government sources across multiple countries. The service is provided for informational purposes only.
        </p>
      </section>

      <section>
        <h2>3. Acceptable Use</h2>
        <ul>
          <li>Do not use the site for unlawful purposes or in violation of any applicable law.</li>
          <li>Do not scrape, bulk-download, or resell the data in a way that overloads or disrupts the service.</li>
          <li>Do not attempt to gain unauthorised access to any part of the site or its systems.</li>
          <li>Do not submit false corrections, fraudulent business claims, or misleading content.</li>
        </ul>
      </section>

      <section>
        <h2>4. Accuracy of Information</h2>
        <p>
          Company information is sourced from public registries and is provided "as is". Records may be outdated or
          contain errors introduced at the source. AddressBay does not guarantee the accuracy, completeness, or
          timeliness of any listing. Always verify critical information with the relevant official registry.
        </p>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>
          The site design, branding, and original content are owned by AddressBay. Underlying public-record company
          data remains subject to the terms of the issuing government registries.
        </p>
      </section>

      <section>
        <h2>6. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, AddressBay shall not be liable for any indirect, incidental, or
          consequential damages arising from your use of, or reliance on, the site or its data.
        </p>
      </section>

      <section>
        <h2>7. Changes to the Service and Terms</h2>
        <p>
          We may modify or discontinue features at any time and may update these Terms. Continued use of the site
          after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>Questions about these Terms? Reach us through the Contact Us page.</p>
      </section>
    </LegalPage>
  );
}
