import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg [&>[data-icon]]:text-[#9DCC36]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:!bg-transparent group-[.toast]:!text-[#9DCC36] group-[.toast]:!font-bold group-[.toast]:!text-[14px] group-[.toast]:!p-0 group-[.toast]:!shadow-none",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "[&>[data-icon]>svg]:text-[#9DCC36]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
