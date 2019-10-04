import Provider from '../../core/SolidIdp'
import Router from 'koa-router'
import assert from 'assert'
import { DefaultConfigurationConfigs } from '../defaultConfiguration'

export default function resetPasswordHandler (oidc: Provider, config: DefaultConfigurationConfigs): Router {
  const router = new Router()
  const accountAdapter = new config.storage.accountAdapter()

  router.get(`/:uuid`, async (ctx, next) => {
    assert(ctx.params && ctx.params.uuid, 'A forgot password uuid must be provided. Use the link from your email.')
    assert(await accountAdapter.getForgotPassword(ctx.params.uuid), 'This reset password link is no longer valid.')
    return ctx.render('resetPassword', {
      pathPrefix: config.pathPrefix || '',
      forgotPasswordUUID: ctx.params.uuid,
      errorMessage: ''
    })
  })

  router.post('/:uuid', async (ctx, next) => {
    try {
      assert(ctx.params && ctx.params.uuid, 'A forgot password uuid must be provided. Use the link from your email.')
      assert(ctx.request.body && ctx.request.body.password, 'Password must be provided.')
      const forgotPasswordUUID = ctx.params.uuid
      const password = ctx.request.body.password
      const confirmPassword = ctx.request.body.confirmPassword
      assert(password, 'Password is required')
      assert(confirmPassword, 'Password confirmation is required')
      assert(password === confirmPassword, 'Passwords do not match')
      const username = await accountAdapter.getForgotPassword(forgotPasswordUUID)
      assert(username, 'This reset password link is no longer valid.')
      await accountAdapter.changePassword(username, password)
      await accountAdapter.deleteForgotPassword(forgotPasswordUUID)
      return ctx.render('message', {
        message: 'Password was successfully reset'
      })
    } catch (err) {
      return ctx.render('resetPassword', {
        pathPrefix: config.pathPrefix || '',
        forgotPasswordUUID: ctx.params.uuid,
        errorMessage: err.message
      })
    }
  })

  return router
}
