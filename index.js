'use strict'

const ClientSessionsAdapter = require('@gfa/client-sessions-adapter')
const BcryptAdapter = require('@gfa/bcrypt-adapter')
const DatastoreAdapter = require('@gfa/datastore-adapter')

const {SessionsApp} = require('@gfa/core/apps/SessionsApp')
const {SessionsRouter} = require('@gfa/core/routers/SessionsRouter')

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
