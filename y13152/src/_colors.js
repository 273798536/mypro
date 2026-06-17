const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function wrap(code) {
  return function (text) {
    if (process.stdout && process.stdout.isTTY === false) {
      return String(text);
    }
    return code + String(text) + ANSI.reset;
  };
}

module.exports = {
  red: wrap(ANSI.red),
  green: wrap(ANSI.green),
  yellow: wrap(ANSI.yellow),
  cyan: wrap(ANSI.cyan),
  gray: wrap(ANSI.gray),
  bold: wrap(ANSI.bold)
};
