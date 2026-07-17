import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

export type DemoCardRow = {
  id: string;
  deck: string;
  front: string;
  back: string;
};

const columnHelper = createColumnHelper<DemoCardRow>();

const columns = [
  columnHelper.accessor("deck", { header: "Deck" }),
  columnHelper.accessor("front", { header: "Front" }),
  columnHelper.accessor("back", { header: "Back" }),
];

export function DemoTable({ rows }: { rows: DemoCardRow[] }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b">
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="px-3 py-2 font-medium">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-3 py-6 text-center text-muted-foreground"
            >
              No cards yet.
            </td>
          </tr>
        ) : (
          table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
