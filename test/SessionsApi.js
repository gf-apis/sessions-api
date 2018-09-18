'use strict'

const chai = require('chai')
const expect = chai.expect

const SessionsApi = require('../')
const {emulator, setApp} = require('@gfa/core/test/support/emulator')

describe('SessionsApi', function () {
  let app = new SessionsApi({
    session: {secret: 'test', expose: ['id', 'username']}
  })
  let password = '123987'
  let agent // for cookie support
  let user

  before(function (done) {
    setApp(app)
    agent = chai.request.agent(emulator)
    app.password.generate(null, null, password, (err, _req, _res, hash) => {
      if (err) return done(err)
      app.database.insert(null, null, 'User', {username: 'abc', password: hash}, (err, _req, _res, id) => {
        user = {id}
        done(err)
      })
    })
  })

  after(function (done) {
    agent.app.close()
    app.database.delete(null, null, 'User', user.id, done)
  })

  describe('POST', function () {
    context('with correct username/password', function () {
      let response

      before(function () {
        let data = {username: 'abc', password: password}
        return agent.post('/').send(data).then(res => {
          response = res
        })
      })

      after(function () {
        return agent.delete('/') // sign out
      })

      it('returns 201', function () {
        expect(response).to.have.status(201)
      })

      it('responds with data', function () {
        expect(response.body).to.exist()
        expect(response.body.id).to.exist()
        expect(response.body.username).to.equal('abc')
        expect(response.body.password).to.not.exist()
      })

      it('responds with cookie', function () {
        expect(response).to.have.cookie('userSession')
      })
    })

    context('with incorrect username', function () {
      it('fails with status 401', function () {
        let data = {username: 'abcdef', password: password}
        return agent.post('/').send(data).catch(response => {
          expect(response).to.have.status(401)
          expect(response).to.not.have.cookie('userSession')
        })
      })
    })

    context('with incorrect password', function () {
      it('fails with status 401', function () {
        let data = {username: 'abc', password: '456'}
        return agent.post('/').send(data).catch(response => {
          expect(response).to.have.status(401)
          expect(response).to.not.have.cookie('userSession')
        })
      })
    })

    context('with blank username', function () {
      it('fails with status 400', function () {
        let data = {password}
        return agent.post('/').send(data).catch(response => {
          expect(response).to.have.status(400)
          expect(response).to.not.have.cookie('userSession')
        })
      })
    })

    context('with blank password', function () {
      it('fails with status 400', function () {
        let data = {ussername: 'abc'}
        return agent.post('/').send(data).catch(response => {
          expect(response).to.have.status(400)
          expect(response).to.not.have.cookie('userSession')
        })
      })
    })
  })

  describe('GET', function () {
    context('with credentials', function () {
      let response

      before(function () {
        let data = {username: 'abc', password: password}
        return agent.post('/').send(data).then(_ => {
          return agent.get('/').then(res => {
            response = res
          })
        })
      })

      after(function () {
        return agent.delete('/') // sign out
      })

      it('returns session data in response body', function () {
        expect(response).to.have.status(200)
        expect(response.body).to.exist()
        expect(response.body.id).to.exist()
        expect(response.body.username).to.equal('abc')
        expect(response.body.password).to.not.exist()
      })
    })

    context('without credentials', function () {
      it('fails with status 401', function () {
        return agent.get('/').catch(response => {
          expect(response).to.have.status(401)
          expect(response.body).to.be.empty()
        })
      })
    })
  })

  describe('DELETE', function () {
    context('with credentials', function () {
      let response

      before(function () {
        let data = {username: 'abc', password: password}
        return agent.post('/').send(data).then(_ => {
          return agent.delete('/').then(res => {
            response = res
          })
        })
      })

      it('returns empty body and status 204', function () {
        expect(response).to.have.status(204)
        expect(response.body).to.be.empty()
      })

      it('removes session cookie', function () {
        return agent.get('/').catch(response => {
          expect(response).to.have.status(401)
        })
      })
    })

    context('without credentials', function () {
      it('fails with status 401', function () {
        return agent.delete('/').catch(response => {
          expect(response).to.have.status(401)
          expect(response.body).to.be.empty()
        })
      })
    })
  })
})
