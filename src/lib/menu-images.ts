export type MenuImageChoice = {
  id: string;
  label: string;
  url: string;
};

export const menuImageChoices: MenuImageChoice[] = [
  {
    id: "satay",
    label: "Wings",
    url: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "noodles",
    label: "Burger",
    url: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "curry",
    label: "Loaded fries",
    url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "rice-bowl",
    label: "Pub plate",
    url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "salad",
    label: "Fresh salad",
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "soup",
    label: "Soup",
    url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "steak",
    label: "Grilled plate",
    url: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "seafood",
    label: "Seafood",
    url: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tea",
    label: "Iced tea",
    url: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "coffee",
    label: "Coffee",
    url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "dessert",
    label: "Dessert",
    url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "cake",
    label: "Cake",
    url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
  },
];

export function getMenuImageChoice(imageId: string) {
  return (
    menuImageChoices.find((choice) => choice.id === imageId) ?? menuImageChoices[0]
  );
}

export function getMenuImageIdByUrl(url: string) {
  return menuImageChoices.find((choice) => choice.url === url)?.id ?? menuImageChoices[0].id;
}
