const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export async function uploadReceiptImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "receipts");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    throw new Error("Image upload failed.");
  }

  const data = await response.json();
  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
  };
}

export function getCloudinaryThumbnail(
  url: string | undefined | null,
  size = 80,
): string {
  if (!url) return "";

  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const transform = `w_${size},h_${size},c_fill,g_auto,q_auto,f_auto,dpr_auto`;
  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);

  return `${before}${transform}/${after}`;
}
