import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check, Twitter, Linkedin, Facebook, MessageCircle } from "lucide-react";

interface ShareBarProps {
  title: string;
  description?: string;
  url?: string;
}

export function ShareBar({ title, description = "", url }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const pageUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || title);

  const platforms = [
    {
      name: "Twitter / X",
      icon: <Twitter className="h-4 w-4" />,
      color: "hover:bg-black hover:text-white hover:border-black",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      color: "hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5]",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      color: "hover:bg-[#1877f2] hover:text-white hover:border-[#1877f2]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      color: "hover:bg-[#25d366] hover:text-white hover:border-[#25d366]",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = pageUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="share-bar">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mr-1">Share:</span>

      {platforms.map((p) => (
        <a
          key={p.name}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Share on ${p.name}`}
          data-testid={`share-${p.name.toLowerCase().replace(/\s.*/, "")}`}
        >
          <Button
            variant="outline"
            size="sm"
            className={`h-8 w-8 p-0 rounded-full border transition-all duration-200 ${p.color}`}
          >
            {p.icon}
          </Button>
        </a>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        title="Copy link"
        data-testid="share-copy"
        className={`h-8 px-3 rounded-full gap-1.5 text-xs font-medium transition-all duration-200 ${
          copied
            ? "bg-green-50 text-green-700 border-green-300"
            : "hover:bg-slate-100"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copied!
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" /> Copy link
          </>
        )}
      </Button>
    </div>
  );
}
