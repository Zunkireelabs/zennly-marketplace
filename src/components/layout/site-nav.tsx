import { Nav } from "@/components/layout/nav";
import { getHomeRails } from "@/lib/home-rails";

/** The nav with the shared search bar, for inner pages. Loads the search data so pages don't have to. */
export async function SiteNav({ variant = "solid" }: { variant?: "overlay" | "solid" }) {
  const { destinations, searchIndex } = await getHomeRails();
  return <Nav variant={variant} search={{ destinations, searchIndex }} />;
}
