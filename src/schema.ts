import { makeExecutableSchema } from 'apollo-server'
import { DateTimeResolver } from 'graphql-scalars'
import { Context } from './context'
import * as fs from 'fs'
import * as _ from 'lodash'

const { PubSub } = require('apollo-server')
const { withFilter } = require('apollo-server')

const pubsub = new PubSub()

const typeDefs = fs.readFileSync('./graphql/schema.graphql', {
  encoding: 'utf-8',
})

const resolvers = {
  Query: {
    device(_parent, args: { hostname: string }, context: Context) {
      return context.prisma.device.findMany({
        where: { hostname: args.hostname || undefined },
      })
    },
    async datapoint(
      _parent,
      args: {
        filter?: DatapointsTimeRangeRequest
        orderBy?: OrderByUploadedAtInput
      },
      context: Context,
    ) {
      let datapoints = context.prisma.datapoint.findMany({
        where: {
          device: {
            hostname: args.filter?.hostname || undefined,
          },
          uploadedAt: {
            gt: args.filter?.start || undefined,
            lt: args.filter?.end || new Date(),
          },
        },
        orderBy: args?.orderBy,
      })

      return datapoints.then((a) => {
        // a = a.slice(-120, -100)
        a = _.groupBy(
          a,
          (datapoint) =>
            Math.floor(
              datapoint.uploadedAt.getDay() / (7 / (args.filter?.day || 7)),
            ) +
            ',' +
            Math.floor(
              datapoint.uploadedAt.getHours() /
                (24 / (args.filter?.hour || 24)),
            ) +
            ',' +
            Math.floor(
              datapoint.uploadedAt.getMinutes() /
                (60 / (args.filter?.minute || 60)),
            ) +
            ',' +
            Math.floor(
              datapoint.uploadedAt.getSeconds() /
                (60 / (args.filter?.second || 60)),
            ),
        )
        a = _.chain(a)
          .mapValues((value) => {
            // mean of datapoints that are in same timeframe
            let ret = value[0]
            let keys = Object.keys(ret).filter(
              (key) => typeof ret[key] === 'number' && key != 'id',
            )
            for (let key of keys) {
              ret[key] = _.meanBy(value, key)
            }
            //ret.uploadedAt = Math.floor(_.chain(value).mapValues(val => val.uploadedAt.getTime()).values().mean().value())
            return ret
          })
          .values()
          .value()

        return a
      })
    },
  },
  Mutation: {
    addDevice: (
      _parent,
      args: { hostname: string; name: string },
      context: Context,
    ) => {
      return context.prisma.device.create({
        data: {
          hostname: args.hostname,
          name: args.name,
        },
      })
    },
    addDatapoint: async (
      _parent,
      args: { data: Measurement },
      context: Context,
    ) => {
      return context.prisma.datapoint
        .create({
          data: {
            uploadedAt: args.data.uploadedAt || undefined,
            device: {
              connect: {
                hostname: args.data.hostname,
              },
            },
            humidity: args.data.humidity,
            light: args.data.light,
            temperature: args.data.temperature,
          },
        })
        .then((datapoint) => {
          pubsub.publish('DATAPOINT_CREATED', { datapoint: datapoint })
          return { recordID: datapoint.id, record: datapoint }
        })
    },
  },
  Subscription: {
    datapoint: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['DATAPOINT_CREATED']),
        (payload, variables) => {
          return (
            !variables.hostname ||
            payload.datapoint.deviceHostname === variables.hostname
          )
        },
      ),
    },
  },
  DateTime: DateTimeResolver,
  Datapoint: {
    device: (parent, _args, context: Context) => {
      return context.prisma.datapoint
        .findUnique({
          where: { id: parent?.id },
        })
        .device()
    },
    uploadDay: (parent, _args, context: Context) => {
      return context.prisma.datapoint
        .findUnique({
          where: { id: parent?.id },
        })
        .then((datapoint) => datapoint?.uploadedAt.getDay())
    },
    uploadHour: (parent, _args, context: Context) => {
      return context.prisma.datapoint
        .findUnique({
          where: { id: parent?.id },
        })
        .then((datapoint) => datapoint?.uploadedAt.getHours())
    },
    uploadMinute: (parent, _args, context: Context) => {
      return context.prisma.datapoint
        .findUnique({
          where: { id: parent?.id },
        })
        .then((datapoint) => datapoint?.uploadedAt.getMinutes())
    },
    uploadSecond: (parent, _args, context: Context) => {
      return context.prisma.datapoint
        .findUnique({
          where: { id: parent?.id },
        })
        .then((datapoint) => datapoint?.uploadedAt.getSeconds())
    },
  },
  Device: {
    data: (parent, _args, context: Context) => {
      return context.prisma.device
        .findUnique({
          where: { id: parent?.id },
        })
        .data()
    },
  },
}

enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

interface OrderByUploadedAtInput {
  uploadedAt: SortOrder
}

interface Measurement {
  humidity: number
  light: number
  temperature: number
  uploadedAt: Date
  hostname: string
}

interface DatapointsTimeRangeRequest {
  start: Date
  end: Date
  hostname: string
  day: number
  hour: number
  minute: number
  second: number
}

interface Device {
  id: number
  hostname: String
  name: String
  data: [Datapoint]
}

interface Datapoint {
  id: number
  createdAt: Date
  uploadedAt: Date
  device: Device
  humidity: number
  light: number
  temperature: number
  uploadHour: number
}

interface CreatedDatapointPayload {
  recordID: number
  record: Datapoint
}

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
})
