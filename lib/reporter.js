'use strict';

const roi = require('roi');
const log = require('./log-color');
const fs = require('fs');

module.exports = {
  jsonReport: jsonReporter,
  consoleReport: consoleReport,
  createFileReport: createFileReport,
  fileReport: fileReport,
  unused: unused,
  summary: summary
};

function flatResult (result) {
  let resultFlattened = result.reduce((a, b) => {
    return a.concat(b);
  }, []);
  return resultFlattened;
}

function declarationsOnly (resultFlattened) {
  let declarations = resultFlattened.map((m) => {
    return m.declaration;
  });
  return declarations;
}

function groupedResult (resultFlattened, declarations) {
  let grouped = resultFlattened.reduce((grouped, r) => {
    let key = '';
    declarations.forEach(d => {
      if (r.declaration === d) {
        key = d;
      }
    });

    grouped[key] = grouped[key] || [];
    grouped[key].push(r);
    return grouped;
  }, {});
  return grouped;
}

function header (str) {
  log.red('-'.repeat(70));
  log.red(str);
  log.red('-'.repeat(70));
}

function amountMap (grouped) {
  let amount = new Map();
  Object.keys(grouped).forEach(key => {
    amount.set(key, grouped[key].length);
  });
  return amount;
}

function logFileLines (grouped) {
  Object.keys(grouped).forEach(key => {
    log.red(key + ':');
    grouped[key].forEach(x => console.log(x.file.replace('//', '/') + ':' + x.line));
  });
}

function strFileLines (grouped) {
  let content = '';
  Object.keys(grouped).forEach(key => {
    content += key + ':\n';
    grouped[key].forEach(x => {
      content += x.file.replace('//', '/') + ':' + x.line + '\n';
    });
  });
  return content;
}

function unused (declarations, dependencies) {
  const unused = new Set();
  if (declarations.length) {
    dependencies.forEach(dependency => {
      declarations.forEach(declaration => {
        if (declaration) {
          if (declaration.toUpperCase().includes(dependency.toUpperCase())) {
            unused.add(dependency);
          }
        }
      });
    });
  } else {
    dependencies.forEach(dep => {
      unused.add(dep);
    });
  }
  const unusedArray = Array.from(unused);
  const diff = dependencies.filter(x => unusedArray.indexOf(x) < 0);
  return diff.length ? diff : 'None.';
}

function jsonReporter (result, dependencies) {
  const resultFlattened = flatResult(result);
  const declarations = declarationsOnly(resultFlattened);
  const grouped = groupedResult(resultFlattened, declarations);
  const amount = amountMap(grouped);
  const unusedDeps = unused(declarations, dependencies[0]);

  return {
    groups: grouped,
    dependencies: dependencies[0],
    devDependencies: dependencies[1],
    declarations: declarations,
    unused: unusedDeps,
    totals: amount
  };
}

function consoleReport (jsonReport, options) {
  options = options || {};
  header('[ Declaration and file lines ]');
  logFileLines(jsonReport.groups);
  header('[ Declaration and amount ]');

  for (let entry of jsonReport.totals.entries()) {
    console.log(entry[0] + ' --> ' + log.applyColor(entry[1]));
  }

  header('[ Unused dependencies ]');
  log.red(jsonReport.unused);

  if (jsonReport.devDependencies.length) {
    header('[ Dev dependencies ]');
    log.red(jsonReport.devDependencies);
  }

  if (options.license) {
    header('[ Licenses ]');
    jsonReport.dependencies.forEach(d => {
      const options = { 'endpoint': 'http://registry.npmjs.org/' + d };
      roi.get(options).then(x => {
        log.magenta(`${d} --> ${JSON.parse(x.body).license}`);
      });
    });
  }
}

function createFileReport (jsonReport, options) {
  options = options || {};
  let fileContent = '[ Declaration and file lines ]\n';
  fileContent += strFileLines(jsonReport.groups);
  fileContent += '\n[ Declaration and amount ]\n';

  for (let entry of jsonReport.totals.entries()) {
    fileContent += entry[0] + ' --> ' + '[' + entry[1] + ']\n';
  }

  fileContent += '\n[ Unused dependencies ]\n';
  fileContent += jsonReport.unused;

  if (jsonReport.devDependencies.length) {
    fileContent += '\n[ Dev dependencies ]\n';
    fileContent += jsonReport.devDependencies;
  }

  return fileContent;
}

function fileReport (jsonReport, options) {
  options = options || {};
  const fileContent = createFileReport(jsonReport, options);
  const filename = options.filename || 'szero.txt';
  fs.writeFileSync(filename, fileContent);
}

function summary (jsonReport, missing) {
  header('[ Unused dependencies ]');
  log.red(jsonReport.unused);

  header('[ Missing dependencies ]');
  if (missing.length) {
    log.red(missing);
  } else {
    log.red('None.');
  }
}
