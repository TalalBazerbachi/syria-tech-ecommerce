import { Container, clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  /** Kept for callers; every card is square now regardless. */
  isFeatured?: boolean
  /** Product title; read by screen readers and search engines. */
  alt?: string
  className?: string
  "data-testid"?: string
}

/**
 * Product cards are always square and show the whole photo ("contain", not
 * "cover"). Tech products are photographed in landscape or square on white,
 * and the fashion-style portrait crop the starter shipped with cut routers
 * and laptops off at the sides. Catalogue rule: upload square photos on a
 * white background (about 1200x1200) so every card looks the same.
 */
const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  alt = "",
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <Container
      className={clx(
        "relative w-full aspect-square overflow-hidden bg-white shadow-elevation-card-rest rounded-large group-hover:shadow-elevation-card-hover transition-shadow ease-in-out duration-150",
        className,
        {
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} alt={alt} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
  alt,
}: Pick<ThumbnailProps, "size" | "alt"> & { image?: string }) => {
  return image ? (
    <Image
      src={image}
      alt={alt ?? ""}
      className="absolute inset-0 h-full w-full object-contain object-center p-4"
      draggable={false}
      quality={60}
      sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      fill
    />
  ) : (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center">
      <PlaceholderImage size={size === "small" ? 16 : 24} />
    </div>
  )
}

export default Thumbnail
