import { usePosts } from "@/hooks/use-content";
import { Navbar } from "@/components/layout/Navbar";
import { BacklinkGrid } from "@/components/layout/BacklinkGrid";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { format } from "date-fns";
import { Loader2, BookOpen } from "lucide-react";

export default function BlogList() {
  const { data: posts, isLoading } = usePosts();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 container-width">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-display">Corporate Insights Blog</h1>
            <p className="text-muted-foreground">Latest updates and news from the Indian corporate world.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-20 border rounded-xl bg-muted/20">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No blog posts published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border-0 shadow-md">
                    {post.coverImage && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                      <CardDescription>
                        {post.createdAt ? format(new Date(post.createdAt), "MMMM dd, yyyy") : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <BacklinkGrid />
    </div>
  );
}
