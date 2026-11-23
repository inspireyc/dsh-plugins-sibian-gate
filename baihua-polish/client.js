// @local/dsh-baihua-polish client half
// UI skeleton and widget styles mirror @local/dsh-sibian-gate (client.js),
// per the user's request to unify the two panels' look and feel.
window.__ModuleLoader__.load({
  id: '@local/dsh-baihua-polish',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ---------- theme tokens (same palette as sibian-gate) ----------
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

    // ---------- module store ----------
    const listeners = new Set()
    let snapshot = {
      armed: true,
      loading: true,
      busy: false,
      open: false,
      result: null,
      error: null,
      copied: false,
      copyError: false,
    }
    let refreshing = null

    function emit() {
      for (const listener of listeners) listener()
    }

    function update(patch) {
      snapshot = { ...snapshot, ...patch }
      emit()
    }

    async function post(path, body) {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
      })
      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }
      if (!response.ok) {
        throw new Error((data && data.error) || 'HTTP ' + response.status)
      }
      if (data?.ok !== true) throw new Error(data?.error || 'bad response')
      return data
    }

    function refresh() {
      if (refreshing) return refreshing
      refreshing = post('api/baihua-polish/state')
        .then((data) =>
          update({ armed: data.value?.armed !== false, loading: false, error: null }),
        )
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
        const data = await post('api/baihua-polish/toggle')
        update({ armed: data.value?.armed !== false, busy: false, loading: false })
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

    // ---------- shared widgets (mirroring sibian-gate) ----------
    function Glyph({ size = 18 }) {
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
        h('path', {
          d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H12l-4.2 3.2a.6.6 0 0 1-1-.47V16H6.5A2.5 2.5 0 0 1 4 13.5v-8Z',
        }),
        h('path', { d: 'M8 7.5h8M8 10.5h5' }),
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
          'aria-label': on ? '关闭白话润色' : '开启白话润色',
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

    // ---------- main panel ----------
    function BaihuaPanel() {
      const state = useSnapshot()
      const { armed, busy, error, loading } = state

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
              h(Glyph, { size: 24 }),
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
                  '白话润色',
                ),
                h(StatusPill, { armed, loading }),
              ),
              h(
                'div',
                { style: { color: color.muted, fontSize: 13, marginTop: 2 } },
                '每条回答右下角多一个「白话解释」按钮，点一下，看不懂的专业词就用大白话讲。',
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
                  armed ? '润色已生效' : '润色已关闭',
                ),
                h(
                  'div',
                  { style: { color: color.muted, fontSize: 13, marginTop: 3 } },
                  armed
                    ? '每条回答右下角会出现「白话解释」按钮；状态保存在本机，重启不丢。'
                    : '按钮不再工作；已经生成的结果不受影响。',
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
            '怎么用',
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
              label: '打开开关',
              text: '状态保存在本机，重启不丢；开关对所有会话生效。',
            }),
            h(QuestionRow, {
              index: 1,
              label: '点「白话解释」',
              text: '在你没看懂的那条回答右下角点一下。',
            }),
            h(QuestionRow, {
              index: 2,
              label: '看结果，可复制',
              text: '弹窗里是润色后的版本：术语第一次出现时用括号补一句大白话；数字、代码、编号原样保留。',
            }),
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
              '只润色你手动点的那一条消息；聊天、代码、数据不会被自动改动。',
            ),
            h(
              'li',
              { style: { margin: '4px 0' } },
              '润色只加解释、不改变结论；如果某条润色后意思变了，请把原文发给我。',
            ),
            h(
              'li',
              { style: { margin: '4px 0' } },
              '它是翻译，不是审稿：对不对、信不信，仍然由你判断。',
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
            '只负责把话说白；该不该信、怎么用，仍然是你的事。',
          ),
        ),
      )
    }

    // ---------- sidebar icon ----------
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
        h(Glyph, { size }),
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

    // ---------- message text extraction ----------
    function textOf(nodes, messageId) {
      if (!nodes || !messageId) return ''
      const node = nodes.find((n) => n && n.messageId === messageId)
      if (!node) return ''
      if (node.kind === 'assistant') {
        return (node.blocks || [])
          .filter((b) => b && b.kind === 'text')
          .map((b) => b.text)
          .join('\n')
      }
      if (node.content) {
        return (node.content || [])
          .map((b) => (b && typeof b.text === 'string' ? b.text : ''))
          .join('\n')
      }
      return ''
    }

    // ---------- chat-row action ----------
    function BaihuaAction({ messageId, useChat }) {
      const store = useSnapshot()
      const nodes = useChat((s) =>
        s && typeof s === 'object' && s.legacy ? s.legacy.nodes : undefined,
      )
      const run = async () => {
        if (store.busy) return
        if (!store.armed) {
          update({
            open: true,
            error: '白话润色开关还没打开：去左侧边栏点「白话润色」，把开关打开。',
          })
          return
        }
        const text = textOf(nodes, messageId)
        if (!text.trim()) {
          update({ open: true, error: '这条消息没有可润色的文字内容（可能只有代码或工具调用）。' })
          return
        }
        update({
          busy: true,
          open: true,
          error: null,
          result: null,
          copied: false,
          copyError: false,
        })
        try {
          const data = await post('api/baihua-polish/polish', { text })
          update({ busy: false, result: data.text })
        } catch (err) {
          update({ busy: false, error: String((err && err.message) || err) })
        }
      }
      return h(
        'button',
        {
          type: 'button',
          onClick: run,
          title: '把这条回答润色成大白话',
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            border: '1px solid var(--dsw-alias-border-l2)',
            borderRadius: 6,
            background: color.inset,
            color: color.muted,
            padding: '3px 8px',
            fontSize: 12,
          },
        },
        h(Glyph, { size: 12 }),
        h('span', {}, '白话解释'),
      )
    }

    // ---------- result overlay ----------
    function BaihuaOverlay() {
      const store = useSnapshot()
      if (!store.open) return null
      const close = () => update({ open: false })
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(store.result || '')
          update({ copied: true, copyError: false })
        } catch {
          update({ copyError: true })
        }
      }
      const copyLabel = store.copied
        ? '已复制'
        : store.copyError
          ? '复制失败，请手动选中复制'
          : '复制'
      return h(
        'div',
        {
          style: {
            pointerEvents: 'auto',
            position: 'fixed',
            right: 16,
            bottom: 16,
            width: 460,
            maxWidth: 'calc(100vw - 32px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: `1px solid ${color.border}`,
            borderRadius: 14,
            background: color.card,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
            padding: '14px 18px',
            zIndex: 999,
          },
        },
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            },
          },
          h(
            'span',
            {
              style: {
                ...{ color: color.text },
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              },
            },
            h(Glyph, { size: 14 }),
            '白话润色',
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 6 } },
            store.result
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: copy,
                    style: {
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 6px',
                      color: color.brand,
                    },
                  },
                  copyLabel,
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                onClick: close,
                style: {
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 6px',
                  color: color.muted,
                },
              },
              '关闭',
            ),
          ),
        ),
        h(
          'div',
          {
            style: {
              maxHeight: '60vh',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.65,
              color: color.text,
              fontSize: 13,
              borderTop: `1px solid ${color.border}`,
              paddingTop: 10,
            },
          },
          store.busy
            ? h('span', { style: { color: color.muted } }, '正在润色，稍等…')
            : store.error
              ? h('span', { style: { color: color.error } }, store.error)
              : store.result,
        ),
      )
    }

    // ---------- registration ----------
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
          'baihua-polish: refresh on focus',
        )

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'baihua-polish',
              order: 26,
              label: '白话润色',
            },
            SidebarIcon,
          ),
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: 'baihua-polish',
            },
            BaihuaPanel,
          ),
        )

        ctx.slots.inject('conversation.chat.assistant-actions', () =>
          ctx.slots.register(
            {
              name: 'conversation.chat.assistant-actions',
              id: 'baihua-polish',
              order: 30,
              label: '白话解释',
            },
            BaihuaAction,
          ),
        )

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'baihua-polish',
              order: 40,
              label: '白话润色',
            },
            BaihuaOverlay,
          ),
        )
      },
    }
  },
})
