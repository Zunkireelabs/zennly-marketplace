import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import { SiteNav } from "@/components/layout/site-nav";
import { SearchExperience } from "@/components/search/search-experience";
import { searchStudios } from "@/lib/search";

export const metadata: Metadata = {
  title: "Search studios | Zennly",
  description: "Find wellness and beauty studios near you, on a list or a map.",
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Depends on the query string, so it renders per request.
export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const query = {
    where: one(sp.where).slice(0, 80),
    what: one(sp.what).slice(0, 80),
    date: one(sp.date).slice(0, 10),
    time: one(sp.time).slice(0, 20),
  };
  const view = one(sp.view) === "map" ? "map" : "list";
  const results = await searchStudios(query);

  return (
    <div className="relative flex h-dvh flex-col bg-background">
      <SiteNav />
      <SearchExperience results={results} query={query} initialView={view} />
    </div>
  );
}
