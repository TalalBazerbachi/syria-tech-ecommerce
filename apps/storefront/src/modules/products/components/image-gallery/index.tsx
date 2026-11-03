import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import { useTranslations } from "next-intl"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const t = useTranslations("product")

  return (
    <div className="flex items-start relative">
      <div className="flex flex-col flex-1 small:mx-16 gap-y-4">
        {images.map((image, index) => {
          // Square, whole photo visible on white: product shots are landscape
          // or square, so "cover" in a portrait box crops them.
          return (
            <Container
              key={image.id}
              className="relative aspect-square w-full overflow-hidden bg-white"
              id={image.id}
            >
              {!!image.url && (
                <Image
                  src={image.url}
                  priority={index <= 2 ? true : false}
                  className="absolute inset-0 rounded-rounded p-4"
                  alt={t("imageAlt", { index: index + 1 })}
                  fill
                  sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                  style={{
                    objectFit: "contain",
                  }}
                />
              )}
            </Container>
          )
        })}
      </div>
    </div>
  )
}

export default ImageGallery
