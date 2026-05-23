import { useArticle } from "@/hooks/use-content";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { ServiceAside } from "@/components/layout/ServiceAside";
import { ShareBar } from "@/components/layout/ShareBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, BookOpen, Clock, Tag } from "lucide-react";

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticle(slug || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-width py-12 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-5 w-1/3 mb-8" />
          <Skeleton className="h-64 w-full mb-6" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full mb-3" />)}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <BookOpen className="h-16 w-16 opacity-20" />
          <h1 className="text-2xl font-bold">Article not found</h1>
          <Link href="/articles">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Articles</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-12">
        <div className="container-width max-w-5xl">
          <Link href="/articles">
            <Button variant="ghost" className="text-white/60 hover:text-white mb-6 pl-0 hover:bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" /> All Articles
            </Button>
          </Link>
          {article.category && (
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 mb-3">{article.category}</Badge>
          )}
          <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight leading-tight mb-4">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-white/60 text-sm">
              {article.createdAt && <span>{format(new Date(article.createdAt), "MMMM dd, yyyy")}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {readingTime(article.content)} min read
              </span>
            </div>
            <ShareBar
              title={`${article.title} | IndiaCorpDB Articles`}
              description={article.excerpt || article.title}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container-width py-10">
        <div className="flex gap-8">
          <ServiceAside side="left" />

          <article className="flex-1 min-w-0 max-w-3xl mx-auto">
            {article.coverImage && (
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-64 object-cover rounded-2xl mb-8 shadow-lg"
              />
            )}

            <div className="prose prose-slate prose-lg max-w-none">
              {article.content.split("\n").map((para, i) =>
                para.trim() ? <p key={i}>{para}</p> : <br key={i} />
              )}
            </div>

            {article.metaKeywords && (
              <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                {article.metaKeywords.split(",").map(kw => (
                  <Badge key={kw.trim()} variant="secondary" className="text-xs">{kw.trim()}</Badge>
                ))}
              </div>
            )}

            <div className="mt-8 pt-6 border-t flex items-center justify-between">
              <Link href="/articles">
                <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> All Articles</Button>
              </Link>
              <ShareBar
                title={`${article.title} | IndiaCorpDB Articles`}
                description={article.excerpt || article.title}
              />
            </div>
          </article>

          <ServiceAside side="right" />
        </div>
      </div>

      <BacklinkGrid />
    </div>
  );
}
