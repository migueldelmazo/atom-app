import _ from 'lodash'
import { wu, runFn, setInModel } from './common'
import { getDefinition, setDefinition } from './definition'

const run = (name) => {
  const definition = getDefinition('ensurer', name)
  const result = runFn(definition)
  _.consoleGroup('ensurer', 'Ensurer: run ' + name, 'Result:', result)
  setInModel(definition, result)
  _.consoleGroupEnd()
}

export default {

  setDefinition: (name, definition) => {
    setDefinition('ensurer', name, definition, {
      onChange: true,
      args: false,
      run: false,
      to: true
    })
  },

  watch: (name) => {
    const definition = getDefinition('ensurer', name)
    wu.model.watch(definition.onChange.paths, definition.onChange.check, run.bind(null, name), {
      type: 'ensurer'
    })
  }

}
