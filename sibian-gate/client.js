window.__ModuleLoader__.load({
  id: '@local/dsh-sibian-gate',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const STATE_ENDPOINT = 'api/sibian-gate/state'
    const TOGGLE_ENDPOINT = 'api/sibian-gate/toggle'

    const color = {
      text: 'var(--dsw-alias-label-primary)',
      muted: 'var(--dsw-alias-label-secondary)',
      border: 'var(--dsw-alias-border-l1)',
      card: 'var(--dsw-alias-bg-layer-1)',
      inset: 'var(--dsw-alias-bg-layer-2)',
      brand: 'var(--dsw-alias-brand-primary)',
      success: 'var(--dsw-alias-state-success-primary)',
      idle: 'var(--dsw-alias-state-idle-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
    }

    const listeners = new Set()
    let snapshot = { armed: false, loading: true, busy: false, error: null }
    let refreshing = null

    function emit() {
      for (const listener of listeners) listener()
    }

    function update(patch) {
      snapshot = { ...snapshot, ...patch }
      emit()
    }

    async function post(path) {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (body?.ok !== true) throw new Error('bad response')
      return body.value?.armed === true
    }

    function refresh() {
      if (refreshing) return refreshing
      refreshing = post(STATE_ENDPOINT)
        .then((armed) => update({ armed, loading: false, error: null }))
        .catch((error) =>
          update({ loading: false, error: String(error?.message || error) }),
        )
        .finally(() => {
          refreshing = null
        })
      return refreshing
    }

    async function toggle() {
      if (snapshot.busy) return
      update({ busy: true, error: null })
      try {
        const armed = await post(TOGGLE_ENDPOINT)
        update({ armed, busy: false, loading: false })
      } catch (error) {
        update({ busy: false, error: String(error?.message || error) })
      }
    }

    function useSnapshot() {
      const [, force] = React.useReducer((value) => value + 1, 0)
      React.useEffect(() => {
        const listener = () => force()
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }, [])
      return snapshot
    }

    function GateGlyph({ size = 18 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M3.5 5.5h17' }),
        h('path', { d: 'M6.5 5.5V20' }),
        h('path', { d: 'M17.5 5.5V20' }),
        h('path', { d: 'M9 20v-6.5h6V20' }),
      )
    }

    function StatusPill({ armed, loading }) {
      const active = armed === true
      return h(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: 12,
            lineHeight: 1.4,
            background: color.inset,
            color: active ? color.success : color.muted,
            whiteSpace: 'nowrap',
          },
        },
        h('span', {
          style: {
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: active ? color.success : color.idle,
          },
        }),
        loading ? '读取中…' : active ? '已开启' : '未开启',
      )
    }

    function Switch({ on, disabled, onToggle }) {
      const track = on ? color.brand : 'var(--dsw-alias-border-l2)'
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': on === true,
          'aria-label': on ? '关闭思辨开关' : '开启思辨开关',
          disabled,
          onClick: onToggle,
          style: {
            position: 'relative',
            flex: 'none',
            width: 46,
            height: 26,
            padding: 0,
            borderRadius: 13,
            border: `1px solid ${track}`,
            background: track,
            cursor: disabled ? 'wait' : 'pointer',
            opacity: disabled ? 0.7 : 1,
            transition: 'background 150ms ease, border-color 150ms ease',
          },
        },
        h('span', {
          style: {
            position: 'absolute',
            top: 3,
            left: on ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: color.card,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
            transition: 'left 150ms ease',
          },
        }),
      )
    }

    function QuestionRow({ index, label, text }) {
      return h(
        'div',
        {
          style: {
            display: 'flex',
            gap: 10,
            padding: '10px 0',
            borderTop: index === 0 ? 'none' : `1px solid ${color.border}`,
          },
        },
        h(
          'span',
          {
            style: {
              flex: 'none',
              width: 22,
              height: 22,
              marginTop: 1,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: color.inset,
              color: color.muted,
              fontSize: 12,
            },
          },
          String(index + 1),
        ),
        h(
          'div',
          { style: { minWidth: 0 } },
          h('div', { style: { fontWeight: 600, marginBottom: 2 } }, label),
          h('div', { style: { color: color.muted, fontSize: 13 } }, text),
        ),
      )
    }

    function GatePanel() {
      const state = useSnapshot()
      const { armed, busy, error, loading } = state

      const paragraph = { margin: '0 0 8px', color: color.muted, fontSize: 13 }

      return h(
        'div',
        {
          style: {
            height: '100%',
            overflowY: 'auto',
            background: 'var(--dsw-alias-bg-base)',
            color: color.text,
          },
        },
        h(
          'div',
          {
            style: {
              maxWidth: 760,
              margin: '0 auto',
              padding: '36px 28px 56px',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.65,
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h(
              'span',
              {
                style: {
                  flex: 'none',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: color.inset,
                  color: color.brand,
                },
              },
              h(GateGlyph, { size: 24 }),
            ),
            h(
              'div',
              { style: { flex: 1, minWidth: 0 } },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h(
                  'h1',
                  {
                    style: {
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                    },
                  },
                  '思辨开关',
                ),
                h(StatusPill, { armed, loading }),
              ),
              h(
                'div',
                { style: { color: color.muted, fontSize: 13, marginTop: 2 } },
                '每条指令动手之前，先停一下：为什么做、凭什么、还能怎么做。',
              ),
            ),
          ),

          h(
            'div',
            {
              style: {
                marginTop: 24,
                padding: '18px 20px',
                background: color.card,
                border: `1px solid ${color.border}`,
                borderRadius: 14,
              },
            },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 16 } },
              h(
                'div',
                { style: { flex: 1, minWidth: 0 } },
                h(
                  'div',
                  { style: { fontWeight: 600, fontSize: 15 } },
                  armed ? '门禁已生效' : '门禁已关闭',
                ),
                h(
                  'div',
                  { style: { color: color.muted, fontSize: 13, marginTop: 3 } },
                  armed
                    ? '所有会话的每条新指令都会被拦一次；子代理不拦。'
                    : '所有会话直接执行，不再拦问。',
                ),
              ),
              h(Switch, {
                on: armed,
                disabled: busy || loading,
                onToggle: toggle,
              }),
            ),
            error
              ? h(
                  'div',
                  {
                    style: {
                      marginTop: 12,
                      color: color.error,
                      fontSize: 12,
                      wordBreak: 'break-word',
                    },
                  },
                  `状态读写失败：${error}`,
                )
              : null,
          ),

          h(
            'h2',
            { style: { fontSize: 15, fontWeight: 600, margin: '28px 0 10px' } },
            '门会先问三个问题',
          ),
          h(
            'div',
            {
              style: {
                padding: '4px 20px',
                background: color.card,
                border: `1px solid ${color.border}`,
                borderRadius: 14,
              },
            },
            h(QuestionRow, {
              index: 0,
              label: '目的',
              text: '这件事要解决的真实问题是什么？不做会怎样？',
            }),
            h(QuestionRow, {
              index: 1,
              label: '依据',
              text: '凭什么相信这样做有效、必要？依据是实测、文献、他人说法，还是习惯？',
            }),
            h(QuestionRow, {
              index: 2,
              label: '替代',
              text: '还有哪条更省力或更可靠的路？为什么当前这条更好？',
            }),
          ),

          h(
            'h2',
            { style: { fontSize: 15, fontWeight: 600, margin: '28px 0 10px' } },
            '台账',
          ),
          h(
            'p',
            { style: paragraph },
            '放行之后，模型会把一张 5 行决策卡追加到当前工作区的 ',
            h(
              'code',
              {
                style: {
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: color.inset,
                  fontSize: 12,
                },
              },
              '思辨台账.md',
            ),
            '：',
          ),
          h(
            'ul',
            { style: { margin: 0, paddingLeft: 20, color: color.muted, fontSize: 13 } },
            [
              '日期与指令摘要',
              '确认后的真实目的',
              '关键依据与来源等级（实测 / 文献 / 他人 / AI / 直觉）',
              '被否决的替代方案及原因',
              '下一步与可证伪的检查点',
            ].map((text) =>
              h('li', { key: text, style: { margin: '4px 0' } }, text),
            ),
          ),

          h(
            'h2',
            { style: { fontSize: 15, fontWeight: 600, margin: '28px 0 10px' } },
            '边界',
          ),
          h(
            'ul',
            { style: { margin: 0, paddingLeft: 20, color: color.muted, fontSize: 13 } },
            h(
              'li',
              { style: { margin: '4px 0' } },
              '它是提醒，不是硬拦截：模型仍可能跳过；跳过会记在台账里。',
            ),
            h(
              'li',
              { style: { margin: '4px 0' } },
              '只做逻辑层反驳，不判断你的地磁导航结论对不对。',
            ),
            h(
              'li',
              { style: { margin: '4px 0' } },
              '关闭后立即失效；开关对所有会话生效。',
            ),
          ),

          h(
            'div',
            {
              style: {
                marginTop: 28,
                paddingTop: 16,
                borderTop: `1px solid ${color.border}`,
                color: color.muted,
                fontSize: 12,
              },
            },
            '插件只负责拦住；想不想、怎么想，仍然是你的事。',
          ),
        ),
      )
    }

    function SidebarIcon(props) {
      const state = useSnapshot()
      const size = typeof props?.size === 'number' ? props.size : 18
      return h(
        'span',
        {
          style: {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            lineHeight: 0,
          },
        },
        h(GateGlyph, { size }),
        state.armed
          ? h('span', {
              'aria-hidden': true,
              style: {
                position: 'absolute',
                top: -2,
                right: -2,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: color.success,
                boxShadow: '0 0 0 2px var(--dsw-specific-sidebar-fill)',
              },
            })
          : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        refresh()

        const onFocus = () => {
          if (typeof document === 'undefined' || !document.hidden) refresh()
        }
        if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onFocus)
        }
        ctx.effect(
          () => () => {
            if (typeof window !== 'undefined') {
              window.removeEventListener('focus', onFocus)
            }
            if (typeof document !== 'undefined') {
              document.removeEventListener('visibilitychange', onFocus)
            }
          },
          'sibian-gate: refresh on focus',
        )

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'sibian-gate',
              order: 25,
              label: '思辨开关',
            },
            SidebarIcon,
          ),
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: 'sibian-gate',
            },
            GatePanel,
          ),
        )
      },
    }
  },
})
