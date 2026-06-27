import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/sorting/:type',
      name: 'sorting',
      component: () => import('../views/SortingView.vue')
    },
    {
      path: '/dijkstra',
      name: 'dijkstra',
      component: () => import('../views/DijkstraView.vue')
    },
    {
      path: '/huffman',
      name: 'huffman',
      component: () => import('../views/HuffmanView.vue')
    },
    {
      path: '/maze',
      name: 'maze',
      component: () => import('../views/MazeView.vue')
    },
    {
      path: '/compare',
      name: 'compare',
      component: () => import('../views/CompareView.vue')
    }
  ]
})

export default router
