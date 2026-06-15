import { ColumnDef } from "@tanstack/react-table";

import moment from "moment";

export const columns: ColumnDef<SubsData>[] = [
  {
    accessorKey: "id",
    header: "Subscription ID",
    cell: ({ row }) => <p>{row.original?.stripeSubscriptionId}</p>,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <p>{row.original?.restaurantName}</p>,
  },
  {
    accessorKey: "plan",
    header: "Plan",
    cell: ({ row }) => (
      <p className={` ${ row.original?.planName === "Standard" ? "bg-[#f3d5b5] w-fit h-auto p-2 px-3 rounded-md text-[#5e503f]" : "bg-[#4f518c] w-fit h-auto p-2 px-3 rounded-md text-[#dabfff]" } `}>{row.original?.planName}</p>
    ),
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    accessorFn: (row) => moment(row.currentPeriodStart).format("ll"),
  },
  {
    accessorKey: "renewal",
    header: "Next Renewal",
    accessorFn: (row) => moment(row.currentPeriodEnd).format("ll"),
  },
  // {
  //   accessorKey: "amountPaid",
  //   header: "Amount Paid",
  //   cell: () => <p>636</p>,
  // },
  {
    accessorKey: "status",
    header: "Status",
    // accessorFn: (row) => row.resident?.firstName + " " + row.resident?.lastName,
    cell: ({ row }) => (
      <p className="bg-[#284b63] w-fit h-auto p-2 px-3 rounded-md text-[#d9d9d9] capitalize">{row.original?.status}</p>
    ),
  },
];
