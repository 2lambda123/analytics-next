import { User, LocalStorage, Cookie } from '..'
import jar from 'js-cookie'
import assert from 'assert'

function clear(): void {
  document.cookie.split(';').forEach(function (c) {
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
  })
  localStorage.clear()
}

describe('user', () => {
  const cookieKey = User.defaults.cookie.key
  const localStorageKey = User.defaults.localStorage.key
  const store = new LocalStorage()

  describe('()', () => {
    beforeEach(() => {
      clear()
    })

    it('should pick the old "_sio" anonymousId', () => {
      jar.set('_sio', 'anonymous-id----user-id')
      const user = new User()
      expect(user.anonymousId()).toEqual('anonymous-id')
    })

    it('should not pick the old "_sio" if anonymous id is present', () => {
      jar.set('_sio', 'old-anonymous-id----user-id')
      jar.set('ajs_anonymous_id', 'new-anonymous-id')
      assert(new User().anonymousId() === 'new-anonymous-id')
    })

    it('should create anonymous id if missing', () => {
      const user = new User()
      assert(user.anonymousId()?.length === 36)
    })

    it('should not overwrite anonymous id', () => {
      jar.set('ajs_anonymous_id', 'anonymous')
      expect(new User().anonymousId()).toEqual('anonymous')
    })
  })

  describe('#id', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    describe('when cookies are disabled', () => {
      beforeEach(() => {
        jest.spyOn(Cookie, 'available').mockReturnValueOnce(false)

        user = new User()
        clear()
      })

      it('should get an id from the store', () => {
        store.set(cookieKey, 'id')
        assert(user.id() === 'id')
      })

      it('should set an id to the store', () => {
        user.id('id')
        assert(store.get(cookieKey) === 'id')
      })

      it('should set the id when not persisting', () => {
        user = new User({ persist: false })
        user.id('id')
        assert(user.id() === 'id')
      })

      it('should be null by default', () => {
        assert(user.id() === null)
      })

      it('should not reset anonymousId if the user didnt have previous id', () => {
        const prev = user.anonymousId()

        user.id('foo')
        user.id('foo')
        user.id('foo')

        assert(user.anonymousId() === prev)
      })

      it('should reset anonymousId if the user id changed', () => {
        user.anonymousId('bla')

        const prev = user.anonymousId()
        user.id('foo')
        user.id('baz')

        expect(user.anonymousId()).not.toEqual(prev)
        expect(user.anonymousId()?.length).toBe(36)
      })

      it('should not reset anonymousId if the user id changed to null', () => {
        const prev = user.anonymousId()
        user.id('foo')
        user.id(null)
        assert(user.anonymousId() === prev)
        assert(user.anonymousId()?.length === 36)
      })
    })

    describe('when cookies and localStorage are disabled', () => {
      beforeEach(() => {
        jest.spyOn(Cookie, 'available').mockReturnValueOnce(false)
        jest.spyOn(LocalStorage, 'available').mockReturnValueOnce(false)

        user = new User()
        clear()
      })

      it('should get an id from memory', () => {
        user.id('id')
        assert(user.id() === 'id')

        expect(jar.get(cookieKey)).toBeFalsy()
        expect(store.get(cookieKey)).toBeFalsy()
      })

      it('should get an id when not persisting', () => {
        user = new User({ persist: false })
        user.id('id')
        assert(user.id() === 'id')
      })

      it('should be null by default', () => {
        assert(user.id() === null)
      })

      it('should not reset anonymousId if the user didnt have previous id', () => {
        const prev = user.anonymousId()
        user.id('foo')
        user.id('foo')
        user.id('foo')

        assert(user.anonymousId() === prev)
      })

      it('should reset anonymousId if the user id changed', () => {
        const prev = user.anonymousId()
        user.id('foo')
        user.id('baz')
        assert(user.anonymousId() !== prev)
        assert(user.anonymousId()?.length === 36)
      })

      it('should not reset anonymousId if the user id changed to null', () => {
        const prev = user.anonymousId()
        user.id('foo')
        user.id(null)
        assert(user.anonymousId() === prev)
        assert(user.anonymousId()?.length === 36)
      })
    })

    describe('when cookies are enabled', () => {
      it('should get an id from the cookie', () => {
        jar.set(cookieKey, 'id')
        assert(user.id() === 'id')
      })

      it('should set an id to the cookie', () => {
        user.id('id')
        assert(jar.get(cookieKey) === 'id')
      })

      it('should be null by default', () => {
        assert(user.id() === null)
      })

      it('should not reset anonymousId if the user didnt have previous id', () => {
        const prev = user.anonymousId()
        user.id('foo')
        user.id('foo')
        user.id('foo')
        assert(user.anonymousId() === prev)
      })

      it('should reset anonymousId if the user id changed', () => {
        const prev = user.anonymousId()
        user.id('foo')
        user.id('baz')
        assert(user.anonymousId() !== prev)
        assert(user.anonymousId()?.length === 36)
      })
    })
  })

  describe('#anonymousId', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    describe('when cookies are disabled', () => {
      it('should get an id from the store', () => {
        store.set('ajs_anonymous_id', 'anon-id')
        expect(user.anonymousId()).toEqual('anon-id')
      })

      it('should set an id to the store', () => {
        user.anonymousId('anon-id')
        assert(store.get('ajs_anonymous_id') === 'anon-id')
      })
    })

    describe('when cookies and localStorage are disabled', () => {
      beforeEach(() => {
        jest.spyOn(LocalStorage, 'available').mockReturnValueOnce(false)
        jest.spyOn(Cookie, 'available').mockReturnValueOnce(false)

        user = new User()
        clear()
      })

      it('should get an id from memory', () => {
        user.anonymousId('anon-id')
        assert(user.anonymousId() === 'anon-id')
        expect(jar.get('ajs_anonymous_id')).toBeFalsy()
      })
    })

    describe('when cookies are enabled', () => {
      it('should get an id from the cookie', () => {
        jar.set('ajs_anonymous_id', 'anon-id')
        assert(user.anonymousId() === 'anon-id')
      })

      it('should set an id to the cookie', () => {
        user.anonymousId('anon-id')
        assert(jar.get('ajs_anonymous_id') === 'anon-id')
      })

      it('should set anonymousId in both cookie and localStorage', () => {
        user.anonymousId('anon0')
        assert.equal(jar.get('ajs_anonymous_id'), 'anon0')
        assert.equal(store.get('ajs_anonymous_id'), 'anon0')
      })

      it('should not set anonymousId in localStorage when localStorage fallback is disabled', () => {
        user = new User({
          localStorageFallbackDisabled: true,
        })

        user.anonymousId('anon0')
        assert.equal(jar.get('ajs_anonymous_id'), 'anon0')
        assert.equal(store.get('ajs_anonymous_id'), null)
      })

      it('should copy value from cookie to localStorage', () => {
        user = new User()
        jar.set('ajs_anonymous_id', 'anon1')

        assert.equal(user.anonymousId(), 'anon1')
        assert.equal(store.get('ajs_anonymous_id'), 'anon1')
      })

      it('should not copy value from cookie to localStorage when localStorage fallback is disabled', () => {
        user = new User({
          localStorageFallbackDisabled: true,
        })
        jar.set('ajs_anonymous_id', 'anon1')
        assert.equal(user.anonymousId(), 'anon1')
        assert.equal(store.get('ajs_anonymous_id'), null)
      })

      it('should fall back to localStorage when cookie is not set', () => {
        user = new User()
        user.anonymousId('anon12')
        assert.equal(jar.get('ajs_anonymous_id'), 'anon12')

        // delete the cookie
        jar.remove('ajs_anonymous_id')
        assert.equal(jar.get('ajs_anonymous_id'), null)

        // verify anonymousId() returns the correct id even when there's no cookie
        assert.equal(user.anonymousId(), 'anon12')

        // verify cookie value is restored from localStorage
        assert.equal(jar.get('ajs_anonymous_id'), 'anon12')
      })

      it('should write to both cookie and localStorage when generating a new anonymousId', () => {
        user = new User()
        user.anonymousId('bla')
        const anonId = user.anonymousId()

        assert.notEqual(anonId, null)
        assert.equal(jar.get('ajs_anonymous_id'), anonId)
        assert.equal(store.get('ajs_anonymous_id'), anonId)
      })

      it('should not write to both cookie and localStorage when generating a new anonymousId and localStorage fallback is disabled', () => {
        user = new User({
          localStorageFallbackDisabled: true,
        })

        user.anonymousId('bla')
        const anonId = user.anonymousId()

        assert.notEqual(anonId, null)
        assert.equal(jar.get('ajs_anonymous_id'), anonId)
        assert.equal(store.get('ajs_anonymous_id'), null)
      })
    })
  })

  describe('#traits', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    it('should get traits', () => {
      store.set(localStorageKey, { trait: true })
      expect(user.traits()).toEqual({ trait: true })
    })

    it('should get traits when not persisting', () => {
      user = new User({ persist: false })
      user.traits({ trait: true })
      expect(user.traits()).toEqual({ trait: true })
      expect(store.get(localStorageKey)).toBeNull()
    })

    it('should set traits', () => {
      user.traits({ trait: true })
      expect(store.get(localStorageKey)).toEqual({ trait: true })
    })

    it('should default traits to an empty object', () => {
      user.traits(null)
      expect(store.get(localStorageKey)).toEqual({})
    })

    it('should default traits to an empty object when not persisting', () => {
      user = new User({ persist: false })
      user.traits(null)
      expect(user.traits()).toEqual({})
    })

    it('should be an empty object by default', () => {
      expect(user.traits()).toEqual({})
    })
  })

  // describe('#options', () => {
  //   it('should get options', () => {
  //     // assert(user.options() === user.options)
  //   })

  //   it('should set options with defaults', () => {
  //     // user.options({ option: true })
  //     // assert.deepEqual(user.options, {
  //     //   option: true,
  //     //   persist: true,
  //     //   cookie: {
  //     //     key: 'ajs_user_id',
  //     //     oldKey: 'ajs_user',
  //     //   },
  //     //   localStorage: {
  //     //     key: 'ajs_user_traits',
  //     //   },
  //     // })
  //   })
  // })

  describe('#save', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    it('should save an id to a cookie', () => {
      user.id('id')
      user.save()
      expect(jar.get(cookieKey)).toEqual('id')
    })

    it('should save an id to localStorage', () => {
      user.id('id')
      user.save()
      expect(store.get(cookieKey)).toEqual('id')
    })

    it('should not save an id to localStorage when localStorage fallback is disabled', () => {
      user = new User({
        localStorageFallbackDisabled: true,
      })

      user.id('id')
      user.save()
      expect(store.get(cookieKey)).toBeNull()
    })

    it('should save traits to local storage', () => {
      user.traits({ trait: true })
      user.save()
      expect(store.get(localStorageKey)).toEqual({ trait: true })
    })

    it('shouldnt save if persist is false', () => {
      user = new User({
        persist: false,
      })

      user.id('id')
      user.save()
      expect(jar.get(cookieKey)).toBeUndefined()
    })
  })

  describe('#logout', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    it('should reset an id and traits', () => {
      user.id('id')
      user.anonymousId('anon-id')
      user.traits({ trait: true })
      user.logout()

      expect(jar.get('ajs_anonymous_id')).toBeUndefined()
      expect(user.id()).toBeNull()
      expect(user.traits()).toEqual({})
    })

    it('should clear id in cookie', () => {
      user.id('id')
      user.save()
      user.logout()

      expect(jar.getJSON(cookieKey)).toBeFalsy()
    })

    it('should clear id in local storage', () => {
      user.id('id')
      user.save()
      user.logout()
      expect(store.get(cookieKey)).toBeNull()
    })

    it('should clear traits in local storage', () => {
      user.traits({ trait: true })
      user.save()
      user.logout()

      expect(store.get(localStorageKey)).toEqual({})
    })
  })

  describe('#identify', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    it('should save an id', () => {
      user.identify('id')
      expect(user.id()).toEqual('id')
    })

    it('should save traits', () => {
      user.identify(null, { trait: true })

      expect(user.traits()).toEqual({ trait: true })
      expect(store.get(localStorageKey)).toEqual({ trait: true })
    })

    it('should save an id and traits', () => {
      user.identify('id', { trait: true })

      expect(user.id()).toEqual('id')
      expect(user.traits()).toEqual({ trait: true })

      expect(jar.getJSON(cookieKey)).toEqual('id')
      expect(store.get(localStorageKey)).toEqual({ trait: true })
    })

    it('should extend existing traits', () => {
      user.traits({ one: 1 })
      user.identify('id', { two: 2 })

      expect(user.traits()).toEqual({ one: 1, two: 2 })
      expect(store.get(localStorageKey)).toEqual({ one: 1, two: 2 })
    })

    it('shouldnt extend existing traits for a new id', () => {
      user.id('id')
      user.traits({ one: 1 })
      user.identify('new', { two: 2 })

      expect(user.traits()).toEqual({ two: 2 })
      expect(store.get(localStorageKey)).toEqual({ two: 2 })
    })

    it('should reset traits for a new id', () => {
      user.id('id')
      user.traits({ one: 1 })
      user.identify('new')

      expect(user.traits()).toEqual({})
      expect(store.get(localStorageKey)).toEqual({})
    })
  })

  describe('#load', () => {
    let user: User

    beforeEach(() => {
      user = new User()
      clear()
    })

    it('should load an empty user', () => {
      user.load()

      expect(user.id()).toBe(null)
      expect(user.traits()).toEqual({})
    })

    it('should load an id from a cookie', () => {
      jar.set(cookieKey, 'le id')
      user.load()
      expect(user.id()).toEqual('le id')
    })

    it('should load traits from local storage', () => {
      store.set(localStorageKey, { trait: true })
      user.load()
      expect(user.traits()).toEqual({ trait: true })
    })

    it('should load from an old cookie', () => {
      jar.set(User.defaults.cookie.oldKey, {
        id: 'old',
        traits: { trait: true },
      })

      user.load()
      expect(user.id()).toEqual('old')
      expect(user.traits()).toEqual({ trait: true })
    })
  })
})
