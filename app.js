// app.js   ← 完整正确版，直接全选替换！
App({
  globalData: {
    // 可以留着备用，后面购物车页面会用
  },

  // ================== 加入购物车核心方法 ==================
  addToCart(dish) {
    let cart = wx.getStorageSync('cart') || []
    const exist = cart.find(item => item.id === dish.id)
    
    if (exist) {
      exist.count += 1
    } else {
      cart.push({
        id: dish.id,
        name: dish.name,
        img: dish.img || '',
        price: dish.price || 0,
        count: 1
      })
    }
    
    wx.setStorageSync('cart', cart)
    wx.showToast({ title: '加入成功', icon: 'success' })
    this.updateCartBadge()
  },

  // 更新 tabBar 小红点（菜单页是第 1 个 tab，从 0 数是 index: 1）
  updateCartBadge() {
    let cart = wx.getStorageSync('cart') || []
    let total = cart.reduce((sum, item) => sum + item.count, 0)
    if (total > 0) {
      wx.setTabBarBadge({
        index: 1,                 // 改成你菜单页在 tabBar 里的位置（从0数第2个就是1）
        text: total + ''
      })
    } else {
      wx.removeTabBarBadge({ index: 1 })
    }
  },

  // ================== 生命周期 ==================
  onLaunch() {
    // 小程序启动时就更新一次小红点
    this.updateCartBadge()
  },

  onShow() {
    // 每次回到小程序也刷新一下（防止从别的页面回来看不到最新数量）
    this.updateCartBadge()
  }
})