import Ajv from 'ajv'

export default function validateSchema(schema: { title?: string, [key: string]: any }, item: any): boolean {
  const ajv = new Ajv()
  if (!ajv.validate(schema, item)) {
    let message = `${schema.title ? schema.title : 'schema'} is invalid`
    if (ajv.errors) {
      message += ':'
      message += ajv.errors.map(err => `\n${err.dataPath} ${err.message}`)
    }
    throw new Error(message)
  }
  return true
}