import { getDb } from '../db/schema.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Given net balances { memberId: amount } and a member list,
 * returns the minimum set of payments to settle all debts.
 * Positive balance = others owe this person.
 * Negative balance = this person owes others.
 */
function simplifyDebts(balances, members) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const creditors = [];
  const debtors = [];

  for (const [idStr, bal] of Object.entries(balances)) {
    const id = Number(idStr);
    if (bal > 0.005) creditors.push({ id, name: memberMap[id]?.name, balance: bal });
    else if (bal < -0.005) debtors.push({ id, name: memberMap[id]?.name, balance: bal });
  }

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  const transactions = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = round2(Math.min(creditors[ci].balance, Math.abs(debtors[di].balance)));
    transactions.push({
      from: { id: debtors[di].id, name: debtors[di].name },
      to: { id: creditors[ci].id, name: creditors[ci].name },
      amount,
    });
    creditors[ci].balance = round2(creditors[ci].balance - amount);
    debtors[di].balance = round2(debtors[di].balance + amount);
    if (creditors[ci].balance < 0.005) ci++;
    if (Math.abs(debtors[di].balance) < 0.005) di++;
  }

  return transactions;
}

function getGroupBalances(db, groupId) {
  const members = db.prepare('SELECT * FROM split_members WHERE group_id = ?').all(groupId);
  const expenses = db.prepare('SELECT * FROM split_expenses WHERE group_id = ?').all(groupId);
  const shares = db.prepare(`
    SELECT ss.* FROM split_shares ss
    JOIN split_expenses se ON se.id = ss.expense_id
    WHERE se.group_id = ?
  `).all(groupId);
  const settlements = db.prepare('SELECT * FROM split_settlements WHERE group_id = ?').all(groupId);

  const balances = Object.fromEntries(members.map((m) => [m.id, 0]));

  // Payer gets credited the full expense
  for (const e of expenses) {
    balances[e.paid_by] = round2((balances[e.paid_by] || 0) + e.amount);
  }
  // Each member is debited their share
  for (const s of shares) {
    balances[s.member_id] = round2((balances[s.member_id] || 0) - s.amount);
  }
  // Settlements: from_member paid to_member
  for (const s of settlements) {
    balances[s.from_member_id] = round2((balances[s.from_member_id] || 0) + s.amount);
    balances[s.to_member_id] = round2((balances[s.to_member_id] || 0) - s.amount);
  }

  const memberBalances = members.map((m) => ({
    ...m,
    balance: round2(balances[m.id] || 0),
    paid: round2(expenses.filter((e) => e.paid_by === m.id).reduce((s, e) => s + e.amount, 0)),
    owed: round2(shares.filter((sh) => sh.member_id === m.id).reduce((s, sh) => s + sh.amount, 0)),
  }));

  return {
    memberBalances,
    suggestions: simplifyDebts(balances, members),
  };
}

// ── Groups ────────────────────────────────────────────────────────────────────

