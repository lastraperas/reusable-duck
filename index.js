import Duck from 'extensible-duck'
import snakeCase from 'snake-case'
import toCamelCase from 'to-camel-case'
import omit from 'lodash/omit'
import isArray from 'lodash/isArray'
import S from 'string'

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
const camelize = s => capitalize(S(s).camelize().s)

const bindCreators = (parentDuck, childDuck) =>
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

const mapCreatorsToDispatchToProps = (creators, dispatch) =>
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

  const { namespace, store } = duckConf
  const prefix = `${namespace}/${store}/`

  const arrayFieldCreators = (field) => {
    const fieldUpper = field.toUpperCase()
    return {
      [`${field}Push`]: element => ({
        type: `${prefix}${fieldUpper}_PUSH`,
        element,
      }),
      [`${field}Unshift`]: element => ({
        type: `${prefix}${fieldUpper}_UNSHIFT`,
        element,
      }),
      [`${field}InsertAt`]: (element, pos) => ({
        type: `${prefix}${fieldUpper}_INSERT_AT`,
        element,
        pos,
      }),
      [`${field}RemoveAt`]: pos => ({
        type: `${prefix}${fieldUpper}_REMOVE_AT`,
        pos,
      }),
      [`${field}Update`]: element => ({
        type: `${prefix}${fieldUpper}_UPDATE`,
        element,
      }),
      [`${field}Remove`]: element => ({
        type: `${prefix}${fieldUpper}_REMOVE`,
        element,
      }),
    }
  }

  const arrayFieldsCreators = (fields) => {
    const cs = fields.reduce((accum, f) => ({
      ...accum,
      ...arrayFieldCreators(f),
    }), {})
    return cs
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
  const arrayFields = []

  let types = keys.reduce((accum, k) => {
    const setType = `${snakeCase(k).toUpperCase()}_CHANGED`
    const resetType = `${snakeCase(k).toUpperCase()}_RESET`
    const result = [...accum, setType, resetType]
    typeKeyMap[setType] = k
    typeKeyMap[resetType] = k
    if (isArray(initialState[k])) {
      arrayFields.push(k)
    }
    return result
  }, [])

  let arraysActionTypes = []
  if (arrayFields.length) {
    arrayFields.map((f) => {
      const fieldUpper = f.toUpperCase()
      arraysActionTypes = [
        ...arraysActionTypes,
        `${fieldUpper}_PUSH`,
        `${fieldUpper}_UNSHIFT`,
        `${fieldUpper}_INSERT_AT`,
        `${fieldUpper}_REMOVE_AT`,
        `${fieldUpper}_UPDATE`,
        `${fieldUpper}_REMOVE`,
      ]
    })
  }

  const reducer = (state, action, duck) => {
    let newState = { ...state }

    if (arrayFields) {
      arrayFields.forEach((f) => {
        const fieldUpper = f.toUpperCase()
        switch (action.type) {
          case `${prefix}${fieldUpper}_PUSH`:
            newState = {
              ...newState,
              [f]: [...newState[f], action.element]
            }
            break;
          case `${prefix}${fieldUpper}_UNSHIFT`:
            newState = {
              ...newState,
              [f]: [action.element, ...newState[f]]
            }
            break;
          case `${prefix}${fieldUpper}_INSERT_AT`: {
            const newArr = [...newState[f]]
            newArr.splice(action.pos, 0, action.element)
            newState = {
              ...newState,
              [f]: newArr
            }
            break
          }
          case `${prefix}${fieldUpper}_REMOVE_AT`: {
            const newArr = [...newState[f]]
            newArr.splice(action.pos, 1)
            newState = {
              ...newState,
              [f]: newArr
            }
            break
          }
          case `${prefix}${fieldUpper}_UPDATE`: {
            const newArr = newState[f].map((e) => {
              let idField = e.hasOwnProperty('_id') && '_id'
              idField = e.hasOwnProperty('id') && 'id' || idField
              if (e[idField] === action.element[idField]) {
                return action.element
              }
              return e
            })
            newState = {
              ...newState,
              [f]: newArr
            }
            break
          }
          case `${prefix}${fieldUpper}_REMOVE`: {
            const newArr = []
            newState[f].map((e) => {
              let idField = e.hasOwnProperty('_id') && '_id'
              idField = e.hasOwnProperty('id') && 'id' || idField
              if (e[idField] !== action.element[idField]) {
                newArr.push(e)
              }
            })
            newState = {
              ...newState,
              [f]: newArr
            }
            break
          }
          default:

        }
      })
    }

    if (innerDucks) {
      Object.keys(innerDucks).forEach((k) => {
        const innerDuck = innerDucks[k]
        // const innerDuckTypes = Object.keys(innerDuck.types)
        // eslint-disable-next-line max-len
        // if (innerDuck && innerDuckTypes.indexOf(action.type) > -1 && innerDuck.reducer) {
        if (innerDuck && innerDuck.reducer) {
          newState = {
            ...newState,
            [k]: innerDuck.reducer(newState[k], action, innerDuck),
          }
        }
      })
    }

    types.forEach((t) => {
      if (action.type === duck.types[t] && arraysActionTypes.indexOf(action.type.replace(prefix, '')) === -1) {
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

    if (arrayFields.length) {
      cs = {
        ...cs,
        ...arrayFieldsCreators(arrayFields),
      }
    }

    return cs
  }

  if (innerDucks) {
    Object.keys(innerDucks).forEach((k) => {
      const innerDuck = innerDucks[k]
      // const innerDuckTypes = Object.keys(innerDuck.types)
      // if (innerDuck && innerDuckTypes.indexOf(action.type) > -1 && innerDuck.reducer) {
      if (innerDuck && innerDuck.reducer) {
        types[k] = innerDuck.types
      }
    })
  }

  if (arrayFields.length) {
    types = [
      ...types,
      ...arraysActionTypes,
    ]
  }

  const d = new Duck({
    ...omit(duckConf, ['initialState', 'types', 'reducer', 'creators']),
    initialState,
    types,
    reducer,
    creators,
  })

  d.mapCreatorsToDispatchToProps = mapCreatorsToDispatchToProps
  return d
}
