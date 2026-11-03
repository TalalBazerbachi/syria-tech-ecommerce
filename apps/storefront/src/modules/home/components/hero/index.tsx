import Image from "next/image"
import { getTranslations } from "next-intl/server"

import type { HomeContent } from "@lib/data/content"
import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type HeroProps = {
  /** From `content/home.<locale>.json`; `null` falls back to the translated copy. */
  content: HomeContent["hero"] | null
}

const Hero = async ({ content }: HeroProps) => {
  const t = await getTranslations("home")

  const heading = content?.heading ?? t("heroTitle")
  const text = content ? content.text : t("heroSubtitle")
  const ctaLabel = content?.ctaLabel ?? t("shopNow")
  const ctaHref = content?.ctaHref ?? "/store"
  const image = content?.image ?? null

  return (
    <section
      className="w-full border-b border-ui-border-base bg-ui-bg-subtle"
      data-testid="home-hero"
    >
      <div className="content-container grid grid-cols-1 small:grid-cols-2 items-center gap-8 py-12 small:py-24">
        <div className="flex flex-col gap-6 text-center small:text-start items-center small:items-start">
          <Heading level="h1" className="text-3xl small:text-4xl leading-tight text-ui-fg-base">
            {heading}
          </Heading>
          {text && (
            <Text className="text-large-regular text-ui-fg-subtle max-w-prose">
              {text}
            </Text>
          )}
          <LocalizedClientLink href={ctaHref} data-testid="home-hero-cta">
            <Button variant="primary" size="large">
              {ctaLabel}
            </Button>
          </LocalizedClientLink>
        </div>
        {image && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-large bg-ui-bg-base">
            <Image
              src={image}
              alt={content?.imageAlt ?? heading}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  )
}

export default Hero
