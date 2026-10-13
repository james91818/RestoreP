import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  labelSingular?: string;
  labelPlural?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** Custom label for "Showing X–Y of Z items". Receives from/to/total. */
  countLabel?: (from: number, to: number, total: number) => string;
}

const TablePagination = ({
  page,
  totalItems,
  pageSize,
  onPageChange,
  labelSingular = "item",
  labelPlural = "items",
  previousLabel = "Previous",
  nextLabel = "Next",
  countLabel,
}: Props) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Build a sliding window of page numbers (max ~7 buttons)
  const pages: (number | "...")[] = [];
  const window = 1;
  pages.push(1);
  if (page - window > 2) pages.push("...");
  for (let p = Math.max(2, page - window); p <= Math.min(totalPages - 1, page + window); p++) pages.push(p);
  if (page + window < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  const defaultCount = `Showing ${from}–${to} of ${totalItems} ${totalItems === 1 ? labelSingular : labelPlural}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 px-3 pb-3">
      <span className="text-sm text-muted-foreground">
        {countLabel ? countLabel(from, to, totalItems) : defaultCount}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
          {previousLabel}
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="px-1.5 text-muted-foreground text-sm">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-[36px]"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
