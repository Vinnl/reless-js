import Relesslib from '../src'

// To allow injecting the dist version of the library
var Reless = Window.injectedReless ? Window.injectedReless : Relesslib

let initial = {
  reducers: {
    add: () => {},
    setCounterToTen: () => ({ counter: 10 }),
    setNewProperty: () => ({ newProp: 1 }),
    increment: () => state => ({
      counter: state.counter + 1,
    }),
    setCounterTo: ({ counter }) => ({ counter }),
  },
  state: {
    counter: 0,
  },
}

test('Reless returns an object with state and reducers', () => {
  let store = new Reless()
  expect(store['state']).toBeTruthy()
  expect(store['reducers']).toBeTruthy()
})

test('Reless returns state with contents', () => {
  let store = new Reless(initial)
  expect(store.state.counter).toBe(0)
  expect(store.reducers.add).toBeTruthy()
})

test("when calling a reducer that doesn't use state, the state updates", () => {
  let store = new Reless(initial)
  store.reducers.setCounterToTen()
  expect(store.state.counter).toBe(10)
})

test('when calling a reducer that creates a new property on the state, the property is created', () => {
  let store = new Reless(initial)
  store.reducers.setNewProperty()
  expect(store.state.newProp).toBe(1)
})

test('when calling a reducer that uses state, the state is updated', () => {
  let store = new Reless(initial)
  store.reducers.increment()
  expect(store.state.counter).toBe(1)
  store.reducers.increment()
  expect(store.state.counter).toBe(2)
})

test("when creating two Reless instances from initial, states don't update both", () => {
  let store = new Reless(initial)
  store.reducers.setCounterToTen()
  expect(store.state.counter).toBe(10)

  let store2 = new Reless(initial)
  expect(store2.appState.counter).toBe(0)
})

jest.useFakeTimers()

test('when doing something async, a reducer can update state twice', () => {
  let store = new Reless({
    state: { loading: false, count: 0 },
    reducers: {
      setLoading: loading => ({ loading }),
      doAsync: () => () => ({ setLoading }) => {
        setLoading(true)
        setTimeout(() => {
          setLoading(false)
        }, 1)
      },
    },
  })

  expect(store.state.loading).toBe(false)
  store.reducers.doAsync()
  expect(store.state.loading).toBe(true)
  jest.runAllTimers()
  expect(store.state.loading).toBe(false)
})

test('when doing async, a reducer can update the state based on the latest state', () => {
  let store = new Reless({
    state: { count: 0 },
    reducers: {
      setLoading: loading => ({ loading }),
      setCount: count => ({ count }),
      doAsync: () => state => reducers => {
        reducers.setCount(20)
        setTimeout(() => {
          reducers.setCount(state => state.count + 1)
        }, 1000)
      },
    },
  })

  expect(store.state.count).toBe(0)
  store.reducers.doAsync()
  expect(store.state.count).toBe(20)
  jest.runAllTimers()
  expect(store.state.count).toBe(21)
})

test('update async with setInterval, should use latest state', () => {
  let store = new Reless({
    state: { count: 3 },
    reducers: {
      setCount: count => ({ count }),
      doAsync: () => () => ({ setCount }) => {
        let interval = setInterval(() => {
          setCount(state => {
            if (state.count === 1) {
              clearInterval(interval)
              return 0
            }
            return state.count - 1
          })
        }, 1000)
        return ({ started: true })
      },
    },
  })

  expect(store.state.count).toBe(3)
  store.reducers.doAsync()
  expect(store.state.started).toBe(true)
  expect(store.state.count).toBe(3)
  jest.runTimersToTime(1000)
  expect(store.state.count).toBe(2)
  jest.runTimersToTime(1000)
  expect(store.state.count).toBe(1)
  jest.runTimersToTime(1000)
  expect(store.state.count).toBe(0)
})

test('when calling a reducer with a payload, the payload is passed and used', () => {
  let store = new Reless(initial)
  store.reducers.setCounterTo({ counter: 5 })
  expect(store.state.counter).toBe(5)
})

test('when calling a reducer asynchronous with payload, the payload is passed and used', () => {
  let store = new Reless({
    state: { count: 3 },
    reducers: {
      setCount: count => ({ count }),
      doAsync: ({ count }) => () => ({ setCount }) => {
        setTimeout(() => {
          setCount(count)
        }, 1000)
      },
    },
  })

  expect(store.state.count).toBe(3)
  store.reducers.doAsync({ count: 0 })
  expect(store.state.count).toBe(3)
  jest.runTimersToTime(1000)
  expect(store.state.count).toBe(0)
})

test('it is not possible to change the state directly, for non-nested properties', () => {
  let store = new Reless({
    state: { count: 3, nest: { prop: 1 } },
  })

  expect(store.state.count).toBe(3)
  expect(() => {
    store.state.count = 1
  }).toThrowError()
  expect(store.state.count).toBe(3)
  // Nested properties aren't protected, use immutablejs if you want this
  store.state.nest.prop = 2
  expect(store.state.nest.prop).toBe(2)
})

test('after state update, listener "newState" gets called with new payload', () => {
  let newStateMock = jest.fn()

  let store = new Reless({
    state: { counter: 0 },
    reducers: {
      setCounter: () => ({ counter: 1 }),
    },
    events: {
      newState: newStateMock,
    },
  })

  store.reducers.setCounter()
  expect(newStateMock.mock.calls.length).toBe(1)
  expect(newStateMock.mock.calls[0][0]).toEqual({ counter: 1 })
})
