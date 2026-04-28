import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const SAMPLE_MENU = [
  { name: 'Truffle Mushroom Risotto', price: 24, category: 'Main Course', description: 'Creamy carnaroli rice with wild mushrooms and white truffle oil.', available: true },
  { name: 'Wagyu Beef Sliders', price: 18, category: 'Appetizers', description: 'Three mini burgers with onion jam and aged cheddar.', available: true },
  { name: 'Matcha Lava Cake', price: 12, category: 'Desserts', description: 'Warm cake with a molten matcha green tea center.', available: true },
  { name: 'Artisanal Burrata', price: 16, category: 'Appetizers', description: 'Fresh burrata with heirloom tomatoes and balsamic glaze.', available: true },
  { name: 'Lobster Ravioli', price: 28, category: 'Main Course', description: 'Handmade pasta stuffed with succulent lobster in a brandy cream sauce.', available: true },
  { name: 'Espresso Martini', price: 15, category: 'Beverages', description: 'Rich espresso, vodka, and coffee liqueur.', available: true },
  { name: 'Caesar Salad', price: 14, category: 'Appetizers', description: 'Crisp romaine, parmesan, garlic croutons, and house-made dressing.', available: true },
  { name: 'Grilled Sea Bass', price: 32, category: 'Main Course', description: 'Fresh sea bass served with lemon butter sauce and seasonal vegetables.', available: true },
];

const INITIAL_TABLES = [
  { number: 'T1', capacity: 2, status: 'available' },
  { number: 'T2', capacity: 4, status: 'occupied' },
  { number: 'T3', capacity: 4, status: 'available' },
  { number: 'T4', capacity: 6, status: 'reserved' },
  { number: 'T5', capacity: 2, status: 'available' },
  { number: 'T6', capacity: 8, status: 'available' },
  { number: 'T7', capacity: 4, status: 'available' },
  { number: 'T8', capacity: 4, status: 'available' },
];

export const seedDatabase = async () => {
  try {
    // 0. Ensure user profile exists
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        email: auth.currentUser.email,
        role: 'admin',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    // 1. Add menu items if empty
    const menuSnap = await getDocs(collection(db, 'menu'));
    if (menuSnap.size === 0) {
      for (const item of SAMPLE_MENU) {
        await addDoc(collection(db, 'menu'), {
          ...item,
          createdAt: serverTimestamp(),
        });
      }
    }

    // 2. Add inventory if empty
    const invSnap = await getDocs(collection(db, 'inventory'));
    if (invSnap.size === 0) {
      const inventory = [
        { name: 'Truffle Oil', qty: 5, unit: 'Liters', minThreshold: 2 },
        { name: 'Matcha Powder', qty: 2, unit: 'kg', minThreshold: 5 },
        { name: 'Wagyu Beef', qty: 15, unit: 'kg', minThreshold: 10 },
        { name: 'Lobster', qty: 10, unit: 'kg', minThreshold: 5 },
        { name: 'Tomatoes', qty: 20, unit: 'kg', minThreshold: 10 },
      ];

      for (const item of inventory) {
        await addDoc(collection(db, 'inventory'), {
          ...item,
          createdAt: serverTimestamp(),
        });
      }
    }

    // 3. Setup Tables
    for (const table of INITIAL_TABLES) {
      await setDoc(doc(db, 'tables', table.number), {
        ...table,
        updatedAt: serverTimestamp()
      });
    }

    // 4. Add some sample orders if empty
    const ordSnap = await getDocs(collection(db, 'orders'));
    if (ordSnap.size === 0) {
      const sampleOrders = [
        {
          customerId: auth.currentUser?.uid || 'guest',
          customerEmail: auth.currentUser?.email || 'guest@example.com',
          items: [
            { name: 'Wagyu Beef Sliders', price: 18, qty: 2 },
            { name: 'Espresso Martini', price: 15, qty: 1 }
          ],
          totalAmount: 51,
          status: 'pending',
          type: 'dine-in',
          tableNumber: 'T1'
        },
        {
          customerId: 'test-user-1',
          customerEmail: 'customer1@example.com',
          items: [
            { name: 'Truffle Mushroom Risotto', price: 24, qty: 1 },
            { name: 'Matcha Lava Cake', price: 12, qty: 1 }
          ],
          totalAmount: 36,
          status: 'preparing',
          type: 'dine-in',
          tableNumber: 'T2'
        },
        {
          customerId: 'test-user-2',
          customerEmail: 'customer2@example.com',
          items: [
            { name: 'Lobster Ravioli', price: 28, qty: 2 }
          ],
          totalAmount: 56,
          status: 'ready',
          type: 'takeaway'
        }
      ];

      for (const order of sampleOrders) {
        await addDoc(collection(db, 'orders'), {
          ...order,
          createdAt: serverTimestamp()
        });
      }
    }

    return true;
  } catch (e) {
    console.error('Seeding failed:', e);
    throw e;
  }
};
