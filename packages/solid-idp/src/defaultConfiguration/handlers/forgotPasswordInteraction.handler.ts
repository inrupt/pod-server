import Provider from '../../core/SolidIdp'
import Router from 'koa-router'
import nodemailer from 'nodemailer'
import assert from 'assert'
import { InternalConfigs } from '../defaultConfiguration'
import Debug from 'debug'

const debug = Debug('forgotPassword')

const dummyMailer = {
  sendMail (config: any) {
    debug(`Sending Mail:\nTo: ${config.to}\nFrom: ${config.from}\nSubject: ${config.subject}\n${config.html}`)
  }
}

export default function forgotPasswordInteractionHandler (oidc: Provider, config: InternalConfigs): Router {
  const accountAdapter = new config.storage.accountAdapter()
  const mailFrom = config.mailConfiguration && config.mailConfiguration.auth ? config.mailConfiguration.auth.user : 'Solid'
  const mailTransporter = (config.mailConfiguration) ? nodemailer.createTransport(config.mailConfiguration) : dummyMailer

  const router = new Router()

  router.get(`/forgotpassword`, async (ctx, next) => {
    return ctx.render('forgotPassword', { errorMessage: '' })
  })

  router.post(`/forgotpassword`, async (ctx, next) => {
    try {
      const username = ctx.request.body.username
      assert(username, 'Username required')
      const { email, uuid } = await accountAdapter.generateForgotPassword(ctx.request.body.username)
      const passwordResetLink = `${config.issuer}/${config.pathPrefix ? `${config.pathPrefix}/` : ''}resetpassword/${uuid}`
      const mailInfo = mailTransporter.sendMail({
        from: `"Solid" <${mailFrom}>`,
        to: email,
        subject: 'Reset your password',
        text: `Reset your password at ${passwordResetLink}`,
        html: `
          <h1>Reset your password</h1>
          <p>Click <a href="${passwordResetLink}">here</a> to reset your password.</p>
        `
      })
      return ctx.render('emailSent', {
        username
      })
    } catch (err) {
      return ctx.render('forgotPassword', {
        errorMessage: err.message
      })
    }
  })

  return router
}
