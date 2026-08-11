import request from '../utils/request'

export const fetchCurrentTheme = (mode = 'light') => request({ url: '/theme/current', method: 'get', params: { mode } })

export const fetchThemeList = () => request({ url: '/theme/list', method: 'get' })

export const createTheme = (data) => request({ url: '/theme', method: 'post', data })

export const updateTheme = (id, data) => request({ url: `/theme/${id}`, method: 'put', data })

export const deleteTheme = (id) => request({ url: `/theme/${id}`, method: 'delete' })

export const switchTheme = (data) => request({ url: '/theme/current', method: 'put', data })
