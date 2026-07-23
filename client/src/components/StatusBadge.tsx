const COLOR_MAP: Record<string, string> = {
  // Customer status
  LEAD: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  // Challan status
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
  // Stock movement
  IN: "bg-green-100 text-green-800",
  OUT: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const classes = COLOR_MAP[status] ?? "bg-gray-100 text-gray-700";
  return <span className={`badge ${classes}`}>{status}</span>;
}
