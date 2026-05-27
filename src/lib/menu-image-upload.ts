const MENU_IMAGE_BUCKET = "menu-images";

export function getMenuImageBucket() {
  return MENU_IMAGE_BUCKET;
}

export function buildMenuImagePath(menuItemId: string, file: File, uniqueId: string) {
  const extension = getFileExtension(file.name, file.type);
  const safeId = menuItemId.replace(/[^a-zA-Z0-9-]/g, "");

  return `${safeId}/${uniqueId}${extension}`;
}

function getFileExtension(fileName: string, mimeType: string) {
  const extension = fileName.match(/\.[a-zA-Z0-9]+$/)?.[0]?.toLowerCase();
  if (extension) {
    return extension;
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/gif") {
    return ".gif";
  }

  return ".jpg";
}
