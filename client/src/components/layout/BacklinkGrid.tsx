import { ExternalLink } from "lucide-react";

const SERVICES = [
  {
    title: "Company Registration",
    desc: "Register your Private Ltd, LLP or OPC quickly",
    icon: "🏢",
    color: "from-blue-500 to-blue-700",
    href: "https://startupcaservices.com/company-registration",
  },
  {
    title: "GST Registration",
    desc: "Get GSTIN in 3 days with expert CA assistance",
    icon: "📋",
    color: "from-orange-500 to-orange-700",
    href: "https://startupcaservices.com/gst-registration",
  },
  {
    title: "Income Tax Filing",
    desc: "File ITR on time, hassle-free with our CAs",
    icon: "📊",
    color: "from-green-500 to-green-700",
    href: "https://startupcaservices.com/income-tax",
  },
  {
    title: "ROC Compliance",
    desc: "Annual filing, MCA forms & company compliance",
    icon: "⚖️",
    color: "from-purple-500 to-purple-700",
    href: "https://startupcaservices.com/roc-compliance",
  },
  {
    title: "Trademark Registration",
    desc: "Protect your brand name & logo across India",
    icon: "™️",
    color: "from-pink-500 to-pink-700",
    href: "https://startupcaservices.com/trademark",
  },
  {
    title: "FSSAI License",
    desc: "Food business licensing & compliance services",
    icon: "🍽️",
    color: "from-yellow-500 to-yellow-700",
    href: "https://startupcaservices.com/fssai",
  },
  {
    title: "MSME / Udyam",
    desc: "Register as MSME and unlock government benefits",
    icon: "🏭",
    color: "from-teal-500 to-teal-700",
    href: "https://startupcaservices.com/msme-registration",
  },
  {
    title: "Accounting Services",
    desc: "Bookkeeping, payroll & virtual CFO services",
    icon: "💼",
    color: "from-indigo-500 to-indigo-700",
    href: "https://startupcaservices.com/accounting",
  },
];

export function BacklinkGrid() {
  return (
    <section className="py-10 bg-gradient-to-br from-slate-50 to-blue-50 border-t">
      <div className="container-width">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Powered by</p>
          <a
            href="https://startupcaservices.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 group"
          >
            <h3 className="text-2xl font-bold font-display text-slate-900 group-hover:text-primary transition-colors">
              StartupCA <span className="text-primary">Services</span>
            </h3>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
          <p className="text-muted-foreground text-sm mt-2">
            India's trusted CA firm for startup & business compliance — visit{" "}
            <a
              href="https://startupcaservices.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              startupcaservices.com
            </a>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {SERVICES.map((s) => (
            <a
              key={s.title}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 p-4">
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${s.color} opacity-5 rounded-full translate-x-6 -translate-y-6`} />
                <div className="text-3xl mb-2">{s.icon}</div>
                <h4 className="font-semibold text-sm text-slate-900 group-hover:text-primary transition-colors leading-tight mb-1">
                  {s.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-tight">{s.desc}</p>
                <div className={`mt-3 h-0.5 w-0 group-hover:w-full bg-gradient-to-r ${s.color} rounded transition-all duration-300`} />
              </div>
            </a>
          ))}
        </div>

        <div className="text-center mt-6">
          <a
            href="https://startupcaservices.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            View All Services at startupcaservices.com
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
