function parsePostManJson (json){
    let mocks = json.item.map(getMockObject).map((item, index) => {
        item.id = `POSTMAN_${index}_${json.info._postman_id}`
        item.groupId = json.info._postman_id
        return item
    })
    return {
        ...getMata(json),
        mocks: mocks 
    }
}

const getMata = (json) => ({
    version: "2.0.0",
    groups: [
        {
            id: json.info._postman_id,
            name: json.info.name,
            active: true
        }
    ]
})

const getMockObject = (item) => ({
    active: true,
    method: item.request.method,
    url: addQueryParams(item.request.url.raw, item.request.query),
    headers: getHeaders(item.request.header),
    params: (item.request.body && JSON.stringify(item.request.body)) || '',
    response: {
      status: item.response.length > 0 ? item.response[0].code : 200,
      delay: 0,
      headers: item.response.length > 0 ? getHeaders(item.response[0].header): {},
      body: item.response.length > 0 ? item.response[0].body : ''
    },
    name: item.name,
    origin: "POSTMAN"
})

const getHeaders = (headers) => {
    let obj = {}
    headers.forEach((header) => {
        obj[header.key] = header.value
    })
    return obj
}

const addQueryParams = (rawUrl, queries) => {
    if (queries){
        queries.forEach((query) => {
            let sign = rawUrl.includes('?') ? '&' : '?'
            rawUrl += `${sign}${query.key}=${query.value}`
        })
    }
    return rawUrl
}

export default parsePostManJson
