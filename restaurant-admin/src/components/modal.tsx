import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { ScrollArea } from "./ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ResponsiveModalProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl" | "full";
  open?: boolean;
  setOpen?: (val: boolean) => void;
}

export function Modal({
  trigger,
  title,
  description,
  children,
  footer,
  open,
  setOpen,
  size = "lg",
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const getModalSize = () => {
    switch (size) {
      case "sm":
        return isDesktop ? "sm:max-w-[320px]" : "h-1/4";
      case "md":
        return isDesktop ? "sm:max-w-[480px]" : "h-1/2";
      case "lg":
        return isDesktop ? "sm:max-w-[640px]" : "h-3/4";
      case "xl":
        return isDesktop ? "sm:max-w-[800px]" : "h-5/6";
      case "xxl":
        return isDesktop ? "sm:max-w-[70vw]" : "h-5/6";
      case "full":
        return isDesktop ? "sm:max-w-[100vw]" : "h-screen";
      default:
        return isDesktop ? "sm:max-w-[425px]" : "h-3/4";
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          className={`${getModalSize()} w-full px-4`}
        >
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className=" max-h-[80vh] min-h-[10vh] px-2">
            {children}
          </ScrollArea>
          {footer && <div className="flex justify-end space-x-2">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className={getModalSize()}>
        <ScrollArea>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>
          <div className="px-4 py-2">{children}</div>
          {footer && (
            <div className="mt-2 flex justify-end space-x-2 px-4 pb-4">
              {footer}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
