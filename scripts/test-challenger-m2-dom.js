/**
 * scripts/test-challenger-m2-dom.js
 * 
 * Headless Electron DOM verification of HUD and Index views
 * for Milestone M2 Challenger 2: UI De-bloat & Zero Residual Gamification Text.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const store = require('../services/store');
const stateEngine = require('../services/state-engine');
const aiAdvisor = require('../services/ai-advisor');

const forbiddenRegexes = [
  { name: '/combo\\s*streak/i', re: /combo\s*streak/i },
  { name: '/\\+?\\d+\\s*XP/i', re: /\+?\d+\s*XP/i },
  { name: '/\\bXP\\s*(奖励|加成|\\+)/i', re: /\bXP\s*(奖励|加成|\+)/i },
  { name: '/怪物\\s*(扣血|血量|HP)/i', re: /怪物\s*(扣血|血量|HP)/i },
  { name: '/段位\\s*(提升|晋阶)/i', re: /段位\s*(提升|晋阶)/i },
  { name: '/猎人段位/i', re: /猎人段位/i },
  { name: '/解构先锋/i', re: /解构先锋/i }
];

let passCount = 0;
let failCount = 0;
const failures = [];

function checkText(sourceName, text) {
  const matches = [];
  for (const { name, re } of forbiddenRegexes) {
    if (re.test(text)) {
      const match = text.match(re);
      matches.push({ pattern: name, match: match ? match[0] : '' });
    }
  }
  return matches;
}

function recordResult(name, passed, detail = '') {
  if (passed) {
    passCount++;
    console.log(`  ✓ [PASS] ${name} ${detail ? `(${detail})` : ''}`);
  } else {
    failCount++;
    failures.push({ name, detail });
    console.error(`  ✗ [FAIL] ${name} ${detail ? `(${detail})` : ''}`);
  }
}

function registerHandlers() {
  ipcMain.handle('get-state', () => {
    const activeProj = store.getActiveProject();
    const evaluation = stateEngine.evaluateSystemState(activeProj, store.data.playerProfile);
    const nextBounty = stateEngine.recommendNextBounty(activeProj);
    return {
      ...store.data,
      activeProject: activeProj,
      evaluation,
      nextBounty
    };
  });

  ipcMain.handle('save-state', (event, newData) => {
    store.saveData(newData);
    return true;
  });

  ipcMain.handle('add-clue', (event, clue) => {
    return store.addClue(clue);
  });

  ipcMain.handle('complete-action', () => {
    return store.completeAction();
  });

  ipcMain.handle('toggle-equip-relic', (event, relicId) => {
    return store.toggleEquipRelic(relicId);
  });

  ipcMain.handle('cast-lens', async (event, { lensKey, clueContext }) => {
    return await aiAdvisor.castLens(lensKey, clueContext, store.data.userSettings);
  });

  ipcMain.handle('update-cockpit', (event, updates) => {
    return store.updateCockpit(updates);
  });

  ipcMain.handle('switch-project', (event, projectId) => {
    store.data.activeProjectId = projectId;
    return true;
  });

  ipcMain.handle('create-project', (event, { title, description }) => {
    return { id: 'test_proj' };
  });

  ipcMain.on('toggle-hud', () => {});
  ipcMain.on('toggle-war-room', () => {});
  ipcMain.on('minimize-window', () => {});
  ipcMain.on('maximize-window', () => {});
  ipcMain.on('close-window', () => {});
}

app.whenReady().then(async () => {
  console.log('\n================================================================');
  console.log('  CHALLENGER 2: Headless DOM Gamification Verification Suite   ');
  console.log('================================================================');

  registerHandlers();

  // 1. Audit HUD Window DOM
  console.log('\n--- 1. HUD View Headless DOM Audit (renderer/hud.html) ---');
  const hudWin = new BrowserWindow({
    show: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true
    }
  });

  await hudWin.loadFile(path.join(__dirname, '..', 'renderer', 'hud.html'));
  await new Promise(r => setTimeout(r, 600));

  const hudDom = await hudWin.webContents.executeJavaScript(`({
    innerText: document.body.innerText,
    innerHTML: document.body.innerHTML
  })`);

  const hudInnerTextMatches = checkText('HUD innerText', hudDom.innerText);
  recordResult(
    'HUD rendered innerText has 0 gamification text matches',
    hudInnerTextMatches.length === 0,
    hudInnerTextMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  const hudInnerHTMLMatches = checkText('HUD innerHTML', hudDom.innerHTML);
  recordResult(
    'HUD rendered innerHTML has 0 gamification text matches',
    hudInnerHTMLMatches.length === 0,
    hudInnerHTMLMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  // Dynamic bounty completion in HUD
  await hudWin.webContents.executeJavaScript(`completeBounty()`);
  await new Promise(r => setTimeout(r, 500));

  const hudDynamicDom = await hudWin.webContents.executeJavaScript(`document.body.innerText`);
  const hudDynamicMatches = checkText('HUD dynamic innerText', hudDynamicDom);
  recordResult(
    'HUD dynamic DOM after completeBounty() has 0 gamification text matches',
    hudDynamicMatches.length === 0,
    hudDynamicMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  // 2. Audit War Room (Index) Window DOM
  console.log('\n--- 2. War Room View Headless DOM Audit (renderer/index.html) ---');
  const indexWin = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true
    }
  });

  await indexWin.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 800));

  const indexDom = await indexWin.webContents.executeJavaScript(`({
    innerText: document.body.innerText,
    innerHTML: document.body.innerHTML
  })`);

  const indexInnerTextMatches = checkText('Index innerText (Initial)', indexDom.innerText);
  recordResult(
    'Index rendered innerText (Initial) has 0 gamification text matches',
    indexInnerTextMatches.length === 0,
    indexInnerTextMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  const indexInnerHTMLMatches = checkText('Index innerHTML (Initial)', indexDom.innerHTML);
  recordResult(
    'Index rendered innerHTML (Initial) has 0 gamification text matches',
    indexInnerHTMLMatches.length === 0,
    indexInnerHTMLMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  // 3. Test Modals: Open skillTree modal (triggered by clicking header Pod)
  console.log('\n--- 3. Index Modal Audits (skillTreeModal & commandPalette) ---');
  await indexWin.webContents.executeJavaScript(`
    if (window.skillTree && typeof window.skillTree.openModal === 'function') {
      window.skillTree.openModal();
    }
  `);
  await new Promise(r => setTimeout(r, 400));

  const skillTreeDom = await indexWin.webContents.executeJavaScript(`({
    innerText: document.getElementById('skillTreeModal')?.innerText || '',
    innerHTML: document.getElementById('skillTreeModal')?.innerHTML || ''
  })`);

  const skillTreeInnerMatches = checkText('skillTreeModal innerText', skillTreeDom.innerText);
  recordResult(
    'skillTreeModal rendered innerText has 0 gamification text matches',
    skillTreeInnerMatches.length === 0,
    skillTreeInnerMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  const skillTreeHtmlMatches = checkText('skillTreeModal innerHTML', skillTreeDom.innerHTML);
  recordResult(
    'skillTreeModal rendered innerHTML has 0 gamification text matches',
    skillTreeHtmlMatches.length === 0,
    skillTreeHtmlMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  // 4. Test Command Palette: Open command palette
  await indexWin.webContents.executeJavaScript(`
    if (window.skillTree && typeof window.skillTree.closeModal === 'function') {
      window.skillTree.closeModal();
    }
    if (window.commandPalette && typeof window.commandPalette.open === 'function') {
      window.commandPalette.open();
    }
  `);
  await new Promise(r => setTimeout(r, 400));

  const paletteDom = await indexWin.webContents.executeJavaScript(`({
    innerText: document.getElementById('commandPaletteModal')?.innerText || '',
    innerHTML: document.getElementById('commandPaletteModal')?.innerHTML || ''
  })`);

  const paletteInnerMatches = checkText('commandPaletteModal innerText', paletteDom.innerText);
  recordResult(
    'commandPaletteModal rendered innerText has 0 gamification text matches',
    paletteInnerMatches.length === 0,
    paletteInnerMatches.map(m => `${m.pattern}: "${m.match}"`).join(', ')
  );

  console.log('\n================================================================');
  console.log(`DOM Verification Summary: ${passCount} Passed, ${failCount} Failed`);
  if (failures.length > 0) {
    console.log('Failures detail:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
  }
  console.log('================================================================\n');

  app.exit(failCount === 0 ? 0 : 1);
});
