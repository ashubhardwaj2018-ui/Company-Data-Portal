import { useState } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { Navbar } from "@/components/layout/Navbar";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ChevronLeft, ChevronRight, Building } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [alphabet, setAlphabet] = useState<string | undefined>();

  const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const numbers = "0123456789".split("");

  // Simple debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setAlphabet(undefined); // Clear alphabet filter when searching
      setPage(1); 
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleAlphabetClick = (letter: string) => {
    if (alphabet === letter) {
      setAlphabet(undefined);
    } else {
      setAlphabet(letter);
      setSearch("");
      setDebouncedSearch("");
    }
    setPage(1);
  };

  const { data, isLoading, isError } = useCompanies({
    search: debouncedSearch,
    alphabet,
    page,
    limit: 12,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-primary/5 border-b py-20">
        <div className="container-width text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold text-slate-900 tracking-tight"
          >
            India's Corporate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Directory</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Access detailed information on over 20 lakh registered companies in India.
            Search by name, CIN, or registration number.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto relative group"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-all duration-500 opacity-50" />
            <div className="relative flex items-center bg-background rounded-2xl shadow-xl border border-border/50 overflow-hidden p-2">
              <Search className="h-6 w-6 text-muted-foreground ml-3" />
              <Input 
                className="border-0 shadow-none focus-visible:ring-0 text-lg py-6 bg-transparent"
                placeholder="Search companies by name or CIN..."
                value={search}
                onChange={handleSearch}
              />
              <Button size="lg" className="rounded-xl px-8 hidden sm:flex">
                Search
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mt-8 max-w-4xl mx-auto"
          >
            {[...alphabets, ...numbers].map((char) => (
              <Button
                key={char}
                variant={alphabet === char ? "default" : "outline"}
                size="sm"
                className="w-10 h-10 p-0 rounded-lg text-xs font-bold"
                onClick={() => handleAlphabetClick(char)}
              >
                {char}
              </Button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Results Section */}
      <main className="flex-1 py-12 container-width">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Fetching company records...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-destructive">Unable to load data</h3>
            <p className="text-muted-foreground">Please try again later.</p>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-muted/20">
            <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border">
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No companies found</h3>
            <p className="text-muted-foreground">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-display">
                {debouncedSearch ? "Search Results" : "Recently Registered"}
                <span className="ml-2 text-sm font-sans font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {data?.total.toLocaleString()} records
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data?.data.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4 pt-8 border-t">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} of {Math.ceil((data?.total || 0) / (data?.limit || 1))}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={data?.data.length < (data?.limit || 12)}
                className="gap-2"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="border-t py-12 bg-white">
        <div className="container-width text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} IndiaCorpDB. All rights reserved.</p>
          <p className="mt-2">Data sourced from Ministry of Corporate Affairs (MCA).</p>
        </div>
      </footer>
    </div>
  );
}
