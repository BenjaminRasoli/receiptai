import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://receiptsai.vercel.app",
      lastModified: new Date(),
    },
  ];
}
