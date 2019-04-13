import _ from 'lodash'
import { atom, getDefinition } from './common'
import cache from './api-cache'
import flags from './api-flags'
import model from './api-model'
import online from './api-online'
import queue from './api-queue'
import handlers from './api-handlers'

// handler requests

const handleRequests = () => {
  setTimeout(() => {
    if (atom.model.get('api.online')) {
      const nextRequest = queue.getNextRequest()
      if (!_.isEmpty(nextRequest)) {
        handleRequest(nextRequest)
      }
    }
  })
}

const handleRequest = (request) => {
  flags.set(request, 'sending', true)
  if (cache.exists(request)) {
    handleResponse(cache.get(request))
  } else {
    fetch(request.request.path, getRequestOptions(request))
      .then((response) => getResponseData(request, response))
      .then(() => handleResponse(request))
  }
}

// request

const parseRequest = (definition, name) => {
  const headers = _.defaults({}, definition.request.headers)
  const body = _.defaults({}, definition.request.body)
  const query = _.defaults({}, definition.request.query)
  return {
    name,
    id: _.uniqueId('api'),
    sent: false,
    flags: definition.flags || {},
    handlers: definition.handlers || {},
    request: {
      headers,
      body,
      query,
      method: (definition.request.method || 'get').toUpperCase(),
      path: (definition.request.path || '') + _.objectToQuery(query)
    },
    response: {}
  }
}

const getRequestOptions = (request) => {
  const options = {
    headers: request.request.headers,
    method: request.request.method
  }
  if (['PATCH', 'POST', 'PATCH'].indexOf(options.method) >= 0) {
    options.body = JSON.stringify(request.request.body)
  }
  return options
}

// response

const getResponseData = (request, response) => {
  const headers = _.clone(response.headers)
  return response.json()
    .then((body) => {
      request.response = {
        error: false,
        errorMessage: '',
        handler: 'onCode' + response.status,
        isValid: true,
        raw: {
          headers: headers,
          body: body,
          status: response.status
        }
      }
    })
    .catch((err) => {
      request.response = {
        error: true,
        errorMessage: err.message,
        handler: 'onError',
        isValid: false,
        raw: {
          headers: headers,
          body: {},
          status: 500
        }
      }
    })
}

const handleResponse = (request) => {
  _.consoleGroup('api', 'On response: ' + request.request.method + request.request.path + ' (status: ' + request.response.raw.status + ')', 'Request:', request)
  handlers.runValidator(request)
  cache.set(request)
  handlers.ensureHandler(request)
  handlers.runMapper(request)
  handlers.runParser(request)
  model.set(request)
  flags.set(request, 'sending', false)
  _.consoleGroupEnd()
}

export default {

  init: () => {
    atom._private.api = atom._private.api || {}
    cache.init()
    queue.init()
    online.init(handleRequests)
  },
  
  send: (name) => {
    const definition = getDefinition('api', name)
    const request = parseRequest(definition, name)
    _.consoleGroup('api', 'Init request: ' + request.name + ' ' + request.request.method + request.request.path, 'Request:', request)
    queue.add(request)
    _.consoleGroupEnd()
    handleRequests()
  }

}
