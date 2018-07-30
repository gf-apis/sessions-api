'use strict'

const ClientSessionsAdapter = require('@gf-apis/client-sessions-adapter')
const BcryptAdapter = require('@gf-apis/bcrypt-adapter')
const DatastoreAdapter = require('@gf-apis/datastore-adapter')

const {SessionsApp} = require('@gf-apis/core/apps/SessionsApp')
const {SessionsRouter} = require('@gf-apis/core/routers/SessionsRouter')

class SessionsApi extends SessionsApp {
  constructor (opts) {
    var options = opts || {}
    const sessionOptions = options.session || {}
    const datastoreOptions = options.database || {}
    const sessionAdapter = new ClientSessionsAdapter(sessionOptions)
    const databaseAdapter = new DatastoreAdapter(datastoreOptions)
    const passwordAdapter = new BcryptAdapter()
    const router = new SessionsRouter()
    options.session = sessionAdapter
    options.database = databaseAdapter
    options.password = passwordAdapter
    options.router = router
    if (!options.table) {
      options.table = 'User' // Datastore format suggests a capitalized, singular name
    }
    super(options)
  }
}

module.exports = SessionsApi
