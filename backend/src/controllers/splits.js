import pool from '../db/pool.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n) { return Math.round(n * 100) / 100; }

function simplifyDebts(balances, members) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const creditors = [];
  const debtors   = [];

  for (const [idStr, bal] of Object.entries(balances)) {
    const id = Number(idStr);
    if (bal >  0.005) creditors.push({ id, name: memberMap[id]?.name, balance: bal });
    if (bal < -0.005) debtors.push({ id, name: memberMap[id]?.name, balance: bal });
  }
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  const txs = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = round2(Math.min(creditors[ci].balance, Math.abs(debtors[di].balance)));
    txs.push({ from: { id: debtors[di].id, name: debtors[di].name }, to: { id: creditors[ci].id, name: creditors[ci].name }, amount });
    creditors[ci].balance = round2(creditors[ci].balance - amount);
    debtors[di].balance   = round2(debtors[di].balance   + amount);
    if (creditors[ci].balance < 0.005) ci++;
    if (Math.abs(debtors[di].balance) < 0.005) di++;
  }
  return txs;
}

async function getGroupBalances(groupId) {
  const [{ rows: members }, { rows: expenses }, { rows: shares }, { rows: settlements }] = await Promise.all([
    pool.query('SELECT * FROM split_members WHERE group_id = $1', [groupId]),
    pool.query('SELECT * FROM split_expenses WHERE group_id = $1', [groupId]),
    pool.query(`
      SELECT ss.* FROM split_shares ss
      JOIN split_expenses se ON se.id = ss.expense_id
      WHERE se.group_id = $1
    `, [groupId]),
    pool.query('SELECT * FROM split_settlements WHERE group_id = $1', [groupId]),
  ]);

  const balances = Object.fromEntries(members.map((m) => [m.id, 0]));
  for (const e of expenses)    balances[e.paid_by]        = round2((balances[e.paid_by] || 0) + e.amount);
  for (const s of shares)      balances[s.member_id]      = round2((balances[s.member_id] || 0) - s.amount);
  for (const s of settlements) {
    balances[s.from_member_id] = round2((balances[s.from_member_id] || 0) + s.amount);
    balances[s.to_member_id]   = round2((balances[s.to_member_id]   || 0) - s.amount);
  }

  const memberBalances = members.map((m) => ({
    ...m,
    balance: round2(balances[m.id] || 0),
    paid: round2(expenses.filter((e) => e.paid_by === m.id).reduce((s, e) => s + e.amount, 0)),
    owed: round2(shares.filter((sh) => sh.member_id === m.id).reduce((s, sh) => s + sh.amount, 0)),
  }));

  return { memberBalances, suggestions: simplifyDebts(balances, members) };
}

// Resolves group by ID and verifies it belongs to the authenticated user.
// Returns the group row or sends a 404 and returns null.
async function resolveGroup(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM split_groups WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) { res.status(404).json({ error: 'Group not found' }); return null; }
  return rows[0];
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function listGroups(req, res) {
  const { rows } = await pool.query(`
    SELECT g.*,
      (SELECT COUNT(*) FROM split_members  WHERE group_id = g.id)::INTEGER AS member_count,
      (SELECT COUNT(*) FROM split_expenses WHERE group_id = g.id)::INTEGER AS expense_count,
      COALESCE((SELECT SUM(amount) FROM split_expenses WHERE group_id = g.id), 0) AS total_amount
    FROM split_groups g WHERE g.user_id = $1 ORDER BY g.created_at DESC
  `, [req.user.id]);
  res.json(rows);
}

export async function getGroup(req, res) {
  const group = await resolveGroup(req, res);
  if (!group) return;

  const [{ rows: members }, { rows: expenses }, { rows: settlements }] = await Promise.all([
    pool.query('SELECT * FROM split_members WHERE group_id = $1 ORDER BY name', [group.id]),
    pool.query(`
      SELECT se.*, sm.name AS paid_by_name
      FROM split_expenses se
      JOIN split_members sm ON sm.id = se.paid_by
      WHERE se.group_id = $1 ORDER BY se.date DESC, se.created_at DESC
    `, [group.id]),
    pool.query(`
      SELECT ss.*, fm.name AS from_name, tm.name AS to_name
      FROM split_settlements ss
      JOIN split_members fm ON fm.id = ss.from_member_id
      JOIN split_members tm ON tm.id = ss.to_member_id
      WHERE ss.group_id = $1 ORDER BY ss.date DESC
    `, [group.id]),
  ]);

  const expensesWithShares = await Promise.all(
    expenses.map(async (e) => {
      const { rows: shares } = await pool.query(`
        SELECT ss.*, sm.name AS member_name
        FROM split_shares ss JOIN split_members sm ON sm.id = ss.member_id
        WHERE ss.expense_id = $1
      `, [e.id]);
      return { ...e, shares };
    })
  );

  const { memberBalances, suggestions } = await getGroupBalances(group.id);
  res.json({ ...group, members, expenses: expensesWithShares, settlements, memberBalances, suggestions });
}

