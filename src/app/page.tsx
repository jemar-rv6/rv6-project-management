import { Dashboard } from "@/components/dashboard";
import { getPortfolioSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getPortfolioSnapshot();
  return <Dashboard snapshot={snapshot} />;
}
