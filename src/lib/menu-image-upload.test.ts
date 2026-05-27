import { describe, expect, it } from "vitest";
import { buildMenuImagePath, getMenuImageBucket } from "./menu-image-upload";

describe("menu image upload helpers", () => {
  it("uses a stable bucket name", () => {
    expect(getMenuImageBucket()).toBe("menu-images");
  });

  it("builds safe per-menu item storage paths", () => {
    const file = new File(["image"], "My Burger.JPG", { type: "image/jpeg" });

    expect(buildMenuImagePath("item-123/unsafe", file, "upload-1")).toBe(
      "item-123unsafe/upload-1.jpg",
    );
  });

  it("falls back to mime type when a file extension is missing", () => {
    const file = new File(["image"], "upload", { type: "image/webp" });

    expect(buildMenuImagePath("item-123", file, "upload-2")).toBe(
      "item-123/upload-2.webp",
    );
  });
});