export async function createGroup(req, res) {
  const { name, description = '', currency = 'USD' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await pool.query(
    'INSERT INTO split_groups (user_id, name, description, currency) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user.id, name, description, currency]
  );
  res.status(201).json(rows[0]);
}

export async function updateGroup(req, res) {
  const { name, description, currency } = req.body;
  const { rows } = await pool.query(`
    UPDATE split_groups SET
      name        = COALESCE($1, name),
      description = COALESCE($2, description),
      currency    = COALESCE($3, currency)
    WHERE id = $4 AND user_id = $5 RETURNING *
  `, [name, description, currency, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Group not found' });
  res.json(rows[0]);
}

export async function deleteGroup(req, res) {
  const { rows } = await pool.query(
    'DELETE FROM split_groups WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Group not found' });
  res.status(204).end();
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function addMember(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const group = await resolveGroup(req, res);
  if (!group) return;
  const { rows } = await pool.query(
    'INSERT INTO split_members (group_id, name) VALUES ($1,$2) RETURNING *',
    [group.id, name.trim()]
  );
  res.status(201).json(rows[0]);
}

export async function removeMember(req, res) {
  const group = await resolveGroup(req, res);
  if (!group) return;
  const { rows: member } = await pool.query(
    'SELECT id FROM split_members WHERE id = $1 AND group_id = $2',
    [req.params.mid, group.id]
  );
  if (!member[0]) return res.status(404).json({ error: 'Member not found' });
  const { rows: hasExp } = await pool.query(
    'SELECT id FROM split_expenses WHERE group_id = $1 AND paid_by = $2 LIMIT 1',
    [group.id, req.params.mid]
  );
  if (hasExp[0]) return res.status(400).json({ error: 'Cannot remove a member who has paid expenses' });
  await pool.query('DELETE FROM split_members WHERE id = $1', [req.params.mid]);
  res.status(204).end();
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function addExpense(req, res) {
  const { description, amount, paid_by, date, split_type = 'equal', custom_shares } = req.body;
  if (!description || !amount || !paid_by || !date) {
    return res.status(400).json({ error: 'description, amount, paid_by, and date are required' });
  }

  const group = await resolveGroup(req, res);
  if (!group) return;

  const { rows: members } = await pool.query(
    'SELECT * FROM split_members WHERE group_id = $1',
    [group.id]
  );
  if (members.length === 0) return res.status(400).json({ error: 'Group has no members' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: expRows } = await client.query(
      'INSERT INTO split_expenses (group_id, paid_by, description, amount, date) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [group.id, paid_by, description, Number(amount), date]
    );
    const expenseId = expRows[0].id;

    if (split_type === 'equal') {
      const share     = round2(Number(amount) / members.length);
      const remainder = round2(Number(amount) - share * members.length);
      for (let i = 0; i < members.length; i++) {
        await client.query(
          'INSERT INTO split_shares (expense_id, member_id, amount) VALUES ($1,$2,$3)',
          [expenseId, members[i].id, i === 0 ? round2(share + remainder) : share]
        );
      }
    } else if (split_type === 'custom' && custom_shares) {
      const total = custom_shares.reduce((s, sh) => s + Number(sh.amount), 0);
      if (Math.abs(total - Number(amount)) > 0.02) throw new Error('Custom shares must sum to the total amount');
      for (const sh of custom_shares) {
        await client.query(
          'INSERT INTO split_shares (expense_id, member_id, amount) VALUES ($1,$2,$3)',
          [expenseId, sh.member_id, Number(sh.amount)]
        );
      }
    }

    await client.query('COMMIT');

    const { rows: exp } = await pool.query(`
      SELECT se.*, sm.name AS paid_by_name FROM split_expenses se
      JOIN split_members sm ON sm.id = se.paid_by WHERE se.id = $1
    `, [expenseId]);
    const { rows: shares } = await pool.query(`
      SELECT ss.*, sm.name AS member_name FROM split_shares ss
      JOIN split_members sm ON sm.id = ss.member_id WHERE ss.expense_id = $1
    `, [expenseId]);
    res.status(201).json({ ...exp[0], shares });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function deleteExpense(req, res) {
  const group = await resolveGroup(req, res);
  if (!group) return;
  const { rows } = await pool.query(
    'DELETE FROM split_expenses WHERE id = $1 AND group_id = $2 RETURNING id',
    [req.params.eid, group.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Expense not found' });
  res.status(204).end();
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function addSettlement(req, res) {
  const { from_member_id, to_member_id, amount, date, note = '' } = req.body;
  if (!from_member_id || !to_member_id || !amount || !date) {
    return res.status(400).json({ error: 'from_member_id, to_member_id, amount, and date are required' });
  }
  if (Number(from_member_id) === Number(to_member_id)) {
    return res.status(400).json({ error: 'from and to members must be different' });
  }
  const group = await resolveGroup(req, res);
  if (!group) return;
  const { rows: ins } = await pool.query(
    'INSERT INTO split_settlements (group_id, from_member_id, to_member_id, amount, date, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [group.id, from_member_id, to_member_id, Number(amount), date, note]
  );
  const { rows } = await pool.query(`
    SELECT ss.*, fm.name AS from_name, tm.name AS to_name
    FROM split_settlements ss
    JOIN split_members fm ON fm.id = ss.from_member_id
    JOIN split_members tm ON tm.id = ss.to_member_id
    WHERE ss.id = $1
  `, [ins[0].id]);
  res.status(201).json(rows[0]);
}

export async function deleteSettlement(req, res) {
  const group = await resolveGroup(req, res);
  if (!group) return;
  const { rows } = await pool.query(
    'DELETE FROM split_settlements WHERE id = $1 AND group_id = $2 RETURNING id',
    [req.params.sid, group.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Settlement not found' });
  res.status(204).end();
}
