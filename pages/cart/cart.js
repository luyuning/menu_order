// pages/cart/cart.js  ← 2025年最新生产就绪版，直接覆盖原文件即可！
Page({
  data: {
    cartList: [],
    totalPrice: 0
  },

  onShow() {
    this.loadCart()
  },

  // 读取购物车
  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    this.setData({
      cartList: cart
    })
    this.calcTotalPrice()
  },

  // ==================== 加减删除核心方法 ====================
  inc(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      [`cartList[${index}].count`]: this.data.cartList[index].count + 1
    })
    this.calcTotalPrice()
    this.saveCartToStorage()
  },

  dec(e) {
    const index = e.currentTarget.dataset.index
    if (this.data.cartList[index].count <= 1) {
      this.removeItem(index)
      return
    }
    this.setData({
      [`cartList[${index}].count`]: this.data.cartList[index].count - 1
    })
    this.calcTotalPrice()
    this.saveCartToStorage()
  },

  removeItem(index) {
    this.data.cartList.splice(index, 1)
    this.setData({ cartList: this.data.cartList })
    this.calcTotalPrice()
    this.saveCartToStorage()
    wx.showToast({ title: '已移除', icon: 'none' })
  },

  // 实时计算总价
  calcTotalPrice() {
    const total = this.data.cartList.reduce((sum, item) => sum + item.price * item.count, 0)
    this.setData({
      totalPrice: total.toFixed(2)
    })
  },

  // 实时保存到本地
  saveCartToStorage() {
    wx.setStorageSync('cart', this.data.cartList)
    getApp().updateCartBadge?.()
  },

  // ==================== 提交订单（生产级防漏单） ====================
  async submitOrder() {
    const cartList = this.data.cartList
    if (cartList.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      // 1. 创建主订单
      const orderRes = await this.request({
        url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_orders',
        method: 'POST',
        data: {
          order_no: 'HD' + Date.now(),
          user_id: null,
          table_no: "微信自助",
          total_amount: this.data.totalPrice,
          dish_count: cartList.reduce((s, i) => s + i.count, 0),
          status: "pending",
          remark: "",
          create_time: new Date().toISOString()
        }
      })

      const orderId = orderRes[0].id

      // 2. 准备明细
      const items = cartList.map(item => ({
        order_id: orderId,
        dish_id: item.id,
        dish_name: item.name,
        dish_price: item.price,
        quantity: item.count,
        create_time: new Date().toISOString()
      }))

      // 3. 分批插入明细（每批最多40条，超级稳）
      const batchSize = 40
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        await this.request({
          url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_order_items',
          method: 'POST',
          data: batch
        })
      }

      wx.hideLoading()
      wx.showToast({ title: '下单成功！厨房已收到', icon: 'success', duration: 3000 })
      wx.removeStorageSync('cart')
      this.loadCart()
      getApp().updateCartBadge?.()
      setTimeout(() => {
        wx.switchTab({ url: '/pages/order-list/order-list' })
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '下单失败',
        content: '网络不稳定，请重试',
        showCancel: false
      })
      console.error('提交订单失败', err)
    }
  },

  // 封装 Promise 版 request（必须的！）
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        header: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...options.header
        },
        success: res => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            reject(res)
          }
        },
        fail: reject
      })
    })
  },
  goOrderList() {
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  }
})