const { boot } = require('./harness.js');
const app = boot('telegram.html');

app.run(`
section('parsing (verbatim copy of index.html\\'s parser — must stay in sync)');
let p = parseSegment('dinner rm10');
ok(p.amount === 10, 'dinner rm10 -> amount 10');
ok(p.category === 'Food (daily)', 'dinner -> Food (daily): got ' + p.category);

p = parseSegment('reload boost RM150');
ok(p.amount === 150, 'reload boost RM150 -> amount 150');
ok(p.category === 'Reload (Boost eWallet)', 'reload boost -> Reload category: got ' + p.category);

let list = parseInput('dinner rm10, telur rm12, apple rm12.50');
ok(list.length === 3, 'three comma-separated items become three transactions');

section('render — capture flow (no Telegram WebApp present)');
ok(typeof tg === 'undefined' || tg === null, 'tg is null when window.Telegram is absent, so the harness exercises the fallback path');
state.pending = parseInput('dinner rm10, telur rm12');
render();
ok(html('#pending-list').includes('RM10.00'), 'pending list renders the parsed amount');
ok(document.querySelector('#pending-actions').classList.contains('hidden') === false, 'save/cancel actions appear once there is something pending');
`, 'telegram-sync');

// doSavePending is async (it awaits the backend fetch before falling back to
// the offline queue), so it's driven from real Node here rather than from
// inside app.run()'s synchronous vm script.
(async () => {
  await app.ctx.doSavePending();

  app.run(`
  section('save — offline fallback (harness fetch always rejects)');
  ok(state.pending.length === 0, 'pending clears after save even when the backend is unreachable');
  ok(state.recent.length === 2, 'both parsed transactions land in the recent list');
  ok(state.recent.every(t => t.queued === true), 'transactions are marked queued when the backend call fails');
  ok(state.queueLength === 2, 'queue length reflects the two transactions saved offline');
  render();
  ok(document.querySelector('#status-line').textContent.includes('saved offline'), 'status line explains the offline queue to the user');
  ok(html('#recent-log').includes('queued'), 'recent list shows the queued badge');
  `, 'telegram-async');

  app.done();
})();
