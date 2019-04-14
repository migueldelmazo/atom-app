import { atom, getDefinition } from './common'

export default (name, ...args) => {
  const definition = getDefinition('getter', name)
  if (definition) {
    const modelArgs = atom.model.getValues(definition.args)
    return definition.fn(...modelArgs.concat(...args))
  }
}
