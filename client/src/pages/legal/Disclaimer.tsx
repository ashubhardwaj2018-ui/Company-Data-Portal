import { LegalPage } from "./LegalPage";

export default function Disclaimer() {
  return (
    <LegalPage title="Disclaimer" subtitle="Important information about the data published on AddressBay.">
      <p className="text-xs text-slate-400">Last updated: August 9, 2026</p>

      <section>
        <h2>1. Informational Purposes Only</h2>
        <p>
          The content on AddressBay is provided for general informational purposes only. It does not constitute
          legal, financial, tax, or professional advice of any kind.
        </p>
      </section>

      <section>
        <h2>2. Source of Data</h2>
        <p>
          Company profiles are compiled from official government registration sources (for example, corporate
          registries in India, the United Kingdom, Australia, Singapore, and the United States). While we aim to
          reflect these records faithfully, registries update their data continuously and records shown here may
          lag behind the official source.
        </p>
      </section>

      <section>
        <h2>3. No Endorsement or Affiliation</h2>
        <p>
          Inclusion of a company in this directory does not imply any endorsement, verification, affiliation, or
          business relationship between that company and AddressBay, unless explicitly stated.
        </p>
      </section>

      <section>
        <h2>4. No Warranty</h2>
        <p>
          All information is provided "as is" without warranty of any kind, express or implied, including but not
          limited to accuracy, completeness, merchantability, or fitness for a particular purpose.
        </p>
      </section>

      <section>
        <h2>5. Verify With Official Sources</h2>
        <p>
          Before making business, legal, or financial decisions based on any listing, verify the details directly
          with the relevant official registry or authority.
        </p>
      </section>

      <section>
        <h2>6. Corrections</h2>
        <p>
          If you find information you believe is incorrect, please use the "Suggest Correction" option on the
          company page or contact us — we review all reports.
        </p>
      </section>
    </LegalPage>
  );
}
