import { useState, useEffect, useRef, DragEvent } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const GENRES = ["Romance", "Darkromance", "Romantasy", "Fantasy", "Roman"] as const;
type Genre = (typeof GENRES)[number];

interface Book {
  id: string;
  title: string;
  author: string;
  genre: Genre;
  color: string;
  height: number;
  width: number;
  isPlaceholder?: boolean;
}

const BOOK_COLORS: Record<Genre, string[]> = {
  Romance: ["#e8557a", "#d4426a", "#f0829e", "#c93058", "#e06b8a", "#d94070"],
  Darkromance: ["#1a1a2e", "#0f3d3e", "#1b2a4a", "#162020", "#0d1b2a", "#1a3333"],
  Romantasy: ["#5c2045", "#7a2850", "#6b2040", "#8a3060", "#4e1a3a", "#6e2848"],
  Fantasy: ["#e8a838", "#4ec8c8", "#e85890", "#58c858", "#a86ef0", "#e8c840"],
  Roman: ["#c8b898", "#a8c0b8", "#d4c0a0", "#b8c8d8", "#c8b0a0", "#a8b8a0"],
};

// Desaturated versions for placeholder books
const PLACEHOLDER_COLORS: Record<Genre, string[]> = {
  Romance: ["#c4a0ab", "#bfa0a8", "#d4b8c0"],
  Darkromance: ["#3a3a4a", "#384848", "#3a4050"],
  Romantasy: ["#6a4860", "#705060", "#6e4858"],
  Fantasy: ["#c8c0a8", "#a8c0c0", "#c0b0b8"],
  Roman: ["#d8d0c8", "#c8d0c8", "#dcd4c8"],
};

function desaturatedColor(genre: Genre): string {
  const colors = PLACEHOLDER_COLORS[genre];
  return colors[Math.floor(Math.random() * colors.length)];
}

function createPlaceholder(genre: Genre): Book {
  return {
    id: crypto.randomUUID(),
    title: "",
    author: "",
    genre,
    color: desaturatedColor(genre),
    height: 140 + Math.floor(Math.random() * 40),
    width: 32 + Math.floor(Math.random() * 18),
    isPlaceholder: true,
  };
}

