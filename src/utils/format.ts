export const formatSek = (value: number) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(value);
