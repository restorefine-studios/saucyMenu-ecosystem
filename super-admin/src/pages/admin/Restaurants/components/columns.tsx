import { ColumnDef } from "@tanstack/react-table";

import moment from "moment";

import NavigateButton from "./navigateButton";
import ReleaseAccount from "./release-account";

export const columns: ColumnDef<Restaurant>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <p>{row?.original?.name}</p>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <p>{row?.original?.email}</p>,
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => <p>{row.original?.address ?? "N/A"}</p>,
  },
  // {
  //   accessorKey: "plan",
  //   header: "Plan",
  //   cell: ({ row }) => (
  //     <p className="text-[#F7941D]">{row.original?}</p>
  //   ),
  // },
  {
    accessorKey: "dateAdded",
    header: "Date Added",
    accessorFn: (row) => moment(row.createdAt).format("lll"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let className = "capitalize ";

      if (status === "COMPLETED") {
        className += "bg-green-100 w-fit h-auto p-2 px-3 rounded-md text-green-600";
      } else if (status === "PENDING") {
        className += "bg-[#FFF3D6] w-fit h-auto p-2 px-3 rounded-md text-yellow-600";
      } else if (status === "RELEASED") {
        className += "bg-[#caf0f8] w-fit h-auto p-2 px-3 rounded-md text-[#457b9d]";
      }

      return <p className={className}>{status.toLowerCase()}</p>;
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    accessorFn: () => {},
    cell: ({ row }) => (
      <div className="flex items-center space-x-4">
        <span className="bg-gray-200 w-fit h-fit py-2 px-3 rounded-md">
          {" "}
          <NavigateButton id={row.original.id} />
        </span>

        {row?.original?.status === "PENDING" && (
          <ReleaseAccount id={row.original.id} email={row.original.email ?? ""} />
        )}
      </div>
    ),
  },
 
];
