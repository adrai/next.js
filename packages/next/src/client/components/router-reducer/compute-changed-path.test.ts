import {
  computeChangedPath,
  segmentToSourcePagePathname,
} from './compute-changed-path'
import { PrefetchHint } from '../../../shared/lib/app-router-types'

describe('computeChangedPath', () => {
  it.each([
    [['slug', 'hello', 'd', null], '[slug]'],
    [['slug', 'hello', 'c', null], '[...slug]'],
    [['slug', 'hello', 'oc', null], '[[...slug]]'],
    [['slug', 'hello', 'di(.)', null], '(.)[slug]'],
    [['slug', 'hello', 'di(..)', null], '(..)[slug]'],
    [['slug', 'hello', 'di(..)(..)', null], '(..)(..)[slug]'],
    [['slug', 'hello', 'di(...)', null], '(...)[slug]'],
    [['slug', 'hello', 'ci(.)', null], '(.)[...slug]'],
    [['slug', 'hello', 'ci(..)', null], '(..)[...slug]'],
    [['slug', 'hello', 'ci(..)(..)', null], '(..)(..)[...slug]'],
    [['slug', 'hello', 'ci(...)', null], '(...)[...slug]'],
  ] as const)('formats source route segment %j as %s', (segment, expected) => {
    expect(segmentToSourcePagePathname(segment)).toBe(expected)
  })

  it('should return the correct path', () => {
    expect(
      computeChangedPath(
        [
          '',
          {
            children: [
              '(marketing)',
              {
                children: ['__PAGE__', {}],
                modal: [
                  '(...)stats',
                  {
                    children: [
                      ['key', 'github', 'd', null],
                      {
                        children: ['__PAGE__', {}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          undefined,
          undefined,
          PrefetchHint.IsRootLayout,
        ],
        [
          '',
          {
            children: [
              '(marketing)',
              {
                children: ['__PAGE__', {}],
                modal: [
                  '(...)stats',
                  {
                    children: [
                      ['key', 'github', 'd', null],
                      {
                        children: ['__PAGE__', {}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          undefined,
          undefined,
          PrefetchHint.IsRootLayout,
        ]
      )
    ).toBe('/')
  })
})
