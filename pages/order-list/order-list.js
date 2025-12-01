// pages/order-list/order-list.js —— 终极核弹版（这次绝对成功）
Page({
  data: {
    orders: [],
    page: 1,
    hasMore: true,
    isLoading: false
  },

  onLoad() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, orders: [], hasMore: true })
    this.loadOrders(true).finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) this.loadOrders()
  },

  loadOrders(isRefresh = false) {
    if (this.data.isLoading) return
    this.setData({ isLoading: true })
    !isRefresh && wx.showLoading({ title: '加载中...' })

    const offset = isRefresh ? 0 : (this.data.page - 1) * 20

    wx.request({
      url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_order_items',
      data: {
        select: 'order_id,create_time,dish_name',
        order: 'create_time.desc',
        limit: 20,
        offset: offset
      },
      header: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4'
      },
      success: (res) => {
        if (res.statusCode !== 200 || !res.data) {
          wx.showToast({ title: '加载失败', icon: 'error' })
          return
        }

        const items = res.data
        if (items.length === 0) {
          this.setData({ hasMore: false })
          return
        }

        // 关键分组逻辑
        const map = {}
        items.forEach(item => {
          const id = item.order_id
          if (!map[id]) {
            map[id] = {
              order_id: id,
              create_time: item.create_time,
              dish_names: [],
              expanded: false  // 必须加这一行！
            }
          }
          if (item.dish_name) {
            map[id].dish_names.push(item.dish_name)
          }
        })

        const newOrders = Object.values(map)

        this.setData({
          orders: isRefresh ? newOrders : this.data.orders.concat(newOrders),
          page: isRefresh ? 2 : this.data.page + 1,
          hasMore: items.length === 20
        })
      },
      fail: () => wx.showToast({ title: '网络错误', icon: 'error' }),
      complete: () => {
        this.setData({ isLoading: false })
        wx.hideLoading()
      }
    })
  },

  toggleExpand(e) {
    const index = e.currentTarget.dataset.index
    const key = `orders[${index}].expanded`
    const current = this.data.orders[index].expanded
    this.setData({ [key]: !current })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?order_id=${id}` })
  },

  formatTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
})