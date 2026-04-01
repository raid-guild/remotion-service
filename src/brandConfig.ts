export type BrandId = "raidguild";

export type BrandAssets = {
  logoUrl: string;
  heroImageUrl?: string;
  introAudioUrl?: string;
  brandBugUrl?: string;
};

export type BrandTheme = {
  primary: string;
  primaryDark: string;
  background: string;
  backgroundAlt: string;
  border: string;
  text: string;
};

export type BrandConfigEntry = {
  id: BrandId;
  label: string;
  defaultTitle: string;
  defaultAccent: string;
  assets: BrandAssets;
  theme: BrandTheme;
};

export const DEFAULT_BRAND_ID: BrandId = "raidguild";

export const BRAND_CONFIG: Record<BrandId, BrandConfigEntry> = {
  raidguild: {
    id: "raidguild",
    label: "Raid Guild / Dark Factory",
    defaultTitle: "Raid Guild Daily Brief",
    defaultAccent: "#bd482d",
    assets: {
      logoUrl: "https://www.raidguild.org/images/logo-RG-moloch-800.svg",
      heroImageUrl: "https://www.raidguild.org/images/home-image-1-c.webp",
      // You can later move these to S3/CDN and just update the URLs here.
      introAudioUrl: undefined,
      brandBugUrl: undefined,
    },
    theme: {
      primary: "#bd482d",
      primaryDark: "#29100a",
      background: "#f9f7e7",
      backgroundAlt: "#f3eeca",
      border: "#534a13",
      text: "#29100a",
    },
  },
};

export const getBrandConfig = (brandId: BrandId = DEFAULT_BRAND_ID): BrandConfigEntry => {
  return BRAND_CONFIG[brandId] ?? BRAND_CONFIG[DEFAULT_BRAND_ID];
};
