import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { hashSync, compareSync } from 'bcrypt-edge'

interface Env {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hackerel!')
})

app.post('/datasets', async (c) => {
  const { id, token } = await c.req.json()

  const dataset = await c.env.DB.prepare(`select * from datasets where id = ?`).bind(id).first()

  if (dataset) {
    return c.text(`${id} is already`)
  }

  const hashedToken = hashSync(token, 10);

  await c.env.DB.prepare('insert into datasets(id, token) values (?, ?)').bind(id, hashedToken).run()

  return c.text('ok')
})

app.get('/datasets/:dataset_id/metrics', async (c) => {
  const { dataset_id } = c.req.param()

  const { results } = await c.env.DB.prepare('select * from metrics where dataset_id = ?').bind(dataset_id).all()

  return c.json(results)
})

app.use(
  '/datasets/:dataset_id/metrics',
  bearerAuth({
    verifyToken: async (token, c) => {
      const { dataset_id } = c.req.param()

      const dataset = await c.env.DB.prepare('select * from datasets where id = ?').bind(dataset_id).first()

      return dataset && compareSync(token, dataset?.token)
    }
  })
)

app.post('/datasets/:dataset_id/metrics', async (c) => {
    const { dataset_id } = c.req.param()
    const { quantity } = await c.req.json()

    await c.env.DB.prepare('insert into metrics(dataset_id, quantity) values (?, ?)').bind(dataset_id, quantity).run()

    return c.text('ok')
  }
)

export default app
