const mapping = store => {
    store.subscribe((mutation, state) => {
        if (mutation.type !== 'save') {
            store.dispatch('__save', mutation.payload)
        }
    })
    store.subscribeAction((mutation, state) => {
        if (mutation.type !== '__save') {
            mutation.payload = store.dispatch('__save', mutation.payload)
        }
    })
    store.registerModule('__mapping', {
        mutations: {
            save(state, payload) {
                let type = payload.__typename

                if (!state[type]) {
                    state[type] = {}
                }

                state[type] = {
                    ...state[type],
                    [payload.id]: {
                        ...state[type][payload.id],
                        ...payload
                    }
                }
            }
        },
        actions: {
            __save({commit, state}, payload) {
                const isEntity = (entity) => {
                    if (typeof entity !== 'object' || entity === null) {
                        return false
                    }
                    return (entity.hasOwnProperty('__typename') && entity.hasOwnProperty('id'))
                }

                const mapping = (entity) => {
                    for (let property in entity) {
                        if (!isEntity(entity[property])) {
                            continue
                        }
                        let relation = entity[property]

                        if (state[relation.__typename] && state[relation.__typename][relation.id]) {
                            if (relation !== state[relation.__typename][relation.id])
                                commit('save', Object.assign(state[relation.__typename][relation.id], mapping(relation)))
                        } else {
                            commit('save', mapping(relation))
                        }
                    }
                    return entity
                }

                let proxy = {
                    get(target, name) {
                        let entity = target[name]

                        if (!isEntity(entity)) {
                            return Reflect.get(...arguments)
                        }

                        /* Load more from API
                                       * if (!state[entity.__typename].collection[entity.id].__init) {
                                       *
                                       * state[entity.__typename].collection[entity.id].__init = true
                                       * dispatch('get', entity, {root: true})
                                       * }
                                       */

                        return state[entity.__typename][entity.id]
                    },
                    set(target, name, val) {
                        return Reflect.set(...arguments)
                    }
                }

                if (!isEntity(payload) && !Array.isArray(payload)) {
                    return payload
                }

                let _payload = payload

                if (!Array.isArray(payload)) {
                    _payload = [payload]
                }

                for (let i in _payload) {
                    let item = _payload[i]

                    if (!isEntity(item)) {
                        continue
                    }
                    item = new Proxy(mapping(item), proxy)
                    commit('save', item)

                    _payload[i] = item
                }

                return (Array.isArray(payload)) ? _payload : _payload[0]
            }
        }
    })
}

export default mapping
