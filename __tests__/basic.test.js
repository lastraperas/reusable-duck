import reusableDuck from '../index'

const namespace = 'namespace'
const store = 'store'
const prefix = `${namespace}/${store}/`

describe('reusable-duck', () => {
  const duck1 = reusableDuck({
    namespace,
    store,
    types: ['SOMETHING_HAPPENED'],
    initialState: {
      atomic: 1,
      longerNameEntry: 'initial value',
    },
  })

  it('should start with your initial state', () => {
    expect(duck1.initialState).toEqual({
      atomic: 1,
      longerNameEntry: 'initial value',
    })
  })

  it('should create scoped action types for you', () => {
    expect(duck1.types).toEqual({
      ATOMIC_CHANGED: 'namespace/store/ATOMIC_CHANGED',
      ATOMIC_RESET: 'namespace/store/ATOMIC_RESET',
      LONGER_NAME_ENTRY_CHANGED: `${prefix}LONGER_NAME_ENTRY_CHANGED`,
      LONGER_NAME_ENTRY_RESET: `${prefix}LONGER_NAME_ENTRY_RESET`,
      SOMETHING_HAPPENED: `${prefix}SOMETHING_HAPPENED`,
    })
  })

  it('should create action creators for you...', () => {
    expect(Object.keys(duck1.creators)).toEqual([
      'setAtomic',
      'resetAtomic',
      'setLongerNameEntry',
      'resetLongerNameEntry',
      'setSomethingHappened',
    ])
  })

  it('set should behave as expected', () => {
    const action = duck1.creators.setAtomic(2)
    expect(action).toEqual({
      type: `${prefix}ATOMIC_CHANGED`,
      atomic: 2,
    })
  })

  it('reset should change to initial value', () => {
    const action = duck1.creators.resetAtomic()
    expect(action).toEqual({
      type: `${prefix}ATOMIC_RESET`,
      atomic: 1,
    })
  })

  it('should also create a single reducer for you', () => {
    const state = duck1.initialState
    const action = duck1.creators.setAtomic(3)
    const newState = duck1.reducer(state, action, duck1)
    expect(newState).toEqual({
      atomic: 3,
      longerNameEntry: 'initial value',
    })
  })

  const duck2 = reusableDuck({
    namespace,
    store,
    types: ['SOMETHING_HAPPENED'],
    initialState: {
      atomic: 1,
      longerNameEntry: 'initial value',
    },
    reducer: (state, action, duck) => {
      let newState = { ...state }
      switch (action.type) {
        case duck.types.SOMETHING_HAPPENED:
          newState = {
            ...newState,
            whaaaat: action.somethingHappened,
          }
          break
        default: return newState
      }
      return newState
    },
  })

  it('should merge your reducer with the atomatic ones', () => {
    const state = duck2.initialState
    const action = duck2.creators.setSomethingHappened('!!!!!')
    const newState = duck2.reducer(state, action, duck2)
    expect(newState).toEqual({
      atomic: 1,
      longerNameEntry: 'initial value',
      whaaaat: '!!!!!',
    })
  })

  const duck3 = reusableDuck({
    namespace,
    store,
    initialState: {
      atomic: 1,
    },
    reducer: (state, action, duck) => {
      let newState = { ...state }
      switch (action.type) {
        case duck.types.ATOMIC_CHANGED:
          newState = {
            ...newState,
            atomic: action.atomic * 2,
          }
          break
        default: return newState
      }
      return newState
    },
  })

  it('your reducers should have higher priority on the state', () => {
    const state = duck3.initialState
    const action = duck3.creators.setAtomic(2)
    const newState = duck3.reducer(state, action, duck3)
    expect(newState).toEqual({
      atomic: 4,
    })
  })

  const fakeDispatch = value => ({ dispatched: value })
  const mapStateToProps = duck1.mapCreatorsToDispatchToProps(duck1.creators, fakeDispatch)

  it('should help with redux mapDispatchToProps', () => {
    expect(Object.keys(mapStateToProps)).toEqual([
      'setAtomic',
      'resetAtomic',
      'setLongerNameEntry',
      'resetLongerNameEntry',
      'setSomethingHappened',
    ])
  })

  it('should help with redux mapDispatchToProps', () => {
    expect(mapStateToProps.setAtomic(2)).toEqual({
      dispatched: {
        type: 'namespace/store/ATOMIC_CHANGED',
        atomic: 2,
      },
    })
  })
})
