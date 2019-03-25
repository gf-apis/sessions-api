### THIS PROJECT HAS BEEN DISCONTINUED.

Read more [here](https://github.com/pauloddr/gfa-guides/blob/master/README.md).

Original README archived below.

---

# @gfa/sessions-api

This component allows creating a session management API using [Google Cloud HTTP Functions](https://cloud.google.com/functions/docs/writing/http).

It relies on the following dependencies:

* [@google-cloud/datastore](https://github.com/googleapis/nodejs-datastore) - for reading user data from [Google Datastore](https://cloud.google.com/datastore/).
* [Bcrypt](https://github.com/kelektiv/node.bcrypt.js) - for verifying passwords.
* [client-sessions](https://github.com/mozilla/node-client-sessions) - for session cookie management.

## Usage

Create a new __Google Cloud Function__:

![Google Cloud Function Setup](https://raw.githubusercontent.com/pauloddr/gfa-guides/master/images/gcp-create-function-1.png)

1) The name of your Google Cloud Function will also be the endpoint name. So, if you name your function "session", the endpoint served will also be called "session". You can name it anything you like.

2) Select HTTP Trigger.

3) In the inline editor, paste the following code:

```javascript
const SessionsApi = require('@gfa/sessions-ds')

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
    "@gfa/sessions-ds": "github:pauloddr/gfa-sessions-ds"
  }
}
```

6) Set the __Entry Point__ to `handleRequest`. If you want to use another name, make sure to adjust it in your function code (Step 3).

7) Click __More__ to show Advanced Options.

8) Create an __environment variable__ called `GFA_SESSION_SECRET` containing the __secret__ used to generate the encrypted session cookie. __Without this, the function won't start.__

9) Click __Create__ to deploy the function.

After the deploy is finished, the following endpoints will be served (assuming you named your function "session" in step 1):

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

Please note that if you use custom field names, __you must use those modified names in the request body__ as well. All responses will also present the custom names.

Example for custom fields named `user` and `pass`:

<table>
<tr><th>Request Body</th><th>Response</th></tr>
<tr><td>

```javascript
// valid credentials
{
  "user": "MyUsername",
  "pass": "abc123"
}
```

</td><td>

```javascript
// statusCode: 201 Created
{
  "id": "12345",
  "user": "MyUsername"
}
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

To add more user fields to the output of a successful response, set `session.expose` with an array of field names. It defaults to the user `id` only.

Setting this option will overwrite the defaults. The example below will remove `id` from responses, keep `username`, and add `createdAt`:

```javascript
const api = new SessionsApi({
  session: {expose: ['username', 'createdAt']}
})
```

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

Settings can be set upon creating an instance. See defaults below.

```javascript
var api = new SessionsApi({

  // Session management options
  session: {

    // REQUIRED! if not present, function will intentionally crash
    secret: process.env['GFA_SESSION_SECRET'],

    // name of the session cookie
    name: 'userSession',

    // session expiration in ms
    duration: 24 * 60 * 60 * 1000,

    // session active duration in ms
    activeDuration: 1000 * 60 * 5,

    // array of user fields to expose in session object
    // id is already included
    expose: []

  },

  // Datastore "Kind" where user data is stored
  table: 'User',

  // Datastore namespace
  namespace: null,

  fields: {

    // name of the field that is used together with password during sign-in
    primary: 'username',

    // name of the field that stores the password
    password: 'password'

  },

  // array of headers that are sent in all responses
  // CORS and security headers should be included here, if your browser/client needs them
  headers: []

})
```

## Authorizing _other_ Google Functions

1) Request the `Session` object from this library in your other Google Functions (i.e., API endpoints that require session credentials) and create an instance with the same options defined in the `session` section of the main session function;

2) define environment variable `GFA_SESSION_SECRET` in your new function with the same value as the main session function;

3) call `authorize()` on the `session` instance to validate it:

```javascript
// Note the different class name and require path
const Session = require('@gfa/sessions-ds/session')

// Create and configure this object with the same options
//   as the "session" section of your /sessions function
const session = new Session({/*...*/})

// Entry Point
exports.handleRequest = function (req, res) {
  session.authorize(req, res, mainFunction)
}

function mainFunction (err, req, res, user) {
  if (err) {
    if (err.message === 'UNAUTHORIZED') {
      return res.status(401).end()
    }
    // handle other errors
    return res.status(500).end()
  }
  // rest of your code
  // `user` parameter contains exposed session data
}
```

## License

MIT
