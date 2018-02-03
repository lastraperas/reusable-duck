import reusableDuck from '../index'

const namespace = 'namespace'
const store = 'list'

describe('reusable-duck for arrays', () => {
  const duck = reusableDuck({
    namespace,
    store,
    initialState: {
      fruits: [],
    },
  })

  xit('should create creators for common tasks with arrays', () => {
    expect(Object.keys(duck.creators)).toEqual([
      'setFruits',
      'resetFruits',
      'fruitsPush',
      'fruitsPop',
      'fruitsShift',
      'fruitsUnshift',
      'fruitsInsertAt',
      'fruitsRemoveAt',
      'fruitsSetElem',
      'fruitsRemoveElem',
    ])
  })

  xit('should create creators for common tasks with arrays', () => {
    const state = duck.initialState
    const action = duck.creators.setAtomic(3)
    const newState = duck.reducer(state, action, duck1)
    expect(Object.keys(duck1.creators)).toEqual([
      'setAtomic',
      'setLongerNameEntry',
      'setSomethingHappened',
    ])
  })
})
