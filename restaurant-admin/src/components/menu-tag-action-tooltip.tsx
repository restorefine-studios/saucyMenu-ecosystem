"use client";

import { Trash2, Edit2, MoreVertical } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HoverTooltipProps {
  text: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function HoverTooltip({ text, onEdit, onDelete }: HoverTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline-flex items-center gap-1 group">
      <span className="text-foreground">{text}</span>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="p-1 text-foreground/60 hover:text-foreground hover:bg-secondary rounded transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Actions"
          >
            <MoreVertical size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1" align="end">
          {/* Edit Action */}
          {onEdit && (
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-secondary rounded transition-colors text-sm"
            >
              <Edit2 size={16} />
              Edit
            </button>
          )}

          {/* Delete Action */}
          {onDelete && (
            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-destructive hover:bg-destructive/10 rounded transition-colors text-sm"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
