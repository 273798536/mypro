const { Readable } = require('stream');
const app = require('../src/server');

function makeRequest(method, path, options = {}) {
  return new Promise((resolve) => {
    const headers = {
      'content-type': 'application/json',
      ...options.headers
    };

    const body = options.body ? JSON.stringify(options.body) : null;

    const req = new Readable({
      read() {
        if (body) {
          this.push(body);
        }
        this.push(null);
      }
    });

    req.method = method;
    req.url = path;
    req.headers = headers;
    req.body = options.body;

    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(key, value) {
        this.headers[key] = value;
      },
      getHeader(key) {
        return this.headers[key];
      },
      json(data) {
        this.body = JSON.stringify(data);
        this.headers['content-type'] = 'application/json';
        resolve(this);
      },
      send(data) {
        if (typeof data === 'object') {
          this.body = JSON.stringify(data);
          this.headers['content-type'] = 'application/json';
        } else {
          this.body = data;
        }
        resolve(this);
      },
      end(data) {
        if (data) {
          if (typeof data === 'object') {
            this.body = JSON.stringify(data);
          } else {
            this.body = data;
          }
        }
        resolve(this);
      },
      write(data) {
        this.body = (this.body || '') + data;
      }
    };

    app(req, res, (err) => {
      if (err) {
        res.statusCode = 500;
        res.body = JSON.stringify({ error: err.message });
        resolve(res);
      }
    });
  });
}

const method = process.argv[2] || 'GET';
const path = process.argv[3] || '/api/health';
const bodyStr = process.argv[4];

async function main() {
  console.log(`\n${method} ${path}`);
  if (bodyStr) {
    console.log(`Body: ${bodyStr}`);
  }
  console.log('-'.repeat(50));

  const options = {};
  if (bodyStr) {
    try {
      options.body = JSON.parse(bodyStr);
    } catch (e) {
      console.error('JSON解析错误:', e.message);
      process.exit(1);
    }
  }

  if (process.env.TOKEN) {
    options.headers = { 'Authorization': `Bearer ${process.env.TOKEN}` };
  }

  const response = await makeRequest(method, path, options);
  
  console.log(`Status: ${response.statusCode}`);
  console.log('Response:');
  try {
    const parsed = JSON.parse(response.body);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log(response.body);
  }
  console.log('');
}

if (require.main === module) {
  main();
}

module.exports = { makeRequest };
