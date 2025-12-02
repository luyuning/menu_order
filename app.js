// app.js —— 终极一份制专用版（已适配你当前真实逻辑）
App({
  globalData: {},

  // 加入购物车（一份制：同菜不会重复，只会提示已加入）
  addToCart(dish) {
    let cart = wx.getStorageSync('cart') || []
    const exist = cart.find(item => item.id === dish.id)
    
    if (exist) {
      wx.showToast({
        title: '已加入购物车',
        icon: 'none'
      })
      return
    }

    cart.push({
      id: dish.id,
      name: dish.name,
      image: dish.image || dish.img || '',
      price: dish.price || 0
      // 一份制不需要 count 字段！
    })
    
    wx.setStorageSync('cart', cart)
    wx.showToast({ title: '加入成功', icon: 'success' })
    this.updateCartBadge()
  },

  // 更新购物车角标 —— 一份制专用：直接显示菜品数量（长度）
  updateCartBadge() {
    const cart = wx.getStorageSync('cart') || []
    const total = cart.length   // 一份制就用 length！

    if (total > 0) {
      wx.setTabBarBadge({
        index: 1,               // 改成 1！！！购物车是第 2 个 tab（从 0 开始数）
        text: total + ''
      })
    } else {
      wx.removeTabBarBadge({
        index: 1                  // 也必须是 1！统一！
      })
    }
  },

  onLaunch() {
    this.updateCartBadge()
  },

  onShow() {
    this.updateCartBadge()
  }

})