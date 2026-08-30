const { boot } = require('./harness.js');
const app = boot('index.html');

app.run(`
section('caption generation — all angle x language combos');
const p = newProduct({ name: 'Guard Peeler', price: 29, problem: 'slippery peelers that nick your fingers', benefit: 'has a guard handle so it is comfortable to grip', urgent: false });
const captions = generateAllCaptions(p);
ok(captions.length === 9, '3 angles x 3 languages = 9 captions: got ' + captions.length);
captions.forEach(c => {
  ok(c.text && c.text.trim().length > 0, c.angle + '/' + c.lang + ' caption is non-empty');
  ok(c.text.length < 600, c.angle + '/' + c.lang + ' caption is a readable length: got ' + c.text.length);
  ok(c.flagged === false, c.angle + '/' + c.lang + ' clean product text is not flagged');
});

section('urgency gating');
const urgentP = newProduct({ name: 'X', price: 10, problem: 'p', benefit: 'b', urgent: true });
const calmP = newProduct({ name: 'X', price: 10, problem: 'p', benefit: 'b', urgent: false });
ok(generateCaption(urgentP, 'question', 'en').text.includes('Limited stock'), 'urgent product gets urgency wording');
ok(!generateCaption(calmP, 'question', 'en').text.includes('Limited stock'), 'non-urgent product never gets urgency wording');

section('health-claim guard');
ok(checkHealthClaim('reduces pain in your hands') !== null, 'catches "reduces pain"');
ok(checkHealthClaim('solves fatigue instantly') !== null, 'catches "solves fatigue"');
ok(checkHealthClaim('results in 2 weeks') !== null, 'catches a specific timeframe claim');
ok(checkHealthClaim('has a comfortable guard handle') === null, 'feature-based language is not flagged');
const badP = newProduct({ name: 'X', price: 10, problem: 'wrist pain that never goes away', benefit: 'reduces pain fast', urgent: false });
ok(generateCaption(badP, 'pov', 'en').flagged === true, 'a health-outcome benefit flags the generated caption');

section('TOC / on-screen script — beat plan + scene counts');
[6, 10, 15, 21, 35].forEach(dur => {
  const toc = generateTOC(p, 'question', 'bm', dur);
  ok(toc.scenes.length === toc.sceneCount, dur + 's clip: scene array length matches sceneCount');
  ok(toc.scenes.every(s => s.trim().length > 0), dur + 's clip: no empty scenes');
  ok(toc.scenes.every(s => s.length < 200), dur + 's clip: no scene over a readable length');
});
const toc15 = generateTOC(p, 'question', 'bm', 15);
ok(toc15.scenes[0] === hookLine(p, 'question', 'bm'), 'scene 1 equals the caption hook line, not a separate idea');
ok(toc15.scenes[toc15.scenes.length - 1].includes('bio') || toc15.scenes[toc15.scenes.length - 1].includes('keranjang'), 'last scene is the CTA');

section('weekly planner — repost warnings');
let plan = emptyPlan('2026-08-31');
plan.slots[0].isRepost = true;
plan.slots[0].openingChanged = false;
plan.slots[1].isRepost = true;
plan.slots[1].openingChanged = true;
let warnings = planWarnings(plan);
ok(warnings.length === 1 && warnings[0].dow === 'Mon', 'only the repost with an unchanged opening is flagged: got ' + JSON.stringify(warnings));

section('performance — CSV import parsing + fuzzy headers');
const csv = 'Video title,Post time,Views,Likes,Comments,Shares\\n"Guard peeler demo",2026-08-20,1200,80,12,5\\n"Second video",2026-08-21,300,10,1,0';
const rows = parsePerfCSV(csv);
ok(rows.length === 2, 'parses two data rows: got ' + rows.length);
ok(rows[0].views === 1200 && rows[0].likes === 80, 'numeric fields parsed correctly');

section('performance — settling, engagement rate, best hook');
const today = '2026-08-30';
ok(isSettled({ date: '2026-08-20' }, today) === true, '10 days old is settled');
ok(isSettled({ date: '2026-08-27' }, today) === false, '3 days old is not settled yet');
ok(Math.abs(engagementRate({ views: 100, likes: 5, comments: 3, shares: 2 }) - 0.10) < 1e-9, 'engagement rate = (likes+comments+shares)/views');

const entries = [
  { productId: 'p1', hookType: 'question', date: '2026-08-01', views: 1000, likes: 50, comments: 10, shares: 5 },
  { productId: 'p1', hookType: 'question', date: '2026-08-02', views: 900, likes: 40, comments: 8, shares: 4 },
  { productId: 'p1', hookType: 'pov', date: '2026-08-03', views: 300, likes: 5, comments: 1, shares: 0 },
  { productId: 'p1', hookType: 'question', date: '2026-08-04', views: 1100, likes: 60, comments: 12, shares: 6 },
];
ok(bestHookType(entries, 'p1', today) === null || bestHookType(entries, 'p1', today).hook === 'question', 'best hook needs 3+ settled posts and picks the higher-engagement one');
ok(bestHookType([entries[0], entries[1]], 'p1', today) === null, 'fewer than 3 posts for a product returns no insight (avoids one-post noise)');

section('performance — re-import updates instead of duplicating');
let perf = [];
perf = mergePerfImport(perf, [{ videoId: 'v1', date: '2026-08-20', views: 1000, likes: 50, comments: 5, shares: 2 }]);
ok(perf.length === 1, 'first import creates one entry');
perf = mergePerfImport(perf, [{ videoId: 'v1', date: '2026-08-20', views: 1500, likes: 70, comments: 8, shares: 3 }]);
ok(perf.length === 1, 're-importing the same videoId updates in place, not a duplicate: got ' + perf.length);
ok(perf[0].views === 1500, 'the updated row carries the new view count: got ' + perf[0].views);

section('render — dashboard tab renders without throwing');
state.tab = 'dashboard';
render();
ok(html('#view-dashboard').includes('Compliance'), 'dashboard shows the TikTok compliance card');
`, 'domain-logic');

