import PocketBase from 'pocketbase/dist/pocketbase.cjs'
import type {
  PagesRequest,
  PluginFactory,
  PluginOptionsBase,
} from 'pocketpages'

export type JSSdkPluginOptions = PluginOptionsBase & {
  host: string
}

export type PocketBaseClientOptions = {
  auth?: core.Record
  host: string
  request?: PagesRequest
}

const jsSdkPluginFactory: PluginFactory<JSSdkPluginOptions> = (
  config,
  extra
) => {
  const { globalApi } = config
  const { dbg } = globalApi

  const newClient = (host: string, auth?: core.Record, authToken?: string) => {
    const pb = new PocketBase(host)
    if (auth) {
      dbg(`auth`, typeof auth, auth)
      const token = authToken ?? auth.newAuthToken()
      pb.authStore.save(token, JSON.parse(JSON.stringify(auth)))
      dbg(
        `created new PocketBase client for ${host} with saved auth: ${auth.id} ${token}`
      )
    } else {
      dbg(`created new PocketBase client for ${host}`)
    }

    dbg(`Preparing new PocketBase client`)

    pb.beforeSend = function (url, options) {
      dbg(`pb.beforeSend`, url, options)

      options.fetch = async (url, config) => {
        dbg(`pb.fetch`, url, config)

        const args = {
          url: url.toString(),
          method: options.method,
          headers: options.headers,
          body: options.body,
        }
        const response = $http.send(args)

        let headers = new Headers()

        for (const [key, value] of Object.entries(response.headers)) {
          if (typeof value === 'string') {
            headers.append(key, value)
          } else {
            for (const v of value) {
              headers.append(key, v)
            }
          }
        }

        return new Response(response.raw, {
          status: response.statusCode,
          headers,
        })
      }

      return { url, options }
    }

    return pb
  }

  const pbCache = new Map<string, PocketBase>()

  globalApi.pb = (options?: Partial<PocketBaseClientOptions>) => {
    console.log('###### pb ######')
    const host = options?.host ?? extra?.host ?? `http://localhost:8090`
    const auth = options?.auth ?? options?.request?.auth
    const authToken = options?.request?.authToken
    const key = `${host}-${auth?.id}`
    if (pbCache.has(key)) {
      return pbCache.get(key)
    }
    dbg(`creating new pb client for ${key}`)
    const pb = newClient(host, auth, authToken)
    pbCache.set(key, pb)
    return pb
  }

  return {
    name: 'js-sdk',
  }
}

export default jsSdkPluginFactory
