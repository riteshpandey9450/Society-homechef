import { createContext, useContext, useState, useCallback } from "react";
import toast from "react-hot-toast";

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }) => {
  // items: [{ dishId, name, price, quantity, image, chefId, chefName, isVeg, calories }]
  const [items, setItems] = useState([]);
  const [cartChefId, setCartChefId] = useState(null);
  const [cartChefName, setCartChefName] = useState(null);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  /**
   * Add a dish or increment its quantity.
   * Enforces single-chef constraint: if cart already has items from another
   * chef, prompt user to clear before adding.
   */
  const addItem = useCallback(
    (dish) => {
      if (cartChefId && cartChefId !== dish.chefId.toString()) {
        toast.error(
          `Cart already has items from ${cartChefName}. Clear cart to order from a different chef.`,
        );
        return false;
      }

      setItems((prev) => {
        const exists = prev.find((i) => i.dishId === dish._id.toString());
        if (exists) {
          return prev.map((i) =>
            i.dishId === dish._id.toString()
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
        }
        return [
          ...prev,
          {
            dishId: dish._id.toString(),
            name: dish.name,
            price: dish.price,
            quantity: 1,
            image: dish.image,
            chefId: dish.chefId.toString(),
            chefName: dish.chefName,
            isVeg: dish.isVeg,
            calories: dish.calories,
          },
        ];
      });

      if (!cartChefId) {
        setCartChefId(dish.chefId.toString());
        setCartChefName(dish.chefName);
      }
      return true;
    },
    [cartChefId, cartChefName],
  );

  const removeItem = useCallback((dishId) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.dishId !== dishId);
      if (next.length === 0) {
        setCartChefId(null);
        setCartChefName(null);
      }
      return next;
    });
  }, []);

  const updateQuantity = useCallback(
    (dishId, qty) => {
      if (qty <= 0) {
        removeItem(dishId);
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.dishId === dishId ? { ...i, quantity: qty } : i)),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setCartChefId(null);
    setCartChefName(null);
  }, []);

  const getItemQuantity = useCallback(
    (dishId) =>
      items.find((i) => i.dishId === dishId.toString())?.quantity || 0,
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalAmount,
        cartChefId,
        cartChefName,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
