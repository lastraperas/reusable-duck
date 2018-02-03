import Duck from 'extensible-duck'
import snakeCase from 'snake-case'
import toCamelCase from 'to-camel-case'
import omit from 'lodash/omit'
import S from 'string'

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
const camelize = s => capitalize(S(s).camelize().s)

export const bindCreators = (parentDuck, childDuck) =>
  Object.keys(childDuck.creators).reduce((accum, c) => {
    const result = {
      ...accum,
      [c]: payload => childDuck.creators[c](payload),
    }
    return result
  }, {})

const creatorCreator = (confTypes = [], type, actionName, initialState) => {
  const isSet = type.endsWith('CHANGED') || confTypes.indexOf(snakeCase(actionName).toUpperCase()) > -1
  const isInitial = Object.keys(initialState).indexOf(actionName) > -1
  if (!isInitial && !isSet) {
    return {}
  }
  const action = isSet ? 'set' : 'reset'
  return {
    [`${action}${camelize(actionName)}`]: param => ({
      type,
      [actionName]: isSet ? param : initialState[actionName],
    }),
  }
}

export const mapCreatorsToDispatchToProps = (creators, dispatch) =>
  Object.keys(creators).reduce((accum, c) => {
    const result = {
      ...accum,
      [c]: payload => dispatch(creators[c](payload)),
    }
    return result
  }, {})

export default (duckConf) => {
  if (!duckConf || !duckConf.initialState) {
    return new Duck(duckConf || {})
  }

  const { innerDucks } = duckConf
  const initialState = { ...duckConf.initialState }

  if (innerDucks) {
    Object.keys(innerDucks).forEach((k) => {
      if (innerDucks[k]) {
        initialState[k] = innerDucks[k].initialState
      }
    })
  }

  const keys = Object.keys(duckConf.initialState)
  const typeKeyMap = {}

  let types = keys.reduce((accum, k) => {
    const setType = `${snakeCase(k).toUpperCase()}_CHANGED`
    const resetType = `${snakeCase(k).toUpperCase()}_RESET`
    const result = [...accum, setType, resetType]
    typeKeyMap[setType] = k
    typeKeyMap[resetType] = k
    return result
  }, [])

  const reducer = (state, action, duck) => {
    let newState = { ...state }
    if (innerDucks) {
      Object.keys(innerDucks).forEach((k) => {
        const innerDuck = innerDucks[k]
        // const innerDuckTypes = Object.keys(innerDuck.types)
        // eslint-disable-next-line max-len
        // if (innerDuck && innerDuckTypes.indexOf(action.type) > -1 && innerDuck.reducer) {
        if (innerDuck && innerDuck.reducer) {
          newState = {
            ...state,
            [k]: innerDuck.reducer(state[k], action, innerDuck),
          }
        }
      })
    }

    types.forEach((t) => {
      if (action.type === duck.types[t]) {
        const actionParamName = typeKeyMap[t]
        newState = {
          ...state,
          [actionParamName]: action[actionParamName],
        }
      }
    })

    if (duckConf.reducer) {
      newState = {
        ...state,
        ...duckConf.reducer(state, action, duck),
      }
    }

    return newState
  }

  if (duckConf.types) {
    duckConf.types.map((t) => {
      const key = toCamelCase(t).replace(/Changed$/, '').replace(/Reset$/, '')
      typeKeyMap[t] = key
      return typeKeyMap
    })
    types = [
      ...types,
      ...duckConf.types,
    ]
  }

  const creators = (duck) => {
    let cs = types.reduce((accum, t) => {
      const keyName = typeKeyMap[t]
      return {
        ...accum,
        ...(keyName ?
          creatorCreator(duckConf.types, duck.types[t], keyName, initialState) :
          {}
        ),
      }
    }, {})

    if (innerDucks) {
      Object.keys(innerDucks).forEach((k) => {
        const innerDuck = innerDucks[k]
        if (innerDuck && innerDuck.creators) {
          cs = {
            ...cs,
            ...bindCreators(duck, innerDuck),
          }
        }
      })
    }

    if (duckConf.creators) {
      cs = {
        ...cs,
        ...duckConf.creators(duck),
      }
    }

    return cs
  }

  if (innerDucks) {
    Object.keys(innerDucks).forEach((k) => {
      const innerDuck = innerDucks[k]
      // const innerDuckTypes = Object.keys(innerDuck.types)
      // eslint-disable-next-line max-len
      // if (innerDuck && innerDuckTypes.indexOf(action.type) > -1 && innerDuck.reducer) {
      if (innerDuck && innerDuck.reducer) {
        types[k] = innerDuck.types
      }
    })
  }

  const d = new Duck({
    ...omit(duckConf, ['initialState', 'types', 'reducer', 'creators']),
    initialState,
    types,
    reducer,
    creators,
  })
  d.innerDucks = innerDucks
  d.bindCreators = bindCreators
  d.creatorCreator = creatorCreator
  d.mapCreatorsToDispatchToProps = mapCreatorsToDispatchToProps
  return d
}
