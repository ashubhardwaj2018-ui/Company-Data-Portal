import { usePost } from "@/hooks/use-content";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareBar } from "@/components/layout/ShareBar";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = usePost(slug || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <Link href="/blog">
            <Button variant="outline">Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 container-width">
        <article className="max-w-3xl mx-auto space-y-8">
          <Link href="/blog">
            <Button variant="ghost" className="gap-2 -ml-4">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Button>
          </Link>

          {post.coverImage && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xl">
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-slate-900">
              {post.title}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
              <div className="text-muted-foreground flex items-center gap-4">
                {post.createdAt && <span>{format(new Date(post.createdAt), "MMMM dd, yyyy")}</span>}
              </div>
              <ShareBar
                title={`${post.title} | IndiaCorpDB Blog`}
                description={post.excerpt || post.title}
              />
            </div>
          </div>

          <div className="prose prose-slate max-w-none prose-lg">
            {post.content.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>
      </main>
      <BacklinkGrid />
    </div>
  );
}
