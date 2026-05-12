import { useEffect, useState } from "react";
import { supabase, type Category } from "./supabase";

const sortByLabel = (a: Category, b: Category) => a.label.localeCompare(b.label, "pt-BR");

export function useCategories() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      const { data } = await supabase.from("categories").select("*");
      if (!mounted) return;
      setCategories(((data ?? []) as Category[]).slice().sort(sortByLabel));
    };

    fetch();

    const channel = supabase
      .channel("categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => fetch(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return categories;
}

/** Para componentes que só precisam mapear key → {label, emoji} */
export function useCategoryMap() {
  const cats = useCategories();
  return cats?.reduce<Record<string, Category>>((acc, c) => {
    acc[c.key] = c;
    return acc;
  }, {}) ?? null;
}
