import test from 'ava';
import pinkiePromise from 'pinkie-promise';
import util from 'util';
import pify from './';

global.Promise = pinkiePromise;

function FixtureParent () {}
Fixture.prototype.parentMethod = function (cb) { setImmediate(() => cb(null, this.spongebob)) }

function Fixture () {}
Fixture.prototype.spongebob = 'squarepants'
Fixture.prototype.methodSync = () => 'unicorn'
Fixture.prototype.method1 = cb => setImmediate(() => cb(null, 'unicorn'));
Fixture.prototype.method2 = (x, cb) => setImmediate(() => cb(null, x));
Fixture.prototype.method3 = cb => setImmediate(() => cb(null));
Fixture.prototype.method4 = function (cb) { setImmediate(() => this.method1(cb)) }
Fixture.prototype.method5 = function (cb) { setImmediate(() => cb(null, this.spongebob)) }

util.inherits(Fixture, FixtureParent)

const pifyd = pify(new Fixture());

test('fails with no prototype', async t => {
	t.throws(() => pify(Object.create(null)))
});

test('main', async t => {
	t.is(typeof pifyd.method1().then, 'function');
	t.is(await pifyd.method1(), 'unicorn');
});

test('pass argument', async t => {
	t.is(await pifyd.method2('rainbow'), 'rainbow');
});

test('includes parent prototype', async t => {
	t.is(await pifyd.parentMethod(), 'squarepants')
})

test('custom Promise module', async t => {
	t.is(await pify(new Fixture(), pinkiePromise).method1(), 'unicorn');
});

test('doesn\'t transform *Sync methods by default', t => {
	t.is(pifyd.methodSync(), 'unicorn');
});

test('ensures execution context is original obj when included', async t => {
	t.is(await pifyd.method4(), 'unicorn')
});

test('ensures execution context is original obj when excluded', async t => {
	const pifyd = pify(new Fixture(), {
		exclude: ['method5']
	});

	pifyd.method5((err, spongebob) => t.is(spongebob, 'squarepants'))
});

test('preserves own properties', t => {
	const inst = new Fixture()
	inst.prop = 1
	t.is(pify(inst).prop, 1)
})

test('transforms only members in options.include', t => {
	const pifyd = pify(new Fixture(), {
		include: ['method1', 'method2']
	});

	t.is(typeof pifyd.method1().then, 'function');
	t.is(typeof pifyd.method2(123).then, 'function');
	t.not(typeof pifyd.method3(() => {}), 'function');
});

test('doesn\'t transform members in options.exclude', t => {
	const pifyd = pify(new Fixture(), {
		exclude: ['method3']
	});

	t.is(typeof pifyd.method1().then, 'function');
	t.is(typeof pifyd.method2(123).then, 'function');
	t.not(typeof pifyd.method3(() => {}).then, 'function');
});

test('options.include over options.exclude', t => {
	const pifyd = pify(new Fixture(), {
		include: ['method1', 'method2'],
		exclude: ['method2', 'method3']
	});

	t.is(typeof pifyd.method1().then, 'function');
	t.is(typeof pifyd.method2(123).then, 'function');
	t.not(typeof pifyd.method3(() => {}).then, 'function');
});

test('preserves non-function members', t => {
	const module = Object.create({
		method: function () {},
		nonMethod: 3
	});

	t.deepEqual(
		Object.keys(Object.getPrototypeOf(module)),
		Object.keys(Object.getPrototypeOf(pify(module)))
	);
});
