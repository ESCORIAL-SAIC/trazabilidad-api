// Publica el resultado de jest (reports/junit.xml de jest-junit) como check runs:
// - "Jest tests": resumen al estilo Cypress Cloud ("N specs: X passed, Y failed, Z skipped").
// - Un check por test ("<archivo> › <describe> › <test>"), para ver cada uno con su tilde en la PR.
// Se llama desde actions/github-script; si el token es de la GitHub App del CI,
// los checks aparecen sueltos (con el ícono de la app) y no agrupados bajo el workflow.

const fs = require('fs');

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : '';
};

const unescape = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

function parseJunit(xml) {
  const suites = [];
  const suiteRe = /<testsuite\s[^>]*>([\s\S]*?)<\/testsuite>|<testsuite\s[^>]*\/>/g;
  let s;
  while ((s = suiteRe.exec(xml))) {
    const open = s[0].match(/<testsuite\s[^>]*>/)[0];
    const body = s[1] ?? '';
    const cases = [];
    const caseRe = /<testcase\s[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let c;
    while ((c = caseRe.exec(body))) {
      const inner = c[1] ?? '';
      const failure = inner.match(/<(failure|error)[^>]*>([\s\S]*?)<\/\1>|<(failure|error)[^>]*\/>/);
      cases.push({
        describe: unescape(attr(c[0], 'classname')).trim(),
        name: unescape(attr(c[0], 'name')),
        failed: Boolean(failure),
        skipped: /<skipped/.test(inner),
        message: failure ? unescape(failure[2] ?? '').trim() : '',
      });
    }
    suites.push({
      file: unescape(attr(open, 'name')),
      time: Number(attr(open, 'time')) || 0,
      cases,
    });
  }
  return suites;
}

function resumen(suites) {
  const all = suites.flatMap((s) => s.cases);
  const failed = all.filter((c) => c.failed).length;
  const skipped = all.filter((c) => c.skipped).length;
  return { specs: suites.length, passed: all.length - failed - skipped, failed, skipped };
}

function markdown(suites, r) {
  const filas = suites.map((s) => {
    const f = s.cases.filter((c) => c.failed).length;
    const k = s.cases.filter((c) => c.skipped).length;
    const p = s.cases.length - f - k;
    return `| ${f ? '❌' : '✅'} \`${s.file}\` | ${p} | ${f} | ${k} | ${s.time.toFixed(1)}s |`;
  });
  return [
    `**${r.specs} specs**: ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`,
    '',
    '| Spec | Passed | Failed | Skipped | Tiempo |',
    '|---|---:|---:|---:|---:|',
    ...filas,
  ].join('\n');
}

function detalleFallas(suites) {
  const out = [];
  for (const s of suites) {
    for (const c of s.cases.filter((x) => x.failed)) {
      out.push(`### ❌ ${s.file} › ${c.name}\n\n\`\`\`\n${c.message.slice(0, 4000)}\n\`\`\``);
    }
  }
  return out.join('\n\n').slice(0, 65000);
}

// Nombre del check de cada test; GitHub muestra un solo check por nombre, así que
// los repetidos se numeran.
function nombresPorTest(suites) {
  const vistos = new Map();
  return suites.flatMap((s) =>
    s.cases.map((c) => {
      const archivo = s.file.split('/').pop().replace(/\.test\.ts$/, '');
      const base = [archivo, c.describe, c.name].filter(Boolean).join(' › ').slice(0, 180);
      const n = (vistos.get(base) ?? 0) + 1;
      vistos.set(base, n);
      return { suite: s, test: c, nombre: n > 1 ? `${base} (${n})` : base };
    }),
  );
}

// Crear >80 checks seguidos puede pegar contra el rate limit secundario de GitHub:
// en ese caso espera lo que indique retry-after y reintenta.
async function conReintento(fn, core) {
  for (let intento = 1; ; intento++) {
    try {
      return await fn();
    } catch (err) {
      const limite = (err.status === 403 || err.status === 429) && intento < 5;
      if (!limite) throw err;
      const h = err.response?.headers?.['retry-after'];
      const espera = h != null && !Number.isNaN(Number(h)) ? Number(h) : 60;
      core.info(`Rate limit de GitHub, reintento en ${espera}s`);
      await new Promise((r) => setTimeout(r, espera * 1000));
    }
  }
}

const lineaDelFallo = (file, message) => {
  const m = message.match(new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):`));
  return m ? Number(m[1]) : 1;
};

module.exports = async ({ github, context, core, path = 'reports/junit.xml', name = 'Jest tests', porTest = true }) => {
  const head_sha = context.payload.pull_request?.head.sha ?? context.sha;
  const { owner, repo } = context.repo;

  if (!fs.existsSync(path)) {
    await github.rest.checks.create({
      owner, repo, head_sha, name,
      status: 'completed',
      conclusion: 'failure',
      output: { title: 'No se generó el reporte de tests', summary: `No existe ${path}: falló el paso anterior (install/typecheck/jest).` },
    });
    return;
  }

  const suites = parseJunit(fs.readFileSync(path, 'utf8'));
  const r = resumen(suites);
  const annotations = suites
    .flatMap((s) => s.cases.filter((c) => c.failed).map((c) => {
      // Línea del test fallido según el stack trace ("<archivo>:<línea>:<col>").
      const line = lineaDelFallo(s.file, c.message);
      return {
        path: s.file,
        start_line: line,
        end_line: line,
        annotation_level: 'failure',
        title: c.name.slice(0, 255),
        message: c.message.slice(0, 2000) || 'Test fallido',
      };
    }))
    .slice(0, 50);

  const { data: check } = await github.rest.checks.create({
    owner, repo, head_sha, name,
    status: 'completed',
    conclusion: r.failed > 0 ? 'failure' : 'success',
    output: {
      title: `${r.specs} specs: ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`,
      summary: markdown(suites, r),
      text: detalleFallas(suites) || undefined,
      annotations,
    },
  });
  // Sin details_url, "Details" lleva a la homepage de la App; que abra el resumen del check.
  await github.rest.checks.update({ owner, repo, check_run_id: check.id, details_url: check.html_url });
  core.info(`Check "${name}": ${r.specs} specs, ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`);

  if (!porTest) return;
  for (const { suite, test, nombre } of nombresPorTest(suites)) {
    const conclusion = test.failed ? 'failure' : test.skipped ? 'skipped' : 'success';
    const line = lineaDelFallo(suite.file, test.message);
    await conReintento(() => github.rest.checks.create({
      owner, repo, head_sha,
      name: nombre,
      status: 'completed',
      conclusion,
      details_url: check.html_url, // Details abre el resumen "Jest tests"
      output: {
        title: test.failed ? 'Failed' : test.skipped ? 'Skipped' : 'Passed',
        summary: `\`${suite.file}\`${test.describe ? ` › ${test.describe}` : ''} › ${test.name}`,
        text: test.failed ? `\`\`\`\n${test.message.slice(0, 60000)}\n\`\`\`` : undefined,
        annotations: test.failed
          ? [{ path: suite.file, start_line: line, end_line: line, annotation_level: 'failure', title: test.name.slice(0, 255), message: test.message.slice(0, 2000) || 'Test fallido' }]
          : undefined,
      },
    }), core);
  }
  core.info(`Checks por test: ${r.passed + r.failed + r.skipped}`);
};

module.exports.parseJunit = parseJunit;
module.exports.resumen = resumen;
module.exports.nombresPorTest = nombresPorTest;
