import { Path } from '../../../src/lib/storage/BlobTree'

describe('Path', () => {
  it('removes trailing slashes', function () {
    const p = new Path(['v1', 'a', 'b'], true)
    expect(p.toString()).toEqual('v1/a/b/')
  })
  it('removes leading slashes', function () {
    const p = new Path(['v1', 'a', 'b'], false)
    expect(p.toString()).toEqual('v1/a/b')
  })
  it('allows for empty segments', function () {
    const p = new Path(['v1', 'a', '', 'b'], true)
    expect(p.toString()).toEqual('v1/a//b/')
  })
  it('allows for spaces', function () {
    const p = new Path(['v1', 'a ', ' b'], false)
    expect(p.toString()).toEqual('v1/a / b')
  })
  it('allows for newlines', function () {
    const p = new Path(['v1', 'a\n', '\rb\t'], true)
    expect(p.toString()).toEqual('v1/a\n/\rb\t/')
  })
  it('allows for dots', function () {
    const p = new Path(['v1', 'a', '..', 'b'], false)
    expect(p.toString()).toEqual('v1/a/../b')
  })
  it('does not allow slashes', function () {
    function shouldThrow () {
      return new Path(['v1', 'a', '/', 'b'], false)
    }
    expect(shouldThrow).toThrow()
  })
  it('does not allow relative paths', function () {
    function shouldThrow () {
      return new Path(['a', 'b'], true)
    }
    expect(shouldThrow).toThrow()
  })
  it('can do .toChild', function () {
    const p = new Path(['v1', 'a'], false)
    expect(p.toChild('b', false).toString()).toEqual('v1/a/b')
  })
  it('can do .toParent', function () {
    const p = new Path(['v1', 'a'], true)
    expect(p.toParent().toString()).toEqual('v1/')
  })
  it('does not allow v1.toParent', function () {
    const p = new Path(['v1'], true)
    expect(p.toParent.bind(p)).toThrow('root has no parent!')
  })

  it('can do .hasSuffix', function () {
    const p = new Path(['v1', 'ablast'], false)
    expect(p.hasSuffix('bla')).toEqual(false)
    expect(p.hasSuffix('blast')).toEqual(true)
  })
  it('can do .appendSuffix', function () {
    const p = new Path(['v1', 'foo'], true)
    expect(p.appendSuffix('bar').toString()).toEqual('v1/foobar/')
  })
  it('can do .removeSuffix', function () {
    const p = new Path(['v1', 'foo'], false)
    expect(p.removeSuffix('oo').toString()).toEqual('v1/f')
    expect(() => p.removeSuffix('afoo')).toThrow('no suffix match (last segment name shorter than suffix)')
    expect(() => p.removeSuffix('bar')).toThrow('no suffix match')
  })
  it('can do .isv1', function () {
    const root = new Path(['v1'], true)
    const nonRoot = new Path(['v1', 'foo'], true)
    expect(root.isRoot()).toEqual(true)
    expect(nonRoot.isRoot()).toEqual(false)
  })
})
