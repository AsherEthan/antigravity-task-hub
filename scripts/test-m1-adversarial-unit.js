// scripts/test-m1-adversarial-unit.js
/**
 * Challenger 1 Adversarial Unit & Stress Test
 * Testing detectException and classifyClipboardContent in services/context-manager.js
 */

const { detectException, classifyClipboardContent } = require('../services/context-manager');
const { performance } = require('perf_hooks');

console.log('=== STARTING CONTEXT-MANAGER ADVERSARIAL TESTS ===\n');

let passCount = 0;
let failCount = 0;

function check(title, condition, extraInfo = '') {
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${title}`);
  } else {
    failCount++;
    console.error(`  ✗ [FAIL] ${title} ${extraInfo ? '-> ' + extraInfo : ''}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Python Tracebacks (Standard, Chained, Syntax, 3.11+ frames)
// -----------------------------------------------------------------------------
console.log('--- 1. Python Tracebacks ---');

const pyStandard = `
Traceback (most recent call last):
  File "/opt/app/handlers/auth.py", line 42, in authenticate_user
    user = db.query(User).filter_by(token=token).one()
  File "/opt/venv/lib/python3.10/site-packages/sqlalchemy/orm/query.py", line 2843, in one
    return self._iter().one()
sqlalchemy.orm.exc.NoResultFound: No row was found when one was required
`;
const pyStdRes = detectException(pyStandard);
check('Python standard traceback detected as exception', pyStdRes.isException === true);
check('Python standard traceback hasStack is true', pyStdRes.hasStack === true);

const pyChained = `
Traceback (most recent call last):
  File "main.py", line 15, in get_data
    return fetch_remote()
  File "main.py", line 8, in fetch_remote
    raise ConnectionResetError("Connection lost")
ConnectionResetError: Connection lost

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "runner.py", line 50, in <module>
    get_data()
RuntimeError: Failed to process request
`;
const pyChainedRes = detectException(pyChained);
check('Python chained traceback detected', pyChainedRes.isException === true);
check('Python chained traceback hasStack', pyChainedRes.hasStack === true);

const pySyntax = `
  File "calc.py", line 12
    def compute(a, b
                   ^
SyntaxError: unexpected EOF while parsing
`;
const pySyntaxRes = detectException(pySyntax);
check('Python syntax error detected', pySyntaxRes.isException === true);
check('Python syntax error classified as error', classifyClipboardContent(pySyntax).type === 'error');

// -----------------------------------------------------------------------------
// 2. Java / Kotlin Nested Exceptions & Stack Traces
// -----------------------------------------------------------------------------
console.log('\n--- 2. Java / Kotlin Nested Exceptions ---');

const javaStandardTab = `
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "s" is null
\tat com.example.app.Service.process(Service.java:34)
\tat com.example.app.Main.main(Main.java:12)
`;
const javaTabRes = detectException(javaStandardTab);
check('Java standard tab-indented traceback detected', javaTabRes.isException === true);
check('Java standard tab-indented hasStack', javaTabRes.hasStack === true);

const javaSpaces = `
org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'dataSource'
    at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.initializeBean(AbstractAutowireCapableBeanFactory.java:1804)
    at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.doCreateBean(AbstractAutowireCapableBeanFactory.java:600)
Caused by: java.sql.SQLException: Access denied for user 'root'@'localhost'
    at com.mysql.cj.jdbc.exceptions.SQLError.createSQLException(SQLError.java:129)
    at com.mysql.cj.jdbc.exceptions.SQLExceptionsMapping.translateException(SQLExceptionsMapping.java:122)
`;
const javaSpacesRes = detectException(javaSpaces);
check('Java 4-space indented nested exception detected', javaSpacesRes.isException === true, JSON.stringify(javaSpacesRes));
check('Java 4-space indented nested hasStack', javaSpacesRes.hasStack === true, JSON.stringify(javaSpacesRes));

const kotlinTrace = `
java.lang.IllegalStateException: Required value was null.
\tat com.example.domain.UserUseCase.invoke(UserUseCase.kt:28)
\tat com.example.presentation.UserViewModel$load$1.invokeSuspend(UserViewModel.kt:45)
`;
const kotlinRes = detectException(kotlinTrace);
check('Kotlin traceback detected', kotlinRes.isException === true);
check('Kotlin traceback hasStack', kotlinRes.hasStack === true);

// -----------------------------------------------------------------------------
// 3. Go Panics & Runtime Errors
// -----------------------------------------------------------------------------
console.log('\n--- 3. Go Panics & Runtime Dumps ---');

const goPanic = `
panic: runtime error: index out of range [5] with length 3

goroutine 1 [running]:
main.processItems(0xc0000a4000, 0x3, 0x3)
\t/home/user/go/src/app/main.go:24 +0x85
main.main()
\t/home/user/go/src/app/main.go:10 +0x3a
`;
const goRes = detectException(goPanic);
check('Go panic dump detected as exception', goRes.isException === true);
check('Go panic dump hasStack is true', goRes.hasStack === true);

const goFatal = `
fatal error: concurrent map read and map write

goroutine 42 [running]:
runtime.throw({0x4b78c9?, 0xc0000a8000?})
\t/usr/local/go/src/runtime/panic.go:1047 +0x5d fp=0xc0000ce748 sp=0xc0000ce718 pc=0x43527d
`;
const goFatalRes = detectException(goFatal);
check('Go fatal error detected', goFatalRes.isException === true);
check('Go fatal error hasStack', goFatalRes.hasStack === true);

// -----------------------------------------------------------------------------
// 4. Adversarial Strings: Binary, Corrupted, Unicode, Boundary lengths
// -----------------------------------------------------------------------------
console.log('\n--- 4. Adversarial Strings: Binary, Corrupted, Unicode, Bounds ---');

const emptyStr = '';
const emptyRes = detectException(emptyStr);
check('Empty string returns isException=false', emptyRes.isException === false && emptyRes.hasStack === false);

const whitespaceOnly = '   \t\r\n   ';
const whiteRes = detectException(whitespaceOnly);
check('Whitespace-only string returns isException=false', whiteRes.isException === false && whiteRes.hasStack === false);

const shortStr = 'Err:';
const shortRes = detectException(shortStr);
check('Short string (< 5 chars) safely returns false', shortRes.isException === false);

const nonStringInputs = [null, undefined, 12345, {}, [], true];
let nonStringPassed = true;
for (const input of nonStringInputs) {
  try {
    const res = detectException(input);
    if (res.isException !== false) nonStringPassed = false;
  } catch (e) {
    nonStringPassed = false;
  }
}
check('Non-string inputs handled safely without throwing', nonStringPassed);

const binaryGarbage = '\x00\x01\x02\xFF\xFE\xFD\x80\x90\xAA\xBB\x00\x00' + Buffer.from('corrupted_memory_dump').toString('base64');
const binRes = detectException(binaryGarbage);
check('Binary garbage does not crash and returns boolean', typeof binRes.isException === 'boolean');

const unicodeExtreme = '🔥🚨💥 这是一个严重的系统故障！发生于线程 42。无法连接到远程服务 👾 ありがとうございます مرحبا بالعالم';
const uniRes = detectException(unicodeExtreme);
check('Unicode-heavy text safely processed', typeof uniRes.isException === 'boolean');
const uniClassify = classifyClipboardContent(unicodeExtreme);
check('Unicode-heavy text classified as text', uniClassify.type === 'text');

// -----------------------------------------------------------------------------
// 5. 100k Large Strings & ReDoS / Catastrophic Backtracking Stress
// -----------------------------------------------------------------------------
console.log('\n--- 5. 100k Large Strings & Performance / ReDoS Stress ---');

const largePlain = 'const x = 123;\nconsole.log(x);\n'.repeat(3500); // ~110k chars
console.log(`  Testing 100k length code (${largePlain.length} chars)...`);
const t0 = performance.now();
const largeClassify = classifyClipboardContent(largePlain);
const dur1 = performance.now() - t0;
check(`100k code classified within 200ms (took ${dur1.toFixed(2)}ms)`, dur1 < 200);
check('100k code correctly identified as code', largeClassify.type === 'code');

// 100k string with error at the very end
const largeWithErrorAtEnd = 'Line of normal log data here without any error.\n'.repeat(2200) + 'Error: Out of memory during heap expansion';
const t1 = performance.now();
const largeErrRes = detectException(largeWithErrorAtEnd);
const dur2 = performance.now() - t1;
check(`100k string with error at end detected within 200ms (took ${dur2.toFixed(2)}ms)`, dur2 < 200);
check('100k string error detected', largeErrRes.isException === true);

// Regex Backtracking Bait: unclosed tag with tons of attributes
// e.g. <div a="1" a="2" ... (100,000 chars)
const redosBait = '<div ' + 'data-prop="adversarial-payload" '.repeat(3500); // ~108k chars without closing tag
console.log(`  Testing potential ReDoS bait (<div ... unclosed, ${redosBait.length} chars)...`);
const t2 = performance.now();
const redosClassify = classifyClipboardContent(redosBait);
const dur3 = performance.now() - t2;
check(`ReDoS unclosed tag bait resolved within 300ms (took ${dur3.toFixed(2)}ms)`, dur3 < 300);

// Repetitive braces bait: { { { ... (50,000 braces)
const braceBait = '{'.repeat(50000) + 'x'.repeat(10) + '}'.repeat(1);
const t3 = performance.now();
const braceClassify = classifyClipboardContent(braceBait);
const dur4 = performance.now() - t3;
check(`Brace bait resolved within 300ms (took ${dur4.toFixed(2)}ms)`, dur4 < 300);

console.log(`\n=================================================`);
console.log(`Adversarial Unit Test Result: ${passCount} Passed, ${failCount} Failed`);
console.log(`=================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
