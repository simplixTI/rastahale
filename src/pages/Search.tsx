import { useState, useMemo } from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import VideoCard from "@/components/VideoCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVideos } from "@/hooks/useVideos";
import { getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";

const categories = ["all", "jiu-jitsu", "luta-livre"] as const;
const levels = ["all", "Iniciante", "Intermediário", "Avançado"] as const;

const Search = () => {
  const { user } = useAuth();
  const { data: videos = [], isLoading } = useVideos(user?.id ?? "");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      const matchesQuery = !query || v.title.toLowerCase().includes(query.toLowerCase());
      const matchesCat = category === "all" || v.category === category;
      const matchesLvl = level === "all" || v.level === level;
      return matchesQuery && matchesCat && matchesLvl;
    });
  }, [videos, query, category, level]);

  return (
    <MobileLayout>
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-foreground">Explorar</h1>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar aulas, técnicas..."
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "rounded-lg border border-border p-2.5 transition-colors",
              showFilters ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-card p-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {c === "all" ? "Todas" : getCategoryLabel(c)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nível</p>
              <div className="flex flex-wrap gap-1.5">
                {levels.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      level === l ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {l === "all" ? "Todos" : l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 px-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} size="sm" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
        </div>
      )}
    </MobileLayout>
  );
};

export default Search;
