import * as RadixAvatar from "@radix-ui/react-avatar";
import Image from "next/image";
import profile from "../../assets/images/profile_default.jpg";
import { cva, VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { Ban } from "lucide-react";

const avatar = cva(
  "overflow-hidden rounded-full align-middle select-none inline-flex relative",
  {
    variants: {
      size: {
        xs: "size-7.5",
        sm: "size-10",
        md: "size-12.5",
        lg: "size-17",
        xl: "size-25.5",
        xxl: "size-32.5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type AvatarType = "profile" | "champion";

interface AvatarProps
  extends React.ComponentPropsWithoutRef<"img">, VariantProps<typeof avatar> {
  src: string | undefined;
  type: AvatarType;
  className?: string;
  isBanned?: boolean;
}

export default function Avatar({
  size,
  src,
  type,
  className,
  isBanned = false,
  ...props
}: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={twMerge(avatar({ size }), className)}
      {...props}
    >
      <RadixAvatar.Image
        className="size-full rounded-[inherit] object-cover"
        src={src}
        alt={
          type === "profile" ? "user profile image" : "champion thumbnail image"
        }
      />
      <RadixAvatar.Fallback delayMs={600}>
        <Image
          src={profile}
          alt={
            type === "profile"
              ? "user profile default image"
              : "champion thumbnail default image"
          }
        />
      </RadixAvatar.Fallback>
      {isBanned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Ban className="w-full h-full text-red-500 opacity-50" strokeWidth={4} />
        </div>
      )}
    </RadixAvatar.Root>
  );
}