const Bookshelf = () => {
  const [books, setBooks] = useState<Book[]>(() => {
    try { const s = localStorage.getItem("books"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [genreInput, setGenreInput] = useState<Genre>("Roman");
  const [activeGenre, setActiveGenre] = useState<Genre | "Alle">("Alle");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editGenre, setEditGenre] = useState<Genre>("Roman");
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const BOOKS_PER_LEVEL = 16;

  useEffect(() => { localStorage.setItem("books", JSON.stringify(books)); }, [books]);

  const realBookCount = books.filter((b) => !b.isPlaceholder).length;

  const addBook = () => {
    const title = titleInput.trim();
    const author = authorInput.trim();
    if (!title || !author) return;

    const colors = BOOK_COLORS[genreInput];
    const book: Book = {
      id: crypto.randomUUID(),
      title,
      author,
      genre: genreInput,
      color: colors[Math.floor(Math.random() * colors.length)],
      height: 140 + Math.floor(Math.random() * 40),
      width: 32 + Math.floor(Math.random() * 18),
    };

    setBooks((prev) => {
      const next = [...prev, book];
      const newRealCount = next.filter((b) => !b.isPlaceholder).length;
      // Add placeholder after every 2nd real book
      if (newRealCount >= 2 && newRealCount % 2 === 0) {
        next.push(createPlaceholder(genreInput));
      }
      return next;
    });
    setTitleInput("");
    setAuthorInput("");
  };

  const removeBook = (id: string) =>
    setBooks((prev) => prev.filter((b) => b.id !== id));

  const saveEdit = (id: string) => {
    const t = editTitle.trim();
    const a = editAuthor.trim();
    if (!t || !a) return;
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const colors = BOOK_COLORS[editGenre];
        return {
          ...b,
          title: t,
          author: a,
          genre: editGenre,
          isPlaceholder: false,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      })
    );
    setEditingId(null);
  };

  const handleDragStart = (id: string) => {
    dragItem.current = id;
  };
  const handleDragEnter = (id: string) => {
    dragOverItem.current = id;
  };
  const handleDragEnd = () => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    setBooks((prev) => {
      const newBooks = [...prev];
      const fromIdx = newBooks.findIndex((b) => b.id === dragItem.current);
      const toIdx = newBooks.findIndex((b) => b.id === dragOverItem.current);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = newBooks.splice(fromIdx, 1);
      newBooks.splice(toIdx, 0, moved);
      return newBooks;
    });
    dragItem.current = null;
    dragOverItem.current = null;
  };
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const filteredBooks = activeGenre === "Alle" ? books : books.filter((b) => !b.isPlaceholder && b.genre === activeGenre);
  const totalLevels = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_LEVEL));
  const safeCurrent = Math.min(currentLevel, totalLevels - 1);
  const levelBooks = filteredBooks.slice(safeCurrent * BOOKS_PER_LEVEL, (safeCurrent + 1) * BOOKS_PER_LEVEL);

  const realFilteredCount = filteredBooks.filter((b) => !b.isPlaceholder).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 flex flex-col shadow-sm">
      {/* Input form + level switcher */}
      <div className="flex gap-2 mb-4 items-start">
        <form
          onSubmit={(e) => { e.preventDefault(); addBook(); }}
          className="flex flex-wrap gap-2 flex-1"
        >
          <Input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Buchtitel…" className="flex-1 min-w-[140px] h-10 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground/40" maxLength={100} />
          <Input value={authorInput} onChange={(e) => setAuthorInput(e.target.value)} placeholder="Autor…" className="flex-1 min-w-[120px] h-10 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground/40" maxLength={100} />
          <Select value={genreInput} onValueChange={(v) => setGenreInput(v as Genre)}>
            <SelectTrigger className="w-[140px] h-10 bg-background/60 border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0"><Plus className="h-4 w-4" /></Button>
        </form>
        {totalLevels > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentLevel((p) => Math.max(0, p - 1))} disabled={safeCurrent === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{safeCurrent + 1}/{totalLevels}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentLevel((p) => Math.min(totalLevels - 1, p + 1))} disabled={safeCurrent === totalLevels - 1}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Genre filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["Alle", ...GENRES] as const).map((g) => (
          <button key={g} onClick={() => { setActiveGenre(g); setCurrentLevel(0); }} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors border", activeGenre === g ? "bg-[#563315] text-white border-[#563315]" : "bg-background/60 text-muted-foreground border-border/50 hover:bg-accent/40")}>{g}</button>
        ))}
      </div>

      {/* Bookshelf */}
      {levelBooks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Keine Bücher {activeGenre !== "Alle" ? `in "${activeGenre}"` : "im Regal"}</p>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: Math.ceil(levelBooks.length / 8) }).map((_, shelfIdx) => {
            const shelfBooks = levelBooks.slice(shelfIdx * 8, (shelfIdx + 1) * 8);
            return (
              <div key={shelfIdx} className="flex flex-col">
                <div className="flex items-end gap-1 px-3 min-h-[180px]" onDragOver={handleDragOver}>
                  {shelfBooks.map((book) => (
                    <Popover
                      key={book.id}
                      open={editingId === book.id}
                      onOpenChange={(open) => {
                        if (open && book.isPlaceholder) {
                          setEditingId(book.id);
                          setEditTitle("");
                          setEditAuthor("");
                          setEditGenre(book.genre);
                        } else if (!open) {
                          setEditingId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div
                          draggable={!book.isPlaceholder}
                          onDragStart={() => !book.isPlaceholder && handleDragStart(book.id)}
                          onDragEnter={() => handleDragEnter(book.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group relative flex flex-col justify-end",
                            book.isPlaceholder ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                          )}
                          style={{ height: book.height, width: book.width }}
                        >
                          {!book.isPlaceholder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeBook(book.id); }}
                              className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5"
                              style={{ backgroundColor: "#db904f", color: "white" }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          {book.isPlaceholder && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Pencil className="h-4 w-4 text-white/80" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "w-full h-full rounded-sm flex flex-col items-center justify-center px-0.5 shadow-md transition-transform",
                              book.isPlaceholder
                                ? "hover:translate-y-[-2px] border border-dashed border-white/20"
                                : "hover:translate-y-[-4px]"
                            )}
                            style={{
                              backgroundColor: book.color,
                              boxShadow: book.isPlaceholder
                                ? "inset -2px 0 4px rgba(0,0,0,0.15), 1px 1px 3px rgba(0,0,0,0.1)"
                                : "inset -3px 0 6px rgba(0,0,0,0.25), 2px 2px 4px rgba(0,0,0,0.2)",
                              opacity: book.isPlaceholder ? 0.6 : 1,
                            }}
                          >
                            {!book.isPlaceholder && (
                              <>
                                <span className="text-white font-semibold leading-tight text-center" style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: Math.min(11, book.width * 0.3) + "px", maxHeight: book.height - 30, overflow: "hidden" }}>{book.title}</span>
                                <span className="text-white/70 leading-tight text-center mt-1" style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: Math.min(8, book.width * 0.22) + "px", maxHeight: 30, overflow: "hidden" }}>{book.author}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </PopoverTrigger>
                      {book.isPlaceholder && (
                        <PopoverContent className="w-56 p-3" side="top">
                          <form onSubmit={(e) => { e.preventDefault(); saveEdit(book.id); }} className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground">Buch bearbeiten</p>
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titel…" className="h-8 text-sm" maxLength={100} autoFocus />
                            <Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} placeholder="Autor…" className="h-8 text-sm" maxLength={100} />
                            <Select value={editGenre} onValueChange={(v) => setEditGenre(v as Genre)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="submit" size="sm" className="h-7 text-xs">Speichern</Button>
                          </form>
                        </PopoverContent>
                      )}
                    </Popover>
                  ))}
                </div>
                <div className="w-full h-3 rounded-sm mt-0.5" style={{ background: "linear-gradient(180deg, #8B6914 0%, #6b4f10 50%, #563315 100%)", boxShadow: "0 3px 6px rgba(0,0,0,0.3)" }} />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/40">
        {realFilteredCount} {realFilteredCount === 1 ? "Buch" : "Bücher"}{" "}
        {activeGenre !== "Alle" ? `in "${activeGenre}"` : "im Regal"}
        {activeGenre !== "Alle" && ` · ${realBookCount} gesamt`}
      </p>
    </div>
  );
};

export default Bookshelf;
