import { getDb } from './schema.js';

const db = getDb();

// Seed categories
const categories = [
  // Expenses
  { name: 'Alimentación', type: 'expense', color: '#f97316', icon: 'utensils' },
  { name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'car' },
  { name: 'Vivienda', type: 'expense', color: '#8b5cf6', icon: 'home' },
  { name: 'Salud', type: 'expense', color: '#ef4444', icon: 'heart' },
  { name: 'Entretenimiento', type: 'expense', color: '#ec4899', icon: 'film' },
  { name: 'Educación', type: 'expense', color: '#06b6d4', icon: 'book' },
  { name: 'Ropa', type: 'expense', color: '#f59e0b', icon: 'shirt' },
  { name: 'Servicios', type: 'expense', color: '#64748b', icon: 'zap' },
  { name: 'Otros gastos', type: 'expense', color: '#94a3b8', icon: 'more-horizontal' },
  // Income
  { name: 'Salario', type: 'income', color: '#22c55e', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', color: '#10b981', icon: 'laptop' },
  { name: 'Inversiones', type: 'income', color: '#84cc16', icon: 'trending-up' },
  { name: 'Otros ingresos', type: 'income', color: '#a3e635', icon: 'plus-circle' },
];

const insertCategory = db.prepare(
  'INSERT OR IGNORE INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)'
);

const insertAllCategories = db.transaction(() => {
  for (const cat of categories) {
    insertCategory.run(cat.name, cat.type, cat.color, cat.icon);
  }
});

insertAllCategories();

// Seed one default account
const accountExists = db.prepare('SELECT id FROM accounts LIMIT 1').get();
if (!accountExists) {
  db.prepare(
    "INSERT INTO accounts (name, type, balance, currency, color) VALUES ('Cuenta Principal', 'checking', 0, 'USD', '#6366f1')"
  ).run();
}

console.log('Seed completed successfully.');
