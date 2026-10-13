import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:text-base group-[.toaster]:px-5 group-[.toaster]:py-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!left-auto group-[.toast]:!right-2 group-[.toast]:!top-2 group-[.toast]:!translate-x-0 group-[.toast]:!translate-y-0 group-[.toast]:!h-7 group-[.toast]:!w-7 group-[.toast]:!rounded-full group-[.toast]:!bg-foreground group-[.toast]:!text-background group-[.toast]:!border-2 group-[.toast]:!border-background group-[.toast]:!shadow-md hover:group-[.toast]:!bg-destructive hover:group-[.toast]:!text-destructive-foreground group-[.toast]:!opacity-100 [&_svg]:!h-4 [&_svg]:!w-4 [&_svg]:!stroke-[3]",
          info: "group-[.toaster]:!bg-primary group-[.toaster]:!text-primary-foreground group-[.toaster]:!border-primary group-[.toaster]:shadow-xl group-[.toaster]:shadow-primary/20 group-[.toaster]:!text-lg group-[.toaster]:!font-semibold [&_[data-description]]:!text-primary-foreground/80",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
