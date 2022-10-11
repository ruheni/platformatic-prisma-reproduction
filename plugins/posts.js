const fp = require("fastify-plugin")
const { PrismaClient } = require("@prisma/client")


module.exports = async (app, opts) => {
  const prismaPlugin = fp(async (app, options) => {
    if (!app.hasDecorator('prisma')) {
      const prisma = new PrismaClient(options)
      await prisma.$connect()
      app
        .decorate('prisma', new PrismaClient(options))
        .addHook('onClose', async (server) => {
          await server.prisma.$disconnect()
        })
    } else {
      throw new Error('The `prisma` decorator has already been registered')
    }
  })
  app.register(prismaPlugin)

  app.graphql.extendSchema(`
    extend type Mutation {
      incrementPostViewCount(id: ID): Post
    }
  `)

  app.graphql.defineResolvers({
    Mutation: {
      incrementPostViewCount: async (_, { id }) => {
        const post = await app.prisma.post.update({
          where: {
            id: Number(id)
          },
          data: {
            viewCount: {
              increment: 1
            }
          },
          include: {
            author: true,
          }
        })

        if (!post) return {} /**or null */
        return post
      }
    }
  })
}
