// app.js - 更健壮的版本，直接替换使用
App({
  globalData: {},

  // 购物车 tab 索引（根据你的 app.json，购物车是第2个 tab -> index = 1）
  TAB_INDEX: 1,

  // 加入购物车（保持你的一份制逻辑）
  addToCart(dish) {
    try {
      let cart = wx.getStorageSync('cart') || []
      const exist = cart.find(item => item.id === dish.id)

      if (exist) {
        wx.showToast({ title: '已加入购物车', icon: 'none' })
        return
      }

      cart.push({
        id: dish.id,
        name: dish.name,
        image: dish.image || dish.img || '',
        price: dish.price || 0
      })

      wx.setStorageSync('cart', cart)
      wx.showToast({ title: '加入成功', icon: 'success' })

      // 统一更新 badge
      this.updateCartBadge()
    } catch (err) {
      console.warn('addToCart error', err)
    }
  },

  // 清空购物车（下单成功后统一调用）
  clearCart() {
    try {
      wx.removeStorageSync('cart')
    } catch (e) {
      console.warn('removeStorageSync failed', e)
    }
    // 更新全局并同步 badge
    this.updateCartBadge()
  },

  /**
   * 统一更新 tabBar 小红点 / 数字 badge（兼容多种微信版本）
   * - 读取 storage 'cart'
   * - 更新 this.globalData
   * - 当 count>0：优先 setTabBarBadge（数字），降级 showTabBarRedDot（小红点）
   * - 当 count==0：同时 removeTabBarBadge 与 hideTabBarRedDot（双保险）
   */
  updateCartBadge() {
    try {
      const cart = wx.getStorageSync('cart') || []
      const count = Array.isArray(cart) ? cart.length : 0

      // 更新全局缓存
      this.globalData = this.globalData || {}
      this.globalData.cart = cart
      this.globalData.cartCount = count

      if (count > 0) {
        // 尝试设置数字 badge
        try {
          wx.setTabBarBadge({ index: this.TAB_INDEX, text: String(count) })
        } catch (e) {
          // 如果数字 badge 不支持/失败，则显示红点
          try { wx.showTabBarRedDot({ index: this.TAB_INDEX }) } catch (err) {
            console.warn('showTabBarRedDot failed', err)
          }
        }
      } else {
        // count == 0：尽可能把所有可见的 badge/red-dot 都移除（双保险）
        try { wx.removeTabBarBadge({ index: this.TAB_INDEX }) } catch (e) {
          // ignore
        }
        try { wx.hideTabBarRedDot({ index: this.TAB_INDEX }) } catch (e) {
          // ignore
        }
      }

      // 通知页面刷新（如果页面实现了 updateCartCount）
      this.notifyPages()
    } catch (err) {
      console.warn('updateCartBadge error', err)
    }
  },

  // 通知所有页面进行本地更新（页面可实现 updateCartCount 方法）
  notifyPages() {
    try {
      const pages = getCurrentPages() || []
      pages.forEach(page => {
        // 优先调用页面自带的更新方法（如果有）
        if (page && typeof page.updateCartCount === 'function') {
          try { page.updateCartCount() } catch (e) { console.warn('page.updateCartCount fail', e) }
          return
        }

        // 否则直接 setData 常见字段，避免页面未实现方法导致不同步
        try {
          const updates = {}
          // 常见可能用于展示小红点或数量的字段名，按需扩展
          ['cartCount', 'cart_dot', 'cartDot', 'hasCartNotice', 'cart_badge'].forEach(k => updates[k] = 0)
          page.setData && page.setData(updates)
        } catch (e) {
          // ignore
        }
      })
    } catch (err) {
      console.warn('notifyPages error', err)
    }
  },

  onLaunch() {
    // 启动时同步一次（若 storage 中有残留）
    this.updateCartBadge()
  },

  onShow() {
    // 恢复时也同步一下（保证切后台再回来的场景正确）
    this.updateCartBadge()
  }
})
