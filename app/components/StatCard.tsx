import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  /** When set, the card navigates to this path (full app path, e.g. /icd-operations/manifests). */
  href?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  href,
}: StatCardProps) {
  const card = (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-6 shadow-sm transition-shadow ${
        href
          ? "hover:shadow-md hover:border-blue-200 cursor-pointer"
          : "hover:shadow-md"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-2">{description}</p>
          )}
        </div>
        <div className="ml-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {card}
      </Link>
    );
  }

  return card;
}
