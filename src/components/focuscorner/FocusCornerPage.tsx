"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, ShieldCheck, Star } from "lucide-react";
import { Button, Card, Field, Segmented, TextInput } from "@/components/ui/primitives";
import { PageHeading } from "@/components/shell/PageHeading";
import { guestStore, useFavorites } from "@/lib/store";
import { TIPS, TIP_CATEGORIES } from "@/lib/content/tips";
import { useMounted } from "@/hooks/use-mounted";

type CategoryFilter = "All" | "Favorites" | (typeof TIP_CATEGORIES)[number];

export function FocusCornerPage() {
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [query, setQuery] = useState("");
  const favorites = useFavorites();
  const mounted = useMounted();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TIPS.filter((tip) => {
      if (category === "Favorites" && !favorites.includes(tip.id)) return false;
      if (category !== "All" && category !== "Favorites" && tip.category !== category) return false;
      if (q.length === 0) return true;
      return `${tip.title} ${tip.summary} ${tip.body.join(" ")}`.toLowerCase().includes(q);
    });
  }, [category, query, favorites]);

  const categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: "All", label: "All" },
    { value: "Favorites", label: "Favorites" },
    ...TIP_CATEGORIES.map((c) => ({ value: c as CategoryFilter, label: shortLabel(c) })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Focus Corner"
        eyebrow="Field notes"
        subtitle="Practical, no-fluff advice: concentrating deeply, studying what sticks, resting with purpose, and building a routine that survives exam weeks. Curated for students — no AI, no tracking."
      />

      <div className="flex flex-col gap-3">
        <Field label="Search advice" htmlFor="tip-search">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
            <TextInput
              id="tip-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. exam, phone, recall…"
              className="pl-9"
            />
          </div>
        </Field>
        <Segmented ariaLabel="Filter tips by category" value={category} onChange={setCategory} options={categoryOptions} />
      </div>

      {category === "Favorites" && mounted && favorites.length === 0 ? (
        <Card className="p-6 text-sm text-ink-soft">
          No favorites yet — tap the ☆ on any tip to keep it here.
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((tip) => (
          <TipCard key={tip.id} tip={tip} favorite={favorites.includes(tip.id)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-sm text-ink-soft">Nothing matches that search. Try another word or category.</Card>
      ) : null}

      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-palm" aria-hidden />
        <p className="text-xs text-ink-soft">
          <strong className="text-forest">A note on scope:</strong> Focus Corner offers educational suggestions, not medical or psychological
          advice. If focus problems persist or distress you — sleep, mood, constant distraction — please talk to a healthcare professional or your school counsellor.
        </p>
      </Card>
    </div>
  );
}

function shortLabel(category: string): string {
  return category.split(" ")[0].replace("&", "");
}

function TipCard({ tip, favorite }: { tip: (typeof TIPS)[number]; favorite: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-brown">{tip.category}</p>
          <h2 className="font-display mt-2 text-lg font-medium text-forest">{tip.title}</h2>
        </div>
        <button
          aria-label={favorite ? `Remove ${tip.title} from favorites` : `Save ${tip.title} to favorites`}
          aria-pressed={favorite}
          onClick={() => guestStore.toggleFavorite(tip.id)}
          className="rounded-lg p-1.5 text-terracotta hover:bg-terracotta-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm"
        >
          <Star size={18} fill={favorite ? "currentColor" : "none"} aria-hidden />
        </button>
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">{tip.summary}</p>
      <p className="mt-2 text-xs text-ink-soft">{tip.readMinutes} min read</p>
      {open ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-sm text-ink">
          {tip.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}
      <Button variant="ghost" size="sm" className="mt-3 w-fit" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? (
          <>
            <ChevronDown size={14} aria-hidden className="rotate-180" /> Show less
          </>
        ) : (
          <>
            <ChevronDown size={14} aria-hidden /> Read full advice
          </>
        )}
      </Button>
    </Card>
  );
}
