import Provider from '../../core/SolidIdp'
import Router from 'koa-router'
import assert from 'assert'
import { login } from './loginInteraction.handler'
import { DefaultConfigurationConfigs } from '../defaultConfiguration'
import { Context } from 'koa'

export default function registerInteractionHandler (oidc: Provider, config: DefaultConfigurationConfigs): Router {
  const router = new Router<any, Context>()
  const accountAdapter = new config.storage.accountAdapter()

  router.get(`/register`, async (ctx, next) => {
    return ctx.render('register', {
      errorMessage: '',
      prefilled: {}
    })
  })

  router.post(`/register`, async (ctx, next) => {
    let email
    let username
    let password
    let confirmPassword
    try {
      email = String(ctx.request.body.email).toLowerCase()
      username = String(ctx.request.body.webId).toLowerCase()
      const webId = await config.webIdFromUsername(username)
      password = String(ctx.request.body.password)
      confirmPassword = String(ctx.request.body.confirmPassword)
      assert(password, 'Password required')
      assert(confirmPassword, 'Password confirmation required')
      assert(username, 'Username required')
      assert(/^[a-zA-Z0-9_-]*$/.test(username), `Usernames must only have letters, numbers, "_" or "-"`)
      assert(password === confirmPassword, 'Passwords do not match')
      assert(email, 'Email required')
      assert(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(email), 'Invalid email')
      await accountAdapter.create(email, password, username, webId)
      await config.onNewUser(username)
      return await login(username, password, ctx, oidc, accountAdapter)
    } catch (err) {
      return ctx.render('register', {
        errorMessage: err.message,
        prefilled: {
          email,
          username
        }
      })
    }
  })

  return router
}
