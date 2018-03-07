import reusableDuck from '../index'

const namespace = 'namespace'
const store = 'list'
const prefix = `${namespace}/${store}/`

describe('reusable-duck for arrays', () => {
  const duck = reusableDuck({
    namespace,
    store,
    initialState: {
      fruits: ['orange', 'banana'],
    },
  })

  it('should create action types for common tasks with arrays', () => {
    expect(duck.types).toEqual({
      FRUITS_CHANGED: 'namespace/list/FRUITS_CHANGED',
      FRUITS_RESET: 'namespace/list/FRUITS_RESET',
      FRUITS_PUSH: `${prefix}FRUITS_PUSH`,
      FRUITS_UNSHIFT: `${prefix}FRUITS_UNSHIFT`,
      FRUITS_INSERT_AT: `${prefix}FRUITS_INSERT_AT`,
      FRUITS_REMOVE_AT: `${prefix}FRUITS_REMOVE_AT`,
      FRUITS_UPDATE: `${prefix}FRUITS_UPDATE`,
      FRUITS_REMOVE: `${prefix}FRUITS_REMOVE`,
    })
  })

  it('should create creators for common tasks with arrays', () => {
    expect(Object.keys(duck.creators)).toEqual([
      'setFruits',
      'resetFruits',
      'fruitsPush',
      'fruitsUnshift',
      'fruitsInsertAt',
      'fruitsRemoveAt',
      'fruitsUpdate',
      'fruitsRemove',
    ])
  })

  it('push should work as expected', () => {
    const state = duck.initialState
    const action = duck.creators.fruitsPush('apple')
    const newState = duck.reducer(state, action, duck)
    expect(newState).toEqual({
      fruits: ['orange', 'banana', 'apple'],
    })
  })

  it('unshift should work as expected', () => {
    const state = duck.initialState
    const action = duck.creators.fruitsUnshift('apple')
    const newState = duck.reducer(state, action, duck)
    expect(newState).toEqual({
      fruits: ['apple', 'orange', 'banana'],
    })
  })

  it('insertAt should work as expected', () => {
    const state = duck.initialState
    const action = duck.creators.fruitsInsertAt('apple', 1)
    const newState = duck.reducer(state, action, duck)
    expect(newState).toEqual({
      fruits: ['orange', 'apple', 'banana'],
    })
  })

  it('removeAt should work as expected', () => {
    const state = duck.initialState
    const action = duck.creators.fruitsRemoveAt(1)
    const newState = duck.reducer(state, action, duck)
    expect(newState).toEqual({
      fruits: ['orange'],
    })
  })

  const duck2 = reusableDuck({
    namespace,
    store,
    initialState: {
      fruits: [{ _id: 'apple', color: 'green' }, { id: 'banana', color: 'yellow' }],
    },
  })

  it('update should work as expected', () => {
    const state = duck2.initialState
    const action = duck2.creators.fruitsUpdate({ _id: 'apple', color: 'red' })
    const newState = duck2.reducer(state, action, duck2)
    expect(newState).toEqual({
      fruits: [{ _id: 'apple', color: 'red' }, { id: 'banana', color: 'yellow' }],
    })
  })

  it('remove should work as expected', () => {
    const state = duck2.initialState
    const action = duck2.creators.fruitsRemove({ id: 'banana' })
    const newState = duck2.reducer(state, action, duck2)
    expect(newState).toEqual({
      fruits: [{ _id: 'apple', color: 'green' }],
    })
  })
})
