import { Button } from "@/components/ui/button";
import { Columns3, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@/hooks/useColumnOrder";

interface Props {
  allColumns: ColumnDef[];
  hiddenKeys: Set<string>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
}

const ColumnVisibilityMenu = ({ allColumns, hiddenKeys, onToggle, onShowAll }: Props) => {
  const hiddenCount = hiddenKeys.size;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Columns
          {hiddenCount > 0 && (
            <span className="text-xs text-muted-foreground">({allColumns.length - hiddenCount}/{allColumns.length})</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns.map(col => {
          const visible = !hiddenKeys.has(col.key);
          return (
            <DropdownMenuItem
              key={col.key}
              onSelect={(e) => { e.preventDefault(); onToggle(col.key); }}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{col.label}</span>
              {visible && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {hiddenCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onShowAll(); }} className="text-primary cursor-pointer">
              Show all
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnVisibilityMenu;
