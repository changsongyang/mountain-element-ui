import router from './router'
import { menuTreeToPageMenu } from '@/router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
import { getToken, getLocalStorage } from '@/utils/auth' // get token from cookie
import getPageTitle from '@/utils/get-page-title'

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = ['/login'] // no redirect whitelist

router.beforeEach(async(to, from, next) => {
  console.log('beforeEach....')

  const initRouterList = getLocalStorage('initRouter')

  if (router.options.routes.length <= initRouterList.length) {
    const list = getLocalStorage('router')
    const remoteRouter = menuTreeToPageMenu(list)
    // 动态添加路由
    if (remoteRouter !== null && remoteRouter !== undefined) {
      for (let i = 0; i < remoteRouter.length; i++) {
        var isFlag = router.options.routes.some(function(obj) {
          if (obj.path === remoteRouter[i].path) {
            return true
          }
        })
        if (!isFlag) {
          router.options.routes.push(remoteRouter[i])
        }
      }
      router.addRoutes(router.options.routes)
      next({ ...to, replace: true })
    }
  }

  // start progress bar
  NProgress.start()

  // set page title
  document.title = getPageTitle(to.meta.title)

  // determine whether the user has logged in
  const hasToken = getToken()

  if (hasToken) {
    if (to.path === '/login') {
      // if is logged in, redirect to the home page
      next({ path: '/' })
      NProgress.done()
    } else {
      const hasGetUserInfo = store.getters.name
      if (hasGetUserInfo) {
        next()
      } else {
        try {
          // get user info
          await store.dispatch('user/getInfo')

          next()
        } catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch('user/resetToken')
          Message.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    }
  } else {
    /* has no token*/

    if (whiteList.indexOf(to.path) !== -1) {
      // in the free login whitelist, go directly
      next()
    } else {
      // other pages that do not have permission to access are redirected to the login page.
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  // finish progress bar
  NProgress.done()
})

