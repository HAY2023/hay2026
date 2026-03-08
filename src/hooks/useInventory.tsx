import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryItem {
  item_type: string;
  quantity: number;
  item_id: string;
}

export const useInventory = (userId: string | undefined) => {
  const [inventory, setInventory] = useState<Record<string, { quantity: number; item_id: string }>>({});
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    if (!userId) return;
    setLoading(true);
    const { data: purchases } = await supabase
      .from("user_purchases")
      .select("item_id, quantity, store_items(item_type)")
      .eq("user_id", userId);

    const inv: Record<string, { quantity: number; item_id: string }> = {};
    if (purchases) {
      for (const p of purchases as any[]) {
        const type = p.store_items?.item_type;
        if (type) {
          if (!inv[type]) inv[type] = { quantity: 0, item_id: p.item_id };
          inv[type].quantity += p.quantity;
        }
      }
    }
    setInventory(inv);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [userId]);

  const consumeItem = async (itemType: string) => {
    if (!userId || !inventory[itemType] || inventory[itemType].quantity <= 0) return false;
    
    // Find a purchase record to decrement
    const { data: purchase } = await supabase
      .from("user_purchases")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("item_id", inventory[itemType].item_id)
      .gt("quantity", 0)
      .limit(1)
      .single();

    if (!purchase) return false;

    if (purchase.quantity <= 1) {
      await (supabase.from("user_purchases") as any).delete().eq("id", purchase.id);
    } else {
      await (supabase.from("user_purchases") as any).update({ quantity: purchase.quantity - 1 }).eq("id", purchase.id);
    }

    setInventory(prev => ({
      ...prev,
      [itemType]: { ...prev[itemType], quantity: prev[itemType].quantity - 1 }
    }));
    return true;
  };

  const getCount = (itemType: string) => inventory[itemType]?.quantity ?? 0;

  return { inventory, loading, consumeItem, getCount, refetch: fetchInventory };
};
