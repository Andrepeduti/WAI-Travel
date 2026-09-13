import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={{ marginTop: '3.5rem' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg [&>[data-icon]]:text-[#9DCC36]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:!bg-transparent group-[.toast:not([data-type='success'])]:!text-[#9DCC36] group-[.toast]:!font-bold group-[.toast]:!text-[14px] group-[.toast]:!p-0 group-[.toast]:!shadow-none",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-[#3C8622] group-[.toaster]:!text-white group-[.toaster]:!border-none group-[.toaster]:!rounded-[16px] group-[.toaster]:!p-4 group-[.toaster]:!gap-6 group-[.toaster]:!min-h-[49px] group-[.toaster]:!flex group-[.toaster]:!flex-row group-[.toaster]:!items-center [&>[data-icon]>svg]:!text-white [&_[data-description]]:!hidden [&_[data-title]]:!font-['Urbanist'] [&_[data-title]]:!font-medium [&_[data-title]]:!text-[14px] [&_[data-title]]:!leading-none [&_[data-title]]:!tracking-normal [&_[data-button]]:!text-white [&_[data-button]]:!font-['Urbanist'] [&_[data-button]]:!font-bold [&_[data-button]]:!text-[14px] [&_[data-button]]:!leading-none [&_[data-button]]:!tracking-normal [&_[data-button]]:!align-middle",
          closeButton: "group-[.toast]:!bg-transparent group-[.toast]:!text-white group-[.toast]:!border-none hover:group-[.toast]:!bg-white/20 group-[.toast]:!opacity-100 group-[.toast]:!absolute group-[.toast]:!right-4 group-[.toast]:!top-1/2 group-[.toast]:!-translate-y-1/2 group-[.toast]:!left-auto group-[.toast]:!translate-x-0",
        },
      }}
      icons={{
        success: <CheckCircle2 size={16} className="text-white shrink-0" />,
      }}
      closeButton
      {...props}
    />
  );
};

export { Toaster, toast };
