import { LegalPage } from "./LegalPage";
import { Mail, MessageSquare, ShieldAlert, Building2 } from "lucide-react";
import { Link } from "wouter";

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: "General Enquiries",
    body: "Questions about AddressBay, partnerships, or media.",
    action: <a href="mailto:contact@addressbay.com" className="font-medium text-primary hover:underline" data-testid="link-contact-email">contact@addressbay.com</a>,
  },
  {
    icon: MessageSquare,
    title: "Data Corrections",
    body: "Spotted something wrong in a company profile? Use the Suggest Correction button on that company's page — it goes straight to our review queue.",
    action: <Link href="/" className="font-medium text-primary hover:underline">Find the company →</Link>,
  },
  {
    icon: Building2,
    title: "Claim Your Business",
    body: "Own or represent a listed company? Claim the profile from the company page to manage how it appears.",
    action: <Link href="/" className="font-medium text-primary hover:underline">Search your company →</Link>,
  },
  {
    icon: ShieldAlert,
    title: "Privacy & Legal",
    body: "Requests relating to personal data, privacy, or legal notices.",
    action: <a href="mailto:legal@addressbay.com" className="font-medium text-primary hover:underline" data-testid="link-legal-email">legal@addressbay.com</a>,
  },
];

export default function ContactUs() {
  return (
    <LegalPage title="Contact Us" subtitle="We're happy to help with questions, corrections, and business claims.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {CONTACT_CARDS.map(card => (
          <div key={card.title} className="ab-card p-5 space-y-2" data-testid={`card-contact-${card.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <card.icon className="h-4.5 w-4.5" />
              </span>
              <h2 className="!mb-0">{card.title}</h2>
            </div>
            <p>{card.body}</p>
            {card.action}
          </div>
        ))}
      </div>

      <section>
        <h2>Response Times</h2>
        <p>
          We aim to respond to all enquiries within 2–3 business days. Data correction reports are typically
          reviewed within a week.
        </p>
      </section>
    </LegalPage>
  );
}
