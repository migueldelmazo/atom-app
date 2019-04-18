import _ from 'lodash'
import { atom } from './common'

// atom private items

atom._private.model = {
  data: {},
  watchers: {}
}

// watchers validators

const areValidPaths = (paths) => {
  paths = _.parseArray(paths)
  return !_.isEmpty(paths) && _.every(paths, _.isString)
}

const areValidValidators = (validators) => {
  return (
    _.isPlainObject(validators) &&
    _.every(validators, (fns) => _.every(_.parseArray(fns), _.isFunction))
  ) ||
    validators === undefined
}

const areValidFns = (fns) => {
  fns = _.parseArray(fns)
  return !_.isEmpty(fns) && _.every(fns, _.isFunction)
}

// watchers parsers

const parsePaths = (paths) => {
  const result = []
  _.mapDeep(paths, parsePathsHelper.bind(null, result), parsePathsHelper.bind(null, result))
  return result
}

const parsePathsHelper = (pathsArray, path) => {
  if (_.isString(path)) {
    pathsArray.push(path)
  }
}

const parseValidators = (validators) => {
  return _.reduce(validators, (result, fns, path) => {
    result[path] = _.parseArray(fns)
    return result
  }, {})
}

const parseFns = (fns) => {
  return _.parseArray(fns)
}

const parseOptions = (options) => {
  options = options || {}
  return {
    type: options.type || 'default'
  }
}

const parseWatcher = (paths, validators, fns, options) => {
  return {
    paths: parsePaths(paths),
    validators: parseValidators(validators),
    fns: parseFns(fns),
    options: parseOptions(options)
  }
}

// watchers keys

const getWatcherKey = () => {
  return _.uniqueId('atom-model-key-')
}

// trigger

let onChangeTimer
const pendingPaths = {
  ensure: [],
  default: []
}

const triggerDebounced = (changedPath, options) => {
  triggerAddPendingPaths(changedPath)
  clearTimeout(onChangeTimer)
  onChangeTimer = setTimeout(trigger.bind(null), 0)
}

const triggerAddPendingPaths = (changedPath) => {
  _.each(pendingPaths, (paths, type) => {
    pendingPaths[type].push(changedPath)
  })
}

const trigger = () => {
  _.each(pendingPaths, (paths, type) => {
    while (!_.isEmpty(pendingPaths[type])) {
      triggerByType(pendingPaths, type)
    }
  })
}

const triggerByType = (pendingPaths, type) => {
  const changedPaths = _.uniq(pendingPaths[type])
  pendingPaths[type] = []
  triggerInWatchers(changedPaths, type)
}

const triggerInWatchers = (changedPaths, type) => {
  _.consoleGroup('reacting', 'Reacting to model changes', 'Type: ' + type + ', paths:', changedPaths)
  _.each(atom._private.model.watchers, (watcher) => {
    if (triggerIsValidWatcher(watcher, type) &&
      triggerPathsMatch(changedPaths, watcher.paths) &&
      triggerValidatorMatch(watcher.validators)) {
      _.each(watcher.fns, (fn) => fn())
    }
  })
  _.consoleGroupEnd()
}

const triggerIsValidWatcher = (watcher, type) => {
  return watcher && watcher.options.type === type
}

const triggerPathsMatch = (changedPaths, watcherPaths) => {
  return _.some(changedPaths, (changedPath) => {
    return _.some(watcherPaths, (watcherPath) => {
      return triggerPathMatch(changedPath, watcherPath)
    })
  })
}

const triggerValidatorMatch = (validators) => {
  if (validators) {
    return _.every(validators, (fns, path) => {
      const value = get(path)
      return _.every(fns, (fn) => fn(value))
    })
  }
  return true
}

const triggerPathMatch = (changedPath, watcherPath) => {
  return changedPath === watcherPath ||
    changedPath.indexOf(watcherPath + '.') === 0 ||
    watcherPath.indexOf(changedPath + '.') === 0 ||
    changedPath.indexOf(watcherPath + '[') === 0 ||
    watcherPath.indexOf(changedPath + '[') === 0
}

// get/set

const get = (key, defaultValue) => {
  return _.get(atom._private.model.data, key, defaultValue)
}

const set = (path, newValue, options = {}) => {
  const currentValue = _.get(atom._private.model.data, path)
  if (_.isString(path) && !_.isEqual(currentValue, newValue)) {
    _.set(atom._private.model.data, path, _.cloneDeep(newValue))
    if (options.silent !== true) {
      _.consoleLog('model', 'Model: set', path, '=', newValue)
      triggerDebounced(path, options)
    }
  }
}

// atom public methods

export default {

  // watchers

  watch: (paths, validators, fns, options) => {
    if (!areValidPaths(paths)) {
      _.consoleError('Invalid paths in Wu model watch call: ' + paths + '. Paths should be a string or an arrays of strings.')
    } else if (!areValidValidators(validators)) {
      _.consoleError('Invalid validators in Wu model watch call: ' + validators + '. Validators should be an object like:\n{\n\t\'path.of.model\': validatorFunction,\n\t\'other.path.of.model\': [_.isNotEmpty, _.isString]\n}')
    } else if (!areValidFns(fns)) {
      _.consoleError('Invalid fns in Wu model watch call: ' + fns + '. Functions should be a function or an arrays of functions.')
    } else {
      const key = getWatcherKey()
      atom._private.model.watchers[key] = parseWatcher(paths, validators, fns, options)
      return key
    }
  },

  stopWatching: (keys) => {
    _.each(_.parseArray(keys), (key) => {
      if (atom._private.model.watchers[key]) {
        atom._private.model.watchers[key] = null
      }
    })
  },
  
  // getters / setters

  get: (key, defaultValue) => {
    return _.cloneDeep(get(key, defaultValue))
  },

  populate: (data) => {
    return _.mapDeep(data, null, (value) => _.isString(value) && _.startsWith(value, '#')
      ? get(value.substr(1))
      : value
    )
  },

  set
}
