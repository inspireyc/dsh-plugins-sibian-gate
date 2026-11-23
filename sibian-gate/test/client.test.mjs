import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'client.js'),
  'utf8',
)

function loadRegistration() {
  let registration
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(value) {
          registration = value
        },
      },
      addEventListener() {},
      removeEventListener() {},
    },
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener() {},
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ ok: true, value: { armed: false } }),
    }),
    console,
  }
  vm.runInNewContext(source, sandbox, { filename: 'client.js' })
  assert.ok(registration, 'client.js must call __ModuleLoader__.load')
  return registration
}

test('registers the sidebar entry and the main panel', () => {
  const registration = loadRegistration()
  assert.equal(registration.id, '@local/dsh-sibian-gate')

  const React = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useReducer: (_reducer, initial) => [initial, () => {}],
    useEffect: () => {},
  }
  const module = registration.factory((id) => {
    assert.equal(id, 'react')
    return React
  })
  assert.equal(module.inject.length, 1)
  assert.equal(module.inject[0], 'slots')

  const slots = []
  const ctx = {
    slots: {
      inject(_owner, callback) {
        return callback()
      },
      register(definition, component) {
        slots.push({ definition, component })
        return () => {}
      },
    },
    effect(fn) {
      return fn()
    },
  }
  module.apply(ctx)

  assert.equal(slots.length, 2)

  const [sidebar, panel] = slots
  assert.equal(sidebar.definition.name, 'sidebar.panellist')
  assert.equal(sidebar.definition.id, 'sibian-gate')
  assert.equal(sidebar.definition.order, 25)
  assert.equal(sidebar.definition.label, '思辨开关')

  assert.equal(panel.definition.name, 'main')
  assert.equal(panel.definition.key, 'sibian-gate')

  assert.equal(typeof sidebar.component, 'function')
  assert.equal(typeof panel.component, 'function')
})
