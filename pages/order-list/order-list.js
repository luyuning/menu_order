// pages/order-list/order-list.js  ← 绝对能跑版，直接覆盖
Page({
  data: {
    orderList: [],
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, orderList: [], hasMore: true })
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 })
      this.loadOrders()
    }
  },

  loadOrders() {
    wx.showLoading({ title: '加载中...' })

    // 改用最稳定、最通用的查询方式
    const offset = (this.data.page - 1) * 15
    const url = `https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_orders?select=*,lyn_order_items(*)&order=create_time.desc&limit=15&offset=${offset}`

    wx.request({
      url: url,
      header: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        'Prefer': 'count=exact'
      },
      success: (res) => {
        wx.hideLoading()
        // 防御性编程：加个判断
        if (!res.data || !Array.isArray(res.data)) {
          console.error('订单数据异常', res)
          wx.showToast({ title: '数据异常', icon: 'error' })
          this.setData({ hasMore: false })
          return
        }

        const newList = res.data.map(order => {
          // 安全取明细
          order.lyn_order_items = order.lyn_order_items || []
          order.create_time = this.formatTime(order.create_time)
          return order
        })

        this.setData({
          orderList: this.data.page === 1 ? newList : this.data.orderList.concat(newList),
          hasMore: res.data.length === 15
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('请求订单失败', err)
        wx.showToast({ title: '网络错误', icon: 'error' })
      }
    })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    })
  },

  formatTime(isoString) {
    if (!isoString) return '未知时间'
    const date = new Date(isoString)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'

    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('/', '月').replace(' ', '日 ')
  }
})