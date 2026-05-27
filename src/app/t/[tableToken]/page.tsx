import { CustomerOrdering } from "@/components/customer-ordering";

export default async function TableOrderPage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;

  return <CustomerOrdering tableToken={tableToken} />;
}
