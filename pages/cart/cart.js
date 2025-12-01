// pages/cart/cart.js —— 极简“一份制”购物车
Page({
  data: {
    cartList: [],
    totalPrice: 0
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    this.setData({
      cartList: cart
    })
    this.calcTotalPrice()
  },

  // 直接移除整条菜品（不允许重复点）
  removeItem(e) {
    const index = e.currentTarget.dataset.index
    this.data.cartList.splice(index, 1)
    this.setData({
      cartList: this.data.cartList
    })
    this.calcTotalPrice()
    this.saveCartToStorage()
    wx.showToast({
      title: '已移除',
      icon: 'none'
    })
  },

  calcTotalPrice() {
    const total = this.data.cartList.reduce((sum, item) => sum + item.price, 0)
    this.setData({
      totalPrice: total.toFixed(2)
    })
  },

  saveCartToStorage() {
    wx.setStorageSync('cart', this.data.cartList)
    getApp().updateCartBadge?.()
  },

  // 下单逻辑保持不变（你已经修好的那版）
  async submitOrder() {
    if (this.data.cartList.length === 0) return wx.showToast({
      title: '购物车为空',
      icon: 'none'
    })

    wx.showLoading({
      title: '提交中...'
    })
    try {
      const orderId = Date.now()
      const items = this.data.cartList.map(item => ({
        order_id: orderId,
        dish_id: item.id,
        dish_name: item.name
      }))

      await this.request({
        url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_order_items',
        method: 'POST',
        data: items
      })

      wx.hideLoading()
      wx.showToast({
        title: '下单成功！',
        icon: 'success',
        duration: 2000
      })
      wx.removeStorageSync('cart')
      this.loadCart()
      setTimeout(() => wx.switchTab({
        url: '/pages/order-list/order-list'
      }), 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '下单失败',
        icon: 'error'
      })
    }
  },


  request(options) {
    return new Promise((resolve, reject) => {
        wx.request({
            ...options,
            header: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },


          // },
          success: res => res.statusCode < 400 ? resolve(res.data) : reject(res),
          fail: reject
        })
    })

}
})