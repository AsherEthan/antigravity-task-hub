const fs = require('fs');
const path = require('path');

const patterns = [
  { name: '/combo\\s*streak/i', re: /combo\s*streak/i },
  { name: '/\\+?\\d+\\s*XP/i', re: /\+?\d+\s*XP/i },
  { name: '/\\bXP\\s*(奖励|加成|\\+)/i', re: /\bXP\s*(奖励|加成|\+)/i },
  { name: '/怪物\\s*(扣血|血量|HP)/i', re: /怪物\s*(扣血|血量|HP)/i },
  { name: '/段位\\s*(提升|晋阶)/i', re: /段位\s*(提升|晋阶)/i },
  { name: '/猎人段位/i', re: /猎人段位/i },
  { name: '/解构先锋/i', re: /解构先锋/i }
];

const rendererDir = path.resolve(__dirname, '..', 'renderer');
const matches = [];

function checkAll(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      checkAll(full);
    } else if (/\.(html|js|css)$/i.test(f.name)) {
      const txt = fs.readFileSync(full, 'utf8');
      patterns.forEach(p => {
        const re = new RegExp(p.re.source, p.re.flags + (p.re.flags.includes('g') ? '' : 'g'));
        let match;
        while ((match = re.exec(txt)) !== null) {
          const lineNum = txt.substring(0, match.index).split('\n').length;
          matches.push({
            file: path.relative(rendererDir, full),
            lineNum,
            pattern: p.name,
            matchedText: match[0],
            lineSnippet: txt.split('\n')[lineNum - 1].trim()
          });
        }
      });
    }
  }
}

checkAll(rendererDir);
console.log(JSON.stringify(matches, null, 2));
console.log('Total matches count:', matches.length);
