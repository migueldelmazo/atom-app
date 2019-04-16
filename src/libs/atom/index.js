import _ from 'lodash'
import { atom, setDefinition, checkDefinitionType, checkDefinitionName } from './common'
import api from './api'
import ensure from './ensure'
import getter from './getter'
import model from './model'
import router from './router'
import setter from './setter'
import watcher from './watcher'
import './lodash'

atom.api = api
atom.getter = getter
atom.setter = setter
atom.model = model

atom.create = (type, name, definition) => {
  _.consoleGroup(type, _.capitalize(type) + ': create ' + name, 'Definition:', definition)
  checkDefinitionType(type)
  checkDefinitionName(name)
  setDefinition(type, name, definition)
  switch (type) {
    case 'api':
      api.watch(name)
      break;
    case 'ensure':
      ensure.watch(name)
      break;
    case 'router':
      router.watch(name)
      break;
    case 'watcher':
      watcher.watch(name)
      break;
    default:
  }
  _.consoleGroupEnd()
}

atom.init = () => {
  api.init()
  router.init()
  atom.model.set('app.ready', true)
}

export default atom

window.atom = atom
