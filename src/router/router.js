const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/park.vue'),
    meta: {
      title: '园区',
      activePath: '/example/park'
    }
  }
]

export default routes
