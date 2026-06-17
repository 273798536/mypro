const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/mac/pro/solo/workspaces/y13314';
const configPath = path.join(projectRoot, 'tsconfig.json');

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectRoot
);

const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const emitResult = program.emit();

const allDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

const errors = [];
const warnings = [];

allDiagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const fileName = path.relative(projectRoot, diagnostic.file.fileName);
    const entry = {
      file: fileName,
      line: line + 1,
      character: character + 1,
      message,
      code: diagnostic.code
    };
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(entry);
    } else {
      warnings.push(entry);
    }
  } else {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const entry = { message, code: diagnostic.code };
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(entry);
    } else {
      warnings.push(entry);
    }
  }
});

const result = {
  errors,
  warnings,
  errorCount: errors.length,
  warningCount: warnings.length,
  exitCode: emitResult.emitSkipped ? 1 : 0
};

console.log(JSON.stringify(result, null, 2));

const outputPath = '/tmp/ts-check-result.json';
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\nResults written to: ${outputPath}`);
