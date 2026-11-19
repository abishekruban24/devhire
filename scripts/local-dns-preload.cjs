/* eslint-disable @typescript-eslint/no-require-imports */
// Local development test preload only (external to application src code)
// Enables local CLI tests on mobile hotspot networks without touching application code.
const dns = require("node:dns");
const resolver = new dns.promises.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === "function") {
    cb = options;
    opts = {};
  }
  originalLookup(hostname, opts, async (err, address, family) => {
    if (err && (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED" || err.message?.includes("refused"))) {
      try {
        const addrs = await resolver.resolve4(hostname);
        if (addrs && addrs.length > 0) {
          if (opts && typeof opts === "object" && opts.all) {
            return cb(null, addrs.map((a) => ({ address: a, family: 4 })));
          }
          return cb(null, addrs[0], 4);
        }
      } catch {
        // Fall back to original error
      }
    }
    return cb(err, address, family);
  });
};
