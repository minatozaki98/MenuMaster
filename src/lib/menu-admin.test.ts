import { describe, expect, it, vi } from "vitest";
import { demoState } from "./demo-data";
import { buildMenuItemFromAdminForm } from "./menu-admin";
import { getMenuImageChoice } from "./menu-images";

describe("admin menu form helpers", () => {
  it("creates a new menu item from a selected image choice", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("new-menu-item-id");

    const item = buildMenuItemFromAdminForm(demoState, {
      categoryId: "cat-mains",
      name: "  Fish and Chips  ",
      price: 13.5,
      description: "  Beer-battered fish with fries.  ",
      imageChoiceId: "rice-bowl",
    });

    expect(item).toMatchObject({
      id: "new-menu-item-id",
      restaurantId: demoState.restaurant.id,
      categoryId: "cat-mains",
      name: "Fish and Chips",
      description: "Beer-battered fish with fries.",
      priceCents: 1350,
      imageUrl: getMenuImageChoice("rice-bowl").url,
      isAvailable: true,
    });

    vi.restoreAllMocks();
  });

  it("uses an uploaded image data URL when the admin provides one", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uploaded-menu-item-id");

    const item = buildMenuItemFromAdminForm(demoState, {
      categoryId: "cat-drinks",
      name: "House IPA",
      price: 7.5,
      description: "Rotating tap beer.",
      imageChoiceId: "coffee",
      uploadedImageUrl: "data:image/png;base64,uploaded-image",
    });

    expect(item.imageUrl).toBe("data:image/png;base64,uploaded-image");

    vi.restoreAllMocks();
  });

  it("edits an existing menu item while preserving availability and options", () => {
    const existing = demoState.menuItems[0];

    const item = buildMenuItemFromAdminForm(demoState, {
      id: existing.id,
      categoryId: "cat-starters",
      name: "Buffalo Wings Basket",
      price: 10.25,
      description: "Updated description",
      imageChoiceId: "satay",
    });

    expect(item.id).toBe(existing.id);
    expect(item.isAvailable).toBe(existing.isAvailable);
    expect(item.options).toEqual(existing.options);
    expect(item.name).toBe("Buffalo Wings Basket");
    expect(item.priceCents).toBe(1025);
  });

  it("preserves an existing uploaded image when no new image is selected", () => {
    const existing = {
      ...demoState.menuItems[0],
      imageUrl: "data:image/webp;base64,existing-upload",
    };
    const state = {
      ...demoState,
      menuItems: [existing, ...demoState.menuItems.slice(1)],
    };

    const item = buildMenuItemFromAdminForm(state, {
      id: existing.id,
      categoryId: existing.categoryId,
      name: existing.name,
      price: existing.priceCents / 100,
      description: existing.description,
    });

    expect(item.imageUrl).toBe("data:image/webp;base64,existing-upload");
  });
});
