/**
 * Phase 23 — Share & Print bar for company profiles
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Printer, CheckCircle2, Twitter, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  companyName: string;
  url: string;
}

export function SharePrintBar({ companyName, url }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: companyName, url });
        return;
      } catch {}
    }
    copy();
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${companyName} on AddressBay`)}&url=${encodeURIComponent(url)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copy}>
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy Link"}
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={share}>
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Twitter className="h-3.5 w-3.5 text-sky-500" /> Tweet
        </Button>
      </a>
      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn
        </Button>
      </a>
    </div>
  );
}
