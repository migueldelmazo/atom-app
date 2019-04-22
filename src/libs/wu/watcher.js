import _ from 'lodash'
import { wu, runFn } from './common'
import { getDefinition } from './definition'

const run = (name) => {
  const definition = getDefinition('watcher', name)
  _.consoleGroup('watcher', 'Watcher: run ' + name)
  runFn(definition)
  _.consoleGroupEnd()
}

export default {

  watch: (name) => {
    const definition = getDefinition('watcher', name)
    wu.model.watch(definition.onChange.paths, definition.onChange.check, run.bind(null, name))
  }

}
