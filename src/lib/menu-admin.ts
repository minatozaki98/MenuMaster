import { getMenuImageChoice } from "./menu-images";
import type { MenuItem, MenuMasterState } from "./types";

export type MenuItemFormValues = {
  id?: string;
  categoryId: string;
  name: string;
  price: number;
  description: string;
  imageChoiceId?: string;
  uploadedImageUrl?: string;
};

export function buildMenuItemFromAdminForm(
  state: MenuMasterState,
  values: MenuItemFormValues,
): MenuItem {
  const existing = values.id
    ? state.menuItems.find((item) => item.id === values.id)
    : undefined;
  const imageChoice = values.imageChoiceId
    ? getMenuImageChoice(values.imageChoiceId)
    : undefined;
  const imageUrl =
    values.uploadedImageUrl?.trim() ||
    imageChoice?.url ||
    existing?.imageUrl ||
    getMenuImageChoice("salad").url;

  return {
    id: existing?.id ?? crypto.randomUUID(),
    restaurantId: state.restaurant.id,
    categoryId: values.categoryId,
    name: values.name.trim(),
    description: values.description.trim(),
    priceCents: Math.round(values.price),
    imageUrl,
    isAvailable: existing?.isAvailable ?? true,
    sortOrder: existing?.sortOrder ?? state.menuItems.length + 1,
    options: existing?.options ?? [],
  };
}