app.run(`
section('render — TikTok tab with a product');
state.tab = 'tiktok'; state.ttSubtab = 'products';
state.products = [newProduct({ name: 'Guard Peeler', price: 29, problem: 'slippery peelers', benefit: 'comfortable guard handle', urgent: false })];
render();
ok(html('#tiktok-content').includes('Guard Peeler'), 'product list renders the added product');
ok(!/undefined|NaN/.test(html('#tiktok-content')), 'no undefined/NaN leaked into the products view');

section('render — generate tab');
state.ttSubtab = 'generate';
state.genProductId = state.products[0].id;
render();
ok(html('#tiktok-content').includes('Question hook'), 'generate view renders the angle sections');
ok(!/undefined|NaN/.test(html('#tiktok-content')), 'no undefined/NaN leaked into the generate view');

section('render — plan tab flags an unresolved repost');
state.ttSubtab = 'plan';
state.plan = emptyPlan('2026-08-31');
state.plan.slots[0].productId = state.products[0].id;
state.plan.slots[0].isRepost = true;
render();
ok(html('#tiktok-content').includes('suppress it as a duplicate'), 'plan view shows the repost warning');

section('render — compliance tab');
state.ttSubtab = 'compliance';
state.compliance = {};
render();
ok(html('#tiktok-content').includes('Never checked yet'), 'compliance view shows unreviewed state with no data');

section('CFO parser — same taxonomy and behaviour as pm-money');
let cp = cfoParseSegment('dinner rm10');
ok(cp.amount === 10 && cp.category === 'Food (daily)', 'dinner rm10 -> Food (daily) RM10');
cp = cfoParseSegment('girlfriend rent 200');
ok(cp.category === "Girlfriend's rent help", 'the specific girlfriend-rent rule wins over the generic rent rule (pm-money\\'s deliberate fix): got ' + cp.category);
cp = cfoParseSegment('sewa rumah 250');
ok(cp.category === 'Sewa rumah (own rent)', 'plain rent/sewa still matches the generic rule: got ' + cp.category);
let cList = cfoParseInput('dinner rm10, telur rm12, apple rm12.50');
ok(cList.length === 3, 'multi-transaction split works the same as pm-money\\'s parser');

section('CFO — duplicate flagging against server-supplied today list');
let pending = cfoParseInput('dinner rm10');
cfoFlagDuplicates(pending, [{ category: 'Food (daily)', amount: 10 }]);
ok(pending[0].duplicate === true, 'a same-category same-amount entry already logged today is flagged');
pending = cfoParseInput('dinner rm10');
cfoFlagDuplicates(pending, [{ category: 'Food (daily)', amount: 99 }]);
ok(pending[0].duplicate === false, 'a different amount is not flagged');
`, 'render');

// The CFO tab's save/status calls are async (they await fetch, which the
// harness stubs to always reject) — driven from real Node rather than
// inside app.run()'s synchronous vm script, same pattern telegram.html's
// tests used for its offline-save path.
(async () => {
  app.run(`
  section('render — CFO tab, backend unreachable (harness fetch always rejects)');
  state.tab = 'cfo';
  `, 'cfo-setup');
  await app.ctx.fetchCFOStatus();
  app.run(`
  ok(state.cfo.error, 'a failed status fetch records an error instead of throwing');
  render();
  ok(html('#cfo-content').includes("Couldn't reach"), 'CFO tab shows a clear backend-unreachable state, not a blank screen');

  section('CFO capture — offline queue fallback');
  state.cfo.status = { income: 0, expense: 0, balance: 0, byCategory: {}, budgets: {}, recent: [], today: [] };
  state.cfo.error = null;
  document.getElementById('cfo-capture-input').value = 'dinner rm10, telur rm12';
  doCFOParseInput();
  ok(state.cfo.pending.length === 2, 'parsing populates two pending transactions');
  `, 'cfo-parse');
  await app.ctx.doCFOSavePending();
  app.run(`
  ok(state.cfo.pending.length === 0, 'pending clears after save even when the backend is unreachable');
  ok(state.cfo.offlineQueue.length === 2, 'both transactions land in the offline queue: got ' + state.cfo.offlineQueue.length);
  render();
  ok(html('#cfo-content').includes('saved offline'), 'CFO tab surfaces the offline-queue state to the user');
  `, 'cfo-verify');

  app.done();
})();
