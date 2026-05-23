import { useArticles } from "@/hooks/use-content";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { ServiceAside } from "@/components/layout/ServiceAside";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import { BookOpen, ArrowRight, Clock } from "lucide-react";
import type { Article } from "@shared/schema";

function readingTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function ArticleList() {
  const { data: articles = [], isLoading } = useArticles();
  const published = articles.filter((a: Article) => a.published);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-16">
        <div className="container-width text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <BookOpen className="h-4 w-4 text-blue-300" /> Knowledge Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight mb-3">
            Articles & Insights
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            In-depth articles on Indian business law, compliance, company registration, and startup ecosystem.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-width py-12">
        <div className="flex gap-8">
          <ServiceAside side="left" />

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden border-0 shadow-md">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : published.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No articles yet</h3>
                <p className="text-sm">Check back soon — we're writing great content for you.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {published.map((article: Article) => (
                  <Link key={article.id} href={`/articles/${article.slug}`}>
                    <Card
                      data-testid={`card-article-${article.id}`}
                      className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group h-full"
                    >
                      {article.coverImage ? (
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/40" />
                        </div>
                      )}
                      <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          {article.category && (
                            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-100">
                              {article.category}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Clock className="h-3 w-3" />
                            {readingTime(article.content)} min read
                          </span>
                        </div>
                        <h2 className="font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t">
                          {article.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(article.createdAt), "MMM dd, yyyy")}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all">
                            Read <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <ServiceAside side="right" />
        </div>
      </div>

      <BacklinkGrid />
    </div>
  );
}