export function listGroups(req, res) {
  const db = getDb();
  const groups = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM split_members WHERE group_id = g.id) AS member_count,
      (SELECT COUNT(*) FROM split_expenses WHERE group_id = g.id) AS expense_count,
      (SELECT COALESCE(SUM(amount),0) FROM split_expenses WHERE group_id = g.id) AS total_amount
    FROM split_groups g
    ORDER BY g.created_at DESC
  `).all();
  res.json(groups);
}

export function getGroup(req, res) {
  const db = getDb();
  const group = db.prepare('SELECT * FROM split_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const members = db.prepare('SELECT * FROM split_members WHERE group_id = ? ORDER BY name').all(group.id);
  const expenses = db.prepare(`
    SELECT se.*, sm.name AS paid_by_name
    FROM split_expenses se
    JOIN split_members sm ON sm.id = se.paid_by
    WHERE se.group_id = ?
    ORDER BY se.date DESC, se.created_at DESC
  `).all(group.id);

  // Attach shares to each expense
  const expensesWithShares = expenses.map((e) => {
    const shares = db.prepare(`
      SELECT ss.*, sm.name AS member_name
      FROM split_shares ss
      JOIN split_members sm ON sm.id = ss.member_id
      WHERE ss.expense_id = ?
    `).all(e.id);
    return { ...e, shares };
  });

  const settlements = db.prepare(`
    SELECT ss.*,
      fm.name AS from_name,
      tm.name AS to_name
    FROM split_settlements ss
    JOIN split_members fm ON fm.id = ss.from_member_id
    JOIN split_members tm ON tm.id = ss.to_member_id
    WHERE ss.group_id = ?
    ORDER BY ss.date DESC
  `).all(group.id);

  const { memberBalances, suggestions } = getGroupBalances(db, group.id);

  res.json({ ...group, members, expenses: expensesWithShares, settlements, memberBalances, suggestions });
}

export function createGroup(req, res) {
  const db = getDb();
  const { name, description = '', currency = 'USD' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare(
    'INSERT INTO split_groups (name, description, currency) VALUES (?, ?, ?)'
  ).run(name, description, currency);
  res.status(201).json(db.prepare('SELECT * FROM split_groups WHERE id = ?').get(result.lastInsertRowid));
}

export function updateGroup(req, res) {
  const db = getDb();
  const { name, description, currency } = req.body;
  const group = db.prepare('SELECT * FROM split_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  db.prepare(`
    UPDATE split_groups SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      currency = COALESCE(?, currency)
    WHERE id = ?
  `).run(name, description, currency, req.params.id);
  res.json(db.prepare('SELECT * FROM split_groups WHERE id = ?').get(req.params.id));
}

export function deleteGroup(req, res) {
  const db = getDb();
  if (!db.prepare('SELECT id FROM split_groups WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Group not found' });
  }
  db.prepare('DELETE FROM split_groups WHERE id = ?').run(req.params.id);
  res.status(204).end();
}

// ── Members ───────────────────────────────────────────────────────────────────

export function addMember(req, res) {
  const db = getDb();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!db.prepare('SELECT id FROM split_groups WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Group not found' });
  }
  const result = db.prepare(
    'INSERT INTO split_members (group_id, name) VALUES (?, ?)'
  ).run(req.params.id, name.trim());
  res.status(201).json(db.prepare('SELECT * FROM split_members WHERE id = ?').get(result.lastInsertRowid));
}

export function removeMember(req, res) {
  const db = getDb();
  const member = db.prepare('SELECT * FROM split_members WHERE id = ? AND group_id = ?').get(req.params.mid, req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  // Check if member has expenses
  const hasExpenses = db.prepare(
    'SELECT id FROM split_expenses WHERE group_id = ? AND paid_by = ? LIMIT 1'
  ).get(req.params.id, req.params.mid);
  if (hasExpenses) {
    return res.status(400).json({ error: 'Cannot remove a member who has paid expenses' });
  }
  db.prepare('DELETE FROM split_members WHERE id = ?').run(req.params.mid);
  res.status(204).end();
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export function addExpense(req, res) {
  const db = getDb();
  const { description, amount, paid_by, date, split_type = 'equal', custom_shares } = req.body;

  if (!description || !amount || !paid_by || !date) {
    return res.status(400).json({ error: 'description, amount, paid_by, and date are required' });
  }

  const group = db.prepare('SELECT * FROM split_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const members = db.prepare('SELECT * FROM split_members WHERE group_id = ?').all(req.params.id);
  if (members.length === 0) return res.status(400).json({ error: 'Group has no members' });

  const addExpenseAndShares = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO split_expenses (group_id, paid_by, description, amount, date) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.id, paid_by, description, Number(amount), date);

    const expenseId = result.lastInsertRowid;

    if (split_type === 'equal') {
      const share = round2(Number(amount) / members.length);
      // Distribute rounding remainder to first member
      const remainder = round2(Number(amount) - share * members.length);
      members.forEach((m, i) => {
        const memberShare = i === 0 ? round2(share + remainder) : share;
        db.prepare('INSERT INTO split_shares (expense_id, member_id, amount) VALUES (?, ?, ?)').run(expenseId, m.id, memberShare);
      });
    } else if (split_type === 'custom' && custom_shares) {
      // custom_shares: [{ member_id, amount }]
      const total = custom_shares.reduce((s, sh) => s + Number(sh.amount), 0);
      if (Math.abs(total - Number(amount)) > 0.02) {
        throw new Error('Custom shares must sum to the total amount');
      }
      for (const sh of custom_shares) {
        db.prepare('INSERT INTO split_shares (expense_id, member_id, amount) VALUES (?, ?, ?)').run(expenseId, sh.member_id, Number(sh.amount));
      }
    }

    return db.prepare(`
      SELECT se.*, sm.name AS paid_by_name
      FROM split_expenses se
      JOIN split_members sm ON sm.id = se.paid_by
      WHERE se.id = ?
    `).get(expenseId);
  });

  try {
    const expense = addExpenseAndShares();
    const shares = db.prepare(`
      SELECT ss.*, sm.name AS member_name
      FROM split_shares ss JOIN split_members sm ON sm.id = ss.member_id
      WHERE ss.expense_id = ?
    `).all(expense.id);
    res.status(201).json({ ...expense, shares });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export function deleteExpense(req, res) {
  const db = getDb();
  const expense = db.prepare('SELECT * FROM split_expenses WHERE id = ? AND group_id = ?').get(req.params.eid, req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  db.prepare('DELETE FROM split_expenses WHERE id = ?').run(req.params.eid);
  res.status(204).end();
}

// ── Settlements ───────────────────────────────────────────────────────────────

export function addSettlement(req, res) {
  const db = getDb();
  const { from_member_id, to_member_id, amount, date, note = '' } = req.body;
  if (!from_member_id || !to_member_id || !amount || !date) {
    return res.status(400).json({ error: 'from_member_id, to_member_id, amount, and date are required' });
  }
  if (from_member_id === to_member_id) {
    return res.status(400).json({ error: 'from and to members must be different' });
  }
  const result = db.prepare(
    'INSERT INTO split_settlements (group_id, from_member_id, to_member_id, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, from_member_id, to_member_id, Number(amount), date, note);

  const settlement = db.prepare(`
    SELECT ss.*, fm.name AS from_name, tm.name AS to_name
    FROM split_settlements ss
    JOIN split_members fm ON fm.id = ss.from_member_id
    JOIN split_members tm ON tm.id = ss.to_member_id
    WHERE ss.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(settlement);
}

export function deleteSettlement(req, res) {
  const db = getDb();
  const s = db.prepare('SELECT * FROM split_settlements WHERE id = ? AND group_id = ?').get(req.params.sid, req.params.id);
  if (!s) return res.status(404).json({ error: 'Settlement not found' });
  db.prepare('DELETE FROM split_settlements WHERE id = ?').run(req.params.sid);
  res.status(204).end();
}
