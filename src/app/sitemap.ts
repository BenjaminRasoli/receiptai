import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://receiptai.vercel.app",
      lastModified: new Date(),
    },
  ];
}
