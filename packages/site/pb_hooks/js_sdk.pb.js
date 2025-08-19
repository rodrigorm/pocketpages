routerAdd('GET', '/hello/{name}', async (e) => {
  const PocketBase = require('pocketbase/dist/pocketbase.cjs')
  const pb = new PocketBase('http://localhost:8090')

  pb.beforeSend = function (url, options) {
    dbg(`pb.beforeSend`, url, options)

    options.fetch = (url, config) => {
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
  ;(async () => {
    const methods = await pb().collection('users').listAuthMethods()
    dbg({ methods })

    let name = e.request.pathValue('name')

    return e.json(200, { message: 'Hello ' + name, methods })
  })()
})
