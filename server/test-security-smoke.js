'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.PROCUREMENT_DB_HOST = '127.0.0.1';
process.env.PROCUREMENT_DB_USER = 'test_user';
process.env.PROCUREMENT_DB_PASSWORD = 'local_test_only';
process.env.PROCUREMENT_DB_NAME = 'test_db';
process.env.PROCUREMENT_JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.GATEWAY_MODE = 'true';
process.env.AUTO_MIGRATE = 'false';
const router = require('./routes/procurement');
const gateway = require('./index');
assert.equal(gateway.router, router);
const routes = router.stack.filter(x => x.route).map(x => x.route);
assert.equal(routes.length, 16);
for (const route of routes) {
  const hasAuth = route.stack.some(x => x.handle === router.authenticateToken);
  assert.equal(hasAuth, route.path !== '/login', route.path);
}
for (const route of routes.filter(x => /^\/(users|workgroup|department|category)/.test(x.path))) {
  assert(route.stack.some(x => x.handle === router.requireAdmin), route.path);
}
const deletion = routes.find(x => x.path === '/procurements/:id' && x.methods.delete);
assert(deletion.stack.some(x => x.handle === router.requireAdmin));
const valid = router.generateToken({id:'u1',username:'test',role:'USER'});
assert(router.verifyToken(valid));
assert.equal(router.verifyToken(valid + 'x'), null);
console.log('Procurement auth and Gateway smoke checks passed');
