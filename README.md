# @gf-apis/sessions-api

A simple and opinionated session management API for [Google Cloud HTTP Functions](https://cloud.google.com/functions/docs/writing/http).

It relies on the following dependencies:

* [@google-cloud/datastore](https://github.com/googleapis/nodejs-datastore) - for reading user data from [Google Datastore](https://cloud.google.com/datastore/).
* [Bcrypt](https://github.com/kelektiv/node.bcrypt.js) - for verifying passwords.
* [client-sessions](https://github.com/mozilla/node-client-sessions) - for session cookie management.

## Usage

![Google Cloud Function Setup](./images/gcp-create-function-1.png)

1) The name of your Google Cloud Function will also be the endpoint name. So, if you name your function "session", the endpoint served will also be called "session". Name it anything you deem fit.

2) Select HTTP Trigger.

3) In the inline editor, paste the following code:

```javascript
const SessionsApi = require('@gf-apis/sessions-api')

const api = new SessionsApi()

exports.handleRequest = function (req, res) {
  api.handle(req, res)
}
```

4) Click __package.json__ tab.

5) Paste the following code (ajust name and version to your liking):

```json
{
  "name": "your-function",
  "version": "0.0.1",
  "dependencies": {
    "@gf-apis/sessions-api": "0.1.0"
  }
}
```

6) Set the __Entry Point__ to `handleRequest`. If you want to use another name, make sure to adjust it in your function code (Step 3).

7) Click __More__ to show Advanced Options.

8) Create an __Environment Variable__ called `GFA_SESSION_SECRET` containing the __secret__ used to generate the encrypted session cookie. Without this, the function won't start.

9) Click __Create__ to deploy the function.

After the deploy is finished, the following endpoints will be served (assuming you named your function "session", see Step 1):

* `POST /session` - creates a new session (user sign-in)
* `GET /session` - returns information about current session
* `DELETE /session` - destroys session (user sign-out)
* `OPTIONS /session` - returns headers

## Requirements

This package reads user data from [Google Datastore](https://cloud.google.com/datastore/). As such, Datastore must be enabled in the Google Project, and user data should already exist.

Refer to [Configuration](#configuration) to determine which Datastore Kind and properties will be used for fetching and verifying user data.

## API

This section details the endpoints served by the function.

A function name of "session" is used in examples. If your function has a different name, endpoints will have that name instead.

### User Sign-In

* `POST /session`

This endpoint creates a new session if provided username/password are valid.

Successful responses set a cookie in the browser (or client) with the session credentials.

<table>
<tr><th>Request Body</th><th>Response</th></tr>
<tr><td>

```javascript
// valid credentials
{
  "username": "MyUsername",
  "password": "abc123"
}
```

</td><td>

```javascript
// statusCode: 201 Created
{
  "id": "12345",
  "username": "MyUsername"
}
```

</td></tr>

<tr><td>

```javascript
// non-existing username or wrong password
{
  "username": "MyUsername",
  "password": "wrongpass"
}
```

</td><td>

```javascript
// statusCode: 401 Unauthorized
// empty response
```

</td></tr>

</table>

### Current Session Information

* `GET /session`

Reads the session cookie and responds with friendly data.

<table>
<tr><th>Context</th><th>Response</th></tr>
<tr><td>Session cookie present</td><td>

```javascript
// statusCode: 200 OK
{
  "id": "12345",
  "username": "MyUsername"
}
```

</td></tr>

<tr><td>Session cookie not present</td><td>

```javascript
// statusCode: 401 Unauthorized
// empty response
```

</td></tr>

</table>

To change this output, set `session.expose` with an array of field names. `id` is included by default. Example:

```javascript
const api = new SessionsApi({
  session: {expose: ['username']}
})
```

Or use the `GFA_SESSION_EXPOSE` environment variable, as a comma-separated string of field names.

### User Sign-Out

* `DELETE /session`

Signs a user out, removing the session cookie from the browser/client.

<table>
<tr><th>Request Body</th><th>Response</th></tr>
<tr><td>(empty)</td><td>

```javascript
// statusCode 204 No Content
// empty response
```

</td></tr>
</table>

### Preflight Requests

* `OPTIONS /session`

Some clients will fire a "preflight request" prior to making the real request to verify CORS options and other security headers.

<table>
<tr><th>Request Body</th><th>Response</th></tr>
<tr><td>(empty)</td><td>

```javascript
// statusCode 204 No Content
// empty response with CORS and other security headers
```

</td></tr>
</table>

## Configuration

Setting __environment variables__ is the preferred way of configuration.

If for some reason you don't want to use environment variables, settings can be set upon creating an instance. See defaults below.

```javascript
var authorizer = new Authorizer({

  // Session management options
  session: {

    // REQUIRED! if not present, function will intentionally crash
    secret: process.env['GFA_SESSION_SECRET'],

    // name of the session cookie
    name: process.env['GFA_SESSION_NAME'] || 'userSession',

    // session expiration in ms
    duration: +process.env['GFA_SESSION_DURATION'] || (24 * 60 * 60 * 1000),

    // session active duration in ms
    activeDuration: +process.env['GFA_SESSION_ACTIVE_DURATION'] || (1000 * 60 * 5),

    // array of user fields to expose in session object
    // id is already included
    expose: (process.env['GFA_SESSION_EXPOSE'] || 'username').split(',')

  },

  // Datastore configuration
  database: {

    // Datastore "Kind"
    table: process.env['GFA_DATABASE_TABLE'] || 'User',

    // Datastore namespace
    namespace: process.env['GFA_DATABASE_NAMESPACE'],

    fields: {

      // name of the field that is used together with password during sign-in
      primary: process.env['GFA_DATABASE_FIELDS_PRIMARY'] || 'username',

      // name of the field that stores the password
      password: process.env['GFA_DATABASE_FIELDS_PASSWORD'] || 'password'

    }

  },

  // array of headers that are sent in all responses
  // CORS and security headers should be included here, if your browser/client needs them
  headers: []

})
```

## Authorizing _other_ Google Functions

1) Request the `Session` object from this library in your other Google Functions (i.e., API endpoints that require session credentials) and create an instance;

2) define all __Environment Variables__ starting with `GFA_SESSION_` (they __must__ match across functions!); then

3) call `authorize()` on the `session` instance to validate it:

```javascript
// Note the different class name and require path
const Session = require('@gf-apis/sessions-api/session')

// Create and configure this object with the same options
//   as the "session" section of your /sessions function
const session = new Session()

// Entry Point
exports.handleRequest = function (req, res) {
  session.authorize(req, res)
    .then(mainFunction) // session is valid
    .catch(errorFunction) // session is invalid, or an error ocurred
}

function mainFunction (req, res, user) {
  // your code here; `user` parameter contains session data
}

function errorFunction (err, req, res) {
  if (err.message === 'UNAUTHORIZED') {
    return res.status(401).end()
  }
  // Internal error: log it, then return generic error to user
  console.error(err)
  res.status(500).end({code: 'INTERNAL_ERROR'})
}
```

If the session is valid, a `user` object will be passed along to your main function. This object will be the same as returned by `GET /session`.

If the session is invalid, you can handle it in a separate function as shown in the example above.

## License

MIT
